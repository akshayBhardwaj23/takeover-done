import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import crypto from 'node:crypto';

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

    const body = text || html || '';
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
        const byName = await prisma.order.findFirst({
          where: { shopifyId: candidate },
        });
        if (byName) orderId = byName.id;
      }
    }

    // Create thread and message
    const thread = await prisma.thread.create({
      data: { customerEmail, subject: subject ?? null },
    });

    // Attempt to parse Message-ID header
    const messageIdHeader =
      (raw['Message-Id'] as string) ||
      (raw['message-id'] as string) ||
      undefined;
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
        const reply = `Hi${customerEmail && customerEmail.includes('@') ? '' : ''},\n\nThanks for reaching out. ${orderId ? 'I pulled up your order and can help right away.' : 'Could you share your order number so I can help?'}\n\n${action === 'REFUND' ? 'I can help arrange a refund if you prefer.' : action === 'CANCEL' ? "I can help cancel the order if it hasn't shipped yet." : action === 'REPLACE_ITEM' ? 'I can arrange a replacement for the affected item.' : action === 'ADDRESS_CHANGE' ? "I can update your shipping address if the order hasn't shipped." : "I'm happy to provide an update and next steps."}\n\nBest regards,\nSupport`;
        return {
          reply,
          proposedAction: action,
          confidence: action === 'NONE' ? 0.4 : 0.6,
        } as any;
      }

      // Compose prompt with minimal PII
      const order = orderId
        ? await prisma.order.findUnique({ where: { id: orderId } })
        : null;
      const orderSummary = order
        ? `Order ${order.shopifyId} total ${(order.totalAmount / 100).toFixed(2)}`
        : 'Order unknown';
      const prompt = `You are a Shopify support assistant. Write a short, on-brand reply to the customer email below. Keep it concise, friendly, and propose a concrete next step. If refund, cancellation, replacement, or address change is clearly requested or implied, suggest it in one line. Include the order reference if provided.\n\nOrder Context: ${orderSummary}\nCustomer Email:\nSubject: ${subject ?? '(no subject)'}\nBody:\n${body}`;

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
                content:
                  'You are a helpful, concise Shopify support assistant.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 250,
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
        const fallback =
          "Thanks for reaching out. I'll review your request and follow up shortly with next steps.";
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('email webhook error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
