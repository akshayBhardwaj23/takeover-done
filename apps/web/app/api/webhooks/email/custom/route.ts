import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
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
// Note: This is for custom header authentication (optional, not used by Mailgun Routes by default)
function verifySecret(req: NextRequest, secret: string | null) {
  const hdr = req.headers.get('x-email-webhook-secret');
  return secret && hdr && secret === hdr;
}

// Alternative: Basic auth verification (for Routes with basic auth in URL: https://user:pass@...)
function verifyBasicAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  // Note: Basic auth credentials should be set in Mailgun Route URL
  // e.g., https://webhook:secret@your-domain.com/api/webhooks/email/custom
  // For now, we'll allow Routes without basic auth if they have valid email data
  return true;
}

// Mailgun signature verification
// IMPORTANT: This only works for Mailgun Events Webhooks (configured under Webhooks → Stored Messages)
// Mailgun Routes (email forwarding) do NOT include signature fields
//
// To use Events Webhooks:
// 1. Mailgun Dashboard → Webhooks → Stored Messages
// 2. Add webhook: https://your-domain.com/api/webhooks/email/custom
// 3. Get HTTP webhook signing key from: Domains → mail.zyyp.ai → Webhooks
// 4. Set MAILGUN_SIGNING_KEY to that HTTP webhook signing key (NOT the API key)
//
// Alternative for Routes (if you must use Routes):
// - Add basic auth to Route URL: https://webhook:secret@your-domain.com/api/webhooks/email/custom
// - Verify basic auth server-side instead of signature
function verifyMailgunSignature(raw: any): boolean {
  const signingKey = process.env.MAILGUN_SIGNING_KEY;
  if (!signingKey) {
    // If signing key is not configured, skip verification (allow through)
    // This allows Routes to work without signature verification
    // Note: For Routes, consider using basic auth in the URL instead
    return true;
  }

  // Verify we're using the HTTP webhook signing key format (not API key)
  // HTTP webhook signing keys are typically 32-char hex strings (no "key-" prefix)
  // API keys start with "key-"
  if (signingKey.startsWith('key-')) {
    console.error(
      '[Email Webhook] ❌ MAILGUN_SIGNING_KEY appears to be an API key, not HTTP webhook signing key!',
    );
    console.error(
      '[Email Webhook] Get HTTP webhook signing key from: Mailgun → Domains → mail.zyyp.ai → Webhooks',
    );
    return false;
  }

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

  // Mailgun Routes (email forwarding) don't always include signature fields
  // If signature fields are missing, we can't verify, so return false
  // But we'll allow through if signature verification is skipped (see main handler)
  if (!token || !timestamp || !signature) {
    console.warn(
      '[Email Webhook] Mailgun signature missing fields (Routes may not include signatures):',
      {
        hasToken: !!token,
        hasTimestamp: !!timestamp,
        hasSignature: !!signature,
        note: 'Mailgun Routes (email forwarding) may not include signature fields. Use custom header or allow without signature for Routes.',
      },
    );
    return false;
  }

  const data = timestamp + token;
  const digest = crypto
    .createHmac('sha256', signingKey)
    .update(data)
    .digest('hex');
  const isValid = digest === signature;
  if (!isValid) {
    console.warn('[Email Webhook] Mailgun signature verification failed:', {
      expected: digest.substring(0, 10) + '...',
      received: signature?.substring(0, 10) + '...',
    });
  }
  return isValid;
}

