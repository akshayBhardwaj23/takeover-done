import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';
import DOMPurify from 'isomorphic-dompurify';

// Simple shared-secret verification for MVP. In production, verify provider signature (Mailgun/Postmark)
function verifySecret(req: NextRequest, secret: string | null) {
  const hdr = req.headers.get('x-email-webhook-secret');
  return secret && hdr && secret === hdr;
}

// Optional Mailgun-style signature verification
function verifyMailgunSignature(raw: any): boolean {
  const apiKey = process.env.MAILGUN_SIGNING_KEY;
  if (!apiKey) return true; // skip if not configured
  // Support both webhook JSON ({ signature: { timestamp, token, signature }})
  // and Routes form fields (timestamp, token, signature)
  const sig = raw?.signature;
  const token =
    (sig?.token as string | undefined) ?? (raw?.token as string | undefined);
  const timestamp =
    (sig?.timestamp as string | undefined) ??
    (raw?.timestamp as string | undefined);
  const signature =
    (sig?.signature as string | undefined) ??
    (raw?.signature as string | undefined);
  if (!token || !timestamp || !signature) return false;
  const data = timestamp + token;
  const digest = crypto.createHmac('sha256', apiKey).update(data).digest('hex');
  return digest === signature;
}

function extractOrderCandidate(text: string): string | null {
  const patterns = [/#\s?(\d{3,8})/i, /order\s?(\d{3,8})/i];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Idempotency: prefer Message-ID header; fallback to HMAC of body
    const redis =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
          })
        : null;
    // Basic guardrails
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }

    // Accept JSON and Mailgun Routes form payloads
    const contentType = req.headers.get('content-type') || '';
    let raw: any = null;
    if (contentType.includes('application/json')) {
      raw = await req.json().catch(() => null);
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      const fd = await req.formData();
      raw = Object.fromEntries(
        Array.from(fd.entries()).map(([k, v]) => [
          k,
          typeof v === 'string' ? v : ((v as any).name ?? ''),
        ]),
      ) as any;
    }
    if (!raw)
      return NextResponse.json({ error: 'invalid body' }, { status: 400 });

    // Normalize common fields across JSON and Mailgun Routes
    const to: string | undefined =
      (raw.to as string) || (raw.recipient as string);
    const from: string | undefined =
      (raw.from as string) || (raw.sender as string);
    const subject: string | undefined = raw.subject as string | undefined;
    const text: string | undefined =
      (raw.text as string) ||
      (raw['body-plain'] as string) ||
      (raw['stripped-text'] as string);
    const html: string | undefined =
      (raw.html as string) || (raw['stripped-html'] as string);

    if (!to || !from)
      return NextResponse.json({ error: 'missing to/from' }, { status: 400 });

    // Identify tenant by alias match in Connection.metadata.alias
    const all = await prisma.connection.findMany({
      where: { type: 'CUSTOM_EMAIL' as any },
      select: { id: true, accessToken: true, metadata: true },
    });
    const target = all.find((c: any) => {
      const md = (c.metadata as any) ?? {};
      const alias: string | undefined = md.alias;
      return alias && to.toLowerCase().includes(alias.toLowerCase());
    });
    const conn = target
      ? await prisma.connection.findUnique({ where: { id: target.id } })
      : null;

    if (!conn)
      return NextResponse.json(
        { error: 'no alias configured' },
        { status: 404 },
      );

    const secret = conn.accessToken || null;
    const secretOk = verifySecret(req, secret);
    const mailgunOk = verifyMailgunSignature(raw);
    if (!secretOk && !mailgunOk) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const metadata = (conn.metadata as any) ?? {};
    const alias: string | undefined = metadata.alias;
    if (metadata.disabled === true) {
      return NextResponse.json({ error: 'alias disabled' }, { status: 403 });
    }
    if (!alias || !to.toLowerCase().includes(alias.toLowerCase())) {
      return NextResponse.json({ error: 'alias mismatch' }, { status: 400 });
    }
    const shopDomainForAlias: string | undefined = metadata.shopDomain;

    const rawBody = text || html || '';
    const body = DOMPurify.sanitize(String(rawBody), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    }).slice(0, 20000);
    const customerEmail = from.toLowerCase();

    // Correlate to Order: try by email, then by parsed order number
    let orderId: string | undefined;
    const recentOrder = await prisma.order.findFirst({
      where: { email: customerEmail },
      orderBy: { createdAt: 'desc' },
    });
    if (recentOrder) {
      orderId = recentOrder.id;
    } else {
      const candidate = extractOrderCandidate(`${subject ?? ''} ${body}`);
      if (candidate) {
        // Try matching by order name first (e.g., "#1001" or "1001")
        const byName = await prisma.order.findFirst({
          where: {
            OR: [
              { name: `#${candidate}` },
              { name: candidate },
              { shopifyId: candidate },
            ],
          },
        });
        if (byName) orderId = byName.id;
      }
    }

    // Idempotency guard using message-id when available
    const messageIdHeader =
      (raw['Message-Id'] as string) ||
      (raw['message-id'] as string) ||
      undefined;
    if (messageIdHeader && redis) {
      const key = `email:webhook:${messageIdHeader}`;
      const exists = await redis.get<string>(key);
      if (exists) return NextResponse.json({ ok: true, deduped: true });
    }

    // Create thread and message
    const thread = await prisma.thread.create({
      data: { customerEmail, subject: subject ?? null },
    });

    // Attempt to parse Message-ID header
    const headers: Record<string, any> = {
      'message-id': messageIdHeader,
      subject,
      from,
      to,
    };

    const msg = await prisma.message.create({
      data: {
        threadId: thread.id,
        orderId: orderId ?? null,
        from: customerEmail,
        to: to.toLowerCase(),
        body: body || '(no content)',
        direction: 'INBOUND',
        // The following fields exist after the next DB migration; cast to avoid TS mismatch before generate
        messageId: messageIdHeader ?? null,
        headers,
      } as any,
    });

    await logEvent(
      'email.inbound',
      { from, to, subject, orderId },
      'thread',
      thread.id,
    );

    // Enqueue background job to generate AI suggestion
    // Generate AI suggestion (OpenAI if configured; otherwise heuristic fallback)
    async function generateSuggestion(): Promise<{
      reply: string;
      proposedAction:
        | 'REFUND'
        | 'CANCEL'
        | 'REPLACE_ITEM'
        | 'ADDRESS_CHANGE'
        | 'INFO_REQUEST'
        | 'NONE';
      confidence: number;
    }> {
      const lower = `${subject ?? ''} ${body}`.toLowerCase();
      const keywordToAction: Array<{ re: RegExp; action: any }> = [
        { re: /(refund|money\s*back|chargeback)/, action: 'REFUND' },
        { re: /(cancel|cancellation)/, action: 'CANCEL' },
        { re: /(replace|replacement|damaged)/, action: 'REPLACE_ITEM' },
        {
          re: /(address|ship\s*to|wrong\s*address|change\s*address)/,
          action: 'ADDRESS_CHANGE',
        },
        { re: /(where is|status|update|tracking)/, action: 'INFO_REQUEST' },
      ];
      let action: any = 'NONE';
      for (const k of keywordToAction) {
        if (k.re.test(lower)) {
          action = k.action;
          break;
        }
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        // Enhanced fallback with personalization
        const customerName = customerEmail
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const order = orderId
          ? await prisma.order.findUnique({ where: { id: orderId } })
          : null;

        let reply = `Hi ${customerName},\n\n`;
        reply += `Thank you for reaching out to us! `;

        if (order) {
          reply += `I can see your order ${order.name || `#${order.shopifyId}`} in our system and I'm here to help you with any questions or concerns you may have.\n\n`;
        } else {
          reply += `I'd be happy to assist you with your inquiry. `;
          reply += `If you have an order number, please share it so I can look up your specific order details.\n\n`;
        }

        // Action-specific responses
        if (action === 'REFUND') {
          reply += `I understand you're interested in a refund. I can definitely help you with that process. `;
          reply += `Let me review your order details and get back to you with the next steps within the next few hours.\n\n`;
        } else if (action === 'CANCEL') {
          reply += `I see you'd like to cancel your order. `;
          reply += `Let me check if your order is still eligible for cancellation and I'll get back to you with the details.\n\n`;
        } else if (action === 'REPLACE_ITEM') {
          reply += `I understand you need a replacement for an item. `;
          reply += `I'll review your order and arrange for a replacement to be sent out to you.\n\n`;
        } else if (action === 'ADDRESS_CHANGE') {
          reply += `I can help you update your shipping address. `;
          reply += `Let me check your order status and make the necessary changes for you.\n\n`;
        } else if (action === 'INFO_REQUEST') {
          reply += `I'll look into your order status and provide you with a detailed update. `;
          reply += `You can expect to hear from me with tracking information and next steps.\n\n`;
        } else {
          reply += `I'm reviewing your message and will provide you with a detailed response shortly. `;
          reply += `I want to make sure I address all your concerns properly.\n\n`;
        }

        reply += `If you have any other questions in the meantime, please don't hesitate to reach out.\n\n`;
        reply += `Best regards,\n`;
        reply += `Customer Support Team`;

        return {
          reply,
          proposedAction: action,
          confidence: action === 'NONE' ? 0.4 : 0.6,
        } as any;
      }

      // Compose detailed prompt with order context
      const order = orderId
        ? await prisma.order.findUnique({ where: { id: orderId } })
        : null;

      // Extract customer name from email if possible
      const customerName = customerEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      const orderContext = order
        ? `Order Details:
- Order Number: ${order.name || `#${order.shopifyId}`}
- Total Amount: $${(order.totalAmount / 100).toFixed(2)}
- Status: ${order.status}
- Customer Email: ${order.email || 'Not provided'}`
        : 'No order found - customer may need to provide order number';

      const prompt = `You are a professional customer support representative for an e-commerce store. Write a personalized, empathetic, and helpful reply to the customer's email.

Guidelines:
- Be warm, professional, and empathetic
- Acknowledge their specific concern
- Use their name if available (${customerName})
- Reference their order details if available
- Provide clear next steps
- Keep it conversational but professional
- Show understanding of their situation
- Offer specific solutions based on their request

${orderContext}

Customer Email:
Subject: ${subject ?? '(no subject)'}
From: ${customerEmail}
Message: ${body}

Write a comprehensive reply that addresses their concern and provides clear next steps.`;

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a professional customer support representative with excellent communication skills. You write personalized, empathetic, and helpful responses that make customers feel valued and understood. You always:

1. Acknowledge the customer's specific concern
2. Use a warm, professional tone
3. Reference their order details when available
4. Provide clear, actionable next steps
5. Show genuine care for their experience
6. Keep responses comprehensive but not overwhelming
7. Use the customer's name when appropriate
8. Address their specific request directly

Write responses that sound like they come from a real human support agent who genuinely cares about helping the customer.`,
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 400,
          }),
        });
        if (!resp.ok) throw new Error(`openai ${resp.status}`);
        const json: any = await resp.json();
        const reply: string =
          json.choices?.[0]?.message?.content ??
          "Thanks for reaching out. I'll follow up shortly with details.";

        // Lightweight action inference from LLM output
        const rlower = reply.toLowerCase();
        if (/refund/.test(rlower)) action = 'REFUND';
        else if (/cancel/.test(rlower)) action = 'CANCEL';
        else if (/replace/.test(rlower)) action = 'REPLACE_ITEM';
        else if (/address/.test(rlower)) action = 'ADDRESS_CHANGE';
        else if (/(update|status|tracking)/.test(rlower))
          action = 'INFO_REQUEST';

        return { reply, proposedAction: action, confidence: 0.75 } as any;
      } catch {
        // Enhanced fallback for API errors
        const customerName = customerEmail
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const order = orderId
          ? await prisma.order.findUnique({ where: { id: orderId } })
          : null;

        let fallback = `Hi ${customerName},\n\n`;
        fallback += `Thank you for contacting us! `;

        if (order) {
          fallback += `I can see your order ${order.name || `#${order.shopifyId}`} and I'm here to help.\n\n`;
        } else {
          fallback += `I'd be happy to assist you with your inquiry.\n\n`;
        }

        fallback += `I'm currently reviewing your message and will provide you with a detailed response shortly. `;
        fallback += `I want to make sure I address all your concerns properly.\n\n`;
        fallback += `If you have any urgent questions, please don't hesitate to reach out.\n\n`;
        fallback += `Best regards,\nCustomer Support Team`;

        return {
          reply: fallback,
          proposedAction: action,
          confidence: 0.5,
        } as any;
      }
    }

    const gen = await generateSuggestion();
    await prisma.aISuggestion.upsert({
      where: { messageId: msg.id },
      update: {
        reply: gen.reply,
        proposedAction: gen.proposedAction as any,
        confidence: gen.confidence,
      },
      create: {
        messageId: msg.id,
        reply: gen.reply,
        proposedAction: gen.proposedAction as any,
        orderId: orderId ?? null,
        confidence: gen.confidence,
      },
    });

    if (messageIdHeader && redis) {
      await redis.set(`email:webhook:${messageIdHeader}`, '1', {
        ex: 60 * 60 * 24,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('email webhook error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
