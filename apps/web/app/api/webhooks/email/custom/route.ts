import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// Simple HTML sanitization (server-safe, no jsdom dependency)
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[#a-zA-Z0-9]+;/g, '') // Remove HTML entities
    .replace(/&#\d+;/g, '') // Remove numeric entities
    .trim();
}

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
  // Improved patterns to catch various formats:
  // - "#1003" or "# 1003"
  // - "order 1003" or "Order 1003"
  // - "order status 1003" or "Order status 1003"
  // - "order #1003"
  // - Just standalone numbers in context (more lenient)
  const patterns = [
    /#\s?(\d{3,8})/i,                    // #1003 or # 1003
    /order\s+#?\s?(\d{3,8})/i,           // order #1003 or order 1003
    /order\s+status\s+(\d{3,8})/i,       // order status 1003
    /order\s+number\s+(\d{3,8})/i,       // order number 1003
    /\b(\d{4,5})\b/i,                    // Standalone 4-5 digit numbers (likely order numbers)
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Idempotency: prefer Message-ID header; fallback to HMAC of body
    // Only use Upstash Redis in production/staging (not in local development)
    // Development should use local Redis configured separately
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging =
      process.env.ENVIRONMENT === 'staging' || process.env.NODE_ENV === 'production';
    const useUpstash = isProduction || isStaging;
    
    let redis = null;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // Only initialize Upstash Redis in staging/production
    if (
      useUpstash &&
      redisUrl &&
      redisToken &&
      !redisUrl.includes('...') &&
      redisUrl.startsWith('https://')
    ) {
      try {
        redis = new Redis({
          url: redisUrl,
          token: redisToken,
        });
      } catch (err) {
        console.warn(
          '[Email Webhook] Failed to initialize Redis, continuing without idempotency:',
          err,
        );
        redis = null;
      }
    }
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
    const body = stripHtml(String(rawBody)).slice(0, 20000);
    
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = from.match(/<([^>]+)>/) || from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const customerEmail = (emailMatch ? emailMatch[1] : from).toLowerCase().trim();

    // Correlate to Order: prioritize order number from subject/body, then fallback to email
    let orderId: string | undefined;
    
    // Get shop domain from connection metadata to scope order search
    const shopDomain = (metadata.shopDomain as string | undefined) || 
                       (conn.shopDomain || undefined);
    
    // First, try to extract and match order number from subject/body (more specific)
    const candidate = extractOrderCandidate(`${subject ?? ''} ${body}`);
    if (candidate) {
      console.log(`[Email Webhook] Extracted order candidate: ${candidate} from subject/body`);
      
      // Build where clause with shop domain scoping if available
      const orderWhere: any = {
        OR: [
          { name: `#${candidate}` },
          { name: candidate },
          { shopifyId: candidate },
        ],
      };
      
      // Scope to same shop if we have shop domain from connection
      if (shopDomain) {
        orderWhere.shopDomain = shopDomain;
      }
      
      // Also scope to same connection if we have connectionId
      if (conn.id) {
        // Orders belong to connections, so filter by connectionId
        const byName = await prisma.order.findFirst({
          where: {
            ...orderWhere,
            connectionId: conn.id,
          },
        });
        if (byName) {
          orderId = byName.id;
          console.log(`[Email Webhook] Matched order ${candidate} to order ID: ${orderId} (${byName.name || byName.shopifyId})`);
        }
      } else {
        // Fallback if no connectionId - just match by name/shopifyId and shopDomain
        const byName = await prisma.order.findFirst({
          where: orderWhere,
        });
        if (byName) {
          orderId = byName.id;
          console.log(`[Email Webhook] Matched order ${candidate} to order ID: ${orderId} (${byName.name || byName.shopifyId})`);
        }
      }
      
      if (!orderId && candidate) {
        console.warn(`[Email Webhook] Could not find order matching candidate "${candidate}"${shopDomain ? ` for shop ${shopDomain}` : ''}`);
      }
    }
    
    // IMPORTANT: Do NOT fallback to email matching if no order number is found
    // If no order matches, leave orderId as undefined so email goes to "Unassigned Emails" section
    // This allows manual assignment by support staff
    if (!orderId) {
      console.log(`[Email Webhook] No order matched - email will be marked as unassigned (customer: ${customerEmail})`);
    }

    // Idempotency guard using message-id when available
    const messageIdHeader =
      (raw['Message-Id'] as string) ||
      (raw['message-id'] as string) ||
      undefined;
    if (messageIdHeader && redis) {
      try {
        const key = `email:webhook:${messageIdHeader}`;
        const exists = await redis.get<string>(key);
        if (exists) return NextResponse.json({ ok: true, deduped: true });
      } catch (err) {
        console.warn('[Email Webhook] Redis idempotency check failed, continuing:', err);
      }
    }

    // Create thread and message
    // Thread requires connectionId - use the connection we found earlier
    if (!conn) {
      return NextResponse.json(
        { error: 'no connection found for alias' },
        { status: 404 },
      );
    }
    
    const thread = await prisma.thread.create({
      data: {
        customerEmail,
        subject: subject ?? null,
        connectionId: conn.id,
      },
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

    // Enqueue background job to generate AI suggestion (non-blocking)
    // This allows webhook to return immediately and prevents timeouts
    try {
      // Dynamic import to avoid build-time dependency issues
      const { enqueueInboxJob } = await import('@ai-ecom/worker');
      await enqueueInboxJob('inbound-email-process', {
        messageId: msg.id,
      });
      console.log(`[Email Webhook] Queued AI processing job for message ${msg.id}`);
    } catch (error) {
      // If worker is not available, log but don't fail the webhook
      // This allows graceful degradation
      console.warn(
        '[Email Webhook] Failed to queue background job, AI suggestion will be generated later:',
        error,
      );
      // Create a placeholder suggestion that will be updated when worker processes it
      await prisma.aISuggestion.upsert({
        where: { messageId: msg.id },
        update: {},
        create: {
          messageId: msg.id,
          reply:
            'Processing your message... AI suggestion will be available shortly.',
          proposedAction: 'NONE' as any,
          orderId: orderId ?? null,
          confidence: 0.1,
        },
      });
    }

    if (messageIdHeader && redis) {
      try {
        await redis.set(`email:webhook:${messageIdHeader}`, '1', {
          ex: 60 * 60 * 24,
        });
      } catch (err) {
        console.warn('[Email Webhook] Failed to set Redis key, continuing:', err);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('email webhook error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