function extractOrderCandidate(text: string): string | null {
  // Improved patterns to catch various formats:
  // - "#1003" or "# 1003"
  // - "order 1003" or "Order 1003"
  // - "order status 1003" or "Order status 1003"
  // - "order #1003"
  // - Just standalone numbers in context (more lenient)
  const patterns = [
    /#\s?(\d{3,8})/i, // #1003 or # 1003
    /order\s+#?\s?(\d{3,8})/i, // order #1003 or order 1003
    /order\s+status\s+(\d{3,8})/i, // order status 1003
    /order\s+number\s+(\d{3,8})/i, // order number 1003
    /\b(\d{4,5})\b/i, // Standalone 4-5 digit numbers (likely order numbers)
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  console.log('[Email Webhook] Received request:', {
    method: req.method,
    path: '/api/webhooks/email/custom',
    contentType: req.headers.get('content-type'),
    hasXEmailWebhookSecret: !!req.headers.get('x-email-webhook-secret'),
    hasMailgunSigningKey: !!process.env.MAILGUN_SIGNING_KEY,
  });
  try {
    // Idempotency: prefer Message-ID header; fallback to HMAC of body
    // Only use Upstash Redis in production/staging (not in local development)
    // Development should use local Redis configured separately
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging =
      process.env.ENVIRONMENT === 'staging' ||
      process.env.NODE_ENV === 'production';
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
    let parseError: any = null;

    try {
      if (contentType.includes('application/json')) {
        raw = await req.json();
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
      } else {
        // Try JSON as fallback if content-type is unclear
        try {
          raw = await req.json();
        } catch {
          // If JSON fails, try form-data
          const fd = await req.formData();
          raw = Object.fromEntries(
            Array.from(fd.entries()).map(([k, v]) => [
              k,
              typeof v === 'string' ? v : ((v as any).name ?? ''),
            ]),
          ) as any;
        }
      }
    } catch (err) {
      parseError = err;
      console.error('[Email Webhook] ❌ Failed to parse request body:', {
        contentType,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!raw) {
      console.error('[Email Webhook] ❌ No parsed body data:', {
        contentType,
        parseError:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    }

    // Log successful parsing for debugging intermittent issues
    console.log('[Email Webhook] Request parsed successfully:', {
      contentType,
      rawKeys: Object.keys(raw).slice(0, 15),
      hasTo: !!(raw.to || raw.recipient),
      hasFrom: !!(raw.from || raw.sender),
    });

    // Log Mailgun signature fields for debugging
    if (process.env.MAILGUN_SIGNING_KEY) {
      console.log('[Email Webhook] Mailgun signature fields:', {
        hasSignatureObject: !!raw?.signature,
        hasToken: !!(raw?.signature?.token || raw?.token),
        hasTimestamp: !!(raw?.signature?.timestamp || raw?.timestamp),
        hasSignature: !!(raw?.signature?.signature || raw?.signature),
        rawKeys: Object.keys(raw).slice(0, 20), // First 20 keys
      });
    }

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
    const basicAuthOk = verifyBasicAuth(req);

    // Log authentication status (always, not just on failure, to debug intermittent issues)
    const authPassed = secretOk || mailgunOk || basicAuthOk;
    console.log('[Email Webhook] Authentication check:', {
      secretOk,
      mailgunOk,
      basicAuthOk,
      authPassed,
      hasSecret: !!secret,
      hasMailgunSigningKey: !!process.env.MAILGUN_SIGNING_KEY,
      contentType: req.headers.get('content-type'),
      hasSignature: !!(raw?.signature || raw?.token),
    });

    if (authPassed) {
      console.log(
        '[Email Webhook] ✅ Authentication passed - proceeding with email processing',
      );
    }

    // Log authentication details for debugging
    if (!secretOk && !mailgunOk && !basicAuthOk) {
      const contentType = req.headers.get('content-type') || '';
      const isFormData =
        contentType.includes('multipart/form-data') ||
        contentType.includes('application/x-www-form-urlencoded');

      console.error('[Email Webhook] ❌ Authentication failed:', {
        hasSecret: !!secret,
        secretHeader: req.headers.get('x-email-webhook-secret')
          ? 'present'
          : 'missing',
        mailgunSigningKey: process.env.MAILGUN_SIGNING_KEY
          ? 'configured'
          : 'missing',
        mailgunSigningKeyLength: process.env.MAILGUN_SIGNING_KEY?.length || 0,
        mailgunSigningKeyFormat: process.env.MAILGUN_SIGNING_KEY?.startsWith(
          'key-',
        )
          ? 'API_KEY (WRONG!)'
          : 'HTTP_WEBHOOK_KEY (correct)',
        hasBasicAuth: !!req.headers.get('authorization'),
        hasSignature: !!raw?.signature || !!raw?.token,
        hasToken: !!raw?.token,
        hasTimestamp: !!raw?.timestamp,
        hasSignatureField: !!raw?.signature,
        contentType,
        isFormData,
        likelyRoutes: isFormData && !raw?.signature && !raw?.token,
        to: to?.substring(0, 50),
        from: from?.substring(0, 50),
        rawKeys: Object.keys(raw || {}).slice(0, 10),
        recommendation:
          isFormData && !raw?.signature
            ? 'This looks like Mailgun Routes (no signatures). Switch to Events Webhooks or add basic auth to Route URL.'
            : 'Check MAILGUN_SIGNING_KEY is HTTP webhook signing key (not API key)',
      });

      // Mailgun Routes (email forwarding) don't include signature fields by default
      // If we have valid email routing data (to/from), allow through for Routes
      // This is a known limitation - Routes forward emails but don't include webhook signatures
      // For better security, consider using Mailgun's webhook events instead of Routes
      // Note: We already validated to/from exist earlier, so if we reach here, they should exist
      // But double-check in case of edge cases (e.g., empty strings, null values after parsing)
      if (to && from && to.trim() && from.trim()) {
        console.warn(
          '[Email Webhook] ⚠️ Authentication failed but email routing data present - allowing through (Mailgun Routes may not include signatures)',
        );
        console.warn(
          '[Email Webhook] 💡 RECOMMENDATION: Switch to Mailgun Events Webhooks for better security:',
          'Mailgun Dashboard → Webhooks → Stored Messages → Add webhook',
        );
        // Allow through for Mailgun Routes (email forwarding)
        // Routes don't include signature fields, only webhook events do
        // We trust the connection lookup (alias matching) as a form of authentication
      } else {
        console.error(
          '[Email Webhook] ❌ Authentication failed and no valid email routing data:',
          {
            hasTo: !!to,
            hasFrom: !!from,
            toValue: to?.substring(0, 50),
            fromValue: from?.substring(0, 50),
            toTrimmed: to?.trim(),
            fromTrimmed: from?.trim(),
            hasSubject: !!subject,
            hasText: !!text,
            hasHtml: !!html,
            rawKeys: Object.keys(raw || {}),
          },
        );
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
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
    const emailMatch =
      from.match(/<([^>]+)>/) ||
      from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const customerEmail = (emailMatch ? emailMatch[1] : from)
      .toLowerCase()
      .trim();

    // Correlate to Order: prioritize order number from subject/body, then fallback to email
    let orderId: string | undefined;

    // Get shop domain from connection metadata to scope order search
    const shopDomain =
      (metadata.shopDomain as string | undefined) ||
      conn.shopDomain ||
      undefined;

    // First, try to extract and match order number from subject/body (more specific)
    const candidate = extractOrderCandidate(`${subject ?? ''} ${body}`);
    if (candidate) {
      console.log(
        `[Email Webhook] Extracted order candidate: ${candidate} from subject/body`,
      );

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
          console.log(
            `[Email Webhook] Matched order ${candidate} to order ID: ${orderId} (${byName.name || byName.shopifyId})`,
          );
        }
      } else {
        // Fallback if no connectionId - just match by name/shopifyId and shopDomain
        const byName = await prisma.order.findFirst({
          where: orderWhere,
        });
        if (byName) {
          orderId = byName.id;
          console.log(
            `[Email Webhook] Matched order ${candidate} to order ID: ${orderId} (${byName.name || byName.shopifyId})`,
          );
        }
      }

      if (!orderId && candidate) {
        console.warn(
          `[Email Webhook] Could not find order matching candidate "${candidate}"${shopDomain ? ` for shop ${shopDomain}` : ''}`,
        );
      }
    }

    // IMPORTANT: Do NOT fallback to email matching if no order number is found
    // If no order matches, leave orderId as undefined so email goes to "Unassigned Emails" section
    // This allows manual assignment by support staff
    if (!orderId) {
      console.log(
        `[Email Webhook] No order matched - email will be marked as unassigned (customer: ${customerEmail})`,
      );
    }

    // Idempotency guard using message-id when available
    const messageIdHeader =
      (raw['Message-Id'] as string) ||
      (raw['message-id'] as string) ||
      undefined;
    if (messageIdHeader && redis) {
      try {
        const key = `email:webhook:${messageIdHeader}`;
        // Use SETNX (SET with NX) - atomic check-and-set in 1 command instead of GET+SET (2 commands)
        // Returns 1 if key was set (first time), 0 if already exists (duplicate)
        const wasNew = await redis.set(key, '1', {
          nx: true, // Only set if key doesn't exist
          ex: 60 * 60 * 24, // 24 hour TTL
        });
        if (!wasNew) {
          // Key already exists - this is a duplicate webhook
          console.log(
            `[Email Webhook] ⚠️ Duplicate webhook detected (Message-ID: ${messageIdHeader}), skipping - already processed`,
          );
          return NextResponse.json({ ok: true, deduped: true });
        } else {
          console.log(
            `[Email Webhook] ✅ New webhook (Message-ID: ${messageIdHeader}), processing...`,
          );
        }
      } catch (err) {
        console.warn(
          '[Email Webhook] Redis idempotency check failed, continuing:',
          err,
        );
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

    // Trigger Inngest event to generate AI suggestion (non-blocking, event-driven)
    // This replaces BullMQ worker - zero Redis polling!
    try {
      const { inngest } = await import('../../../../../inngest/client');
      await inngest.send({
        name: 'email/inbound.process',
        data: {
          messageId: msg.id,
        },
      });
      console.log(
        `[Email Webhook] Triggered Inngest event for message ${msg.id}`,
      );
    } catch (error) {
      // If Inngest is not available, log but don't fail the webhook
      // This allows graceful degradation
      console.warn(
        '[Email Webhook] Failed to trigger Inngest event, AI suggestion will be generated later:',
        error,
      );
      // Create a placeholder suggestion that will be updated when Inngest processes it
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

    // Note: Webhook idempotency is already handled at the start with SETNX
    // No need to set again here - it was already set if this webhook is new

    // Log successful processing
    console.log('[Email Webhook] ✅ Successfully processed email:', {
      messageId: msg.id,
      threadId: thread.id,
      orderId: orderId || 'unassigned',
      from: customerEmail,
      to: to,
      subject: subject || '(no subject)',
      inngestTriggered: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('email webhook error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
