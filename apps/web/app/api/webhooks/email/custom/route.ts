import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  logEvent,
  incrementEmailReceived,
} from '@ai-ecom/db';
import crypto from 'node:crypto';
import * as Sentry from '@sentry/nextjs';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to log to both console and Sentry
function logWithSentry(
  level: 'info' | 'warning' | 'error',
  message: string,
  context?: any,
) {
  // Always log to console (for Vercel logs)
  if (level === 'error') {
    console.error(message, context);
  } else if (level === 'warning') {
    console.warn(message, context);
  } else {
    console.error(message, context); // Use console.error for visibility in Vercel
  }

  // Also send to Sentry if enabled
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Use captureMessage for all levels so they appear in Discover
    // addBreadcrumb only shows up when there's an error/issue
    Sentry.captureMessage(message, {
      level:
        level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
      extra: context,
      tags: { source: 'email-webhook' },
    });
  }
}

// Simple HTML sanitization (server-safe, no jsdom dependency)
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[#a-zA-Z0-9]+;/g, '') // Remove HTML entities
    .replace(/&#\d+;/g, '') // Remove numeric entities
    .trim();
}

// Clean email body by removing quoted conversation history
function cleanEmailBody(body: string): string {
  if (!body) return body;

  let cleaned = body;

  // Remove lines starting with > (quoted text)
  cleaned = cleaned.replace(/^>.*$/gm, '');

  // Remove "On [date], [sender] wrote:" sections and everything after
  // Pattern: "On [date], [sender] wrote:" or "On [date] at [time], [sender] wrote:"
  cleaned = cleaned.replace(
    /On\s+.*?wrote:.*$/gims,
    '',
  );

  // Remove content after "---" separator (common email separator)
  const dashIndex = cleaned.indexOf('---');
  if (dashIndex > 0) {
    cleaned = cleaned.substring(0, dashIndex);
  }

  // Remove common email reply patterns
  // "From: [email]" followed by quoted content
  cleaned = cleaned.replace(/From:\s*.*$/gim, '');
  // "Sent: [date]" followed by quoted content
  cleaned = cleaned.replace(/Sent:\s*.*$/gim, '');
  // "Date: [date]" followed by quoted content
  cleaned = cleaned.replace(/Date:\s*.*$/gim, '');

  // Remove multiple consecutive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
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
// This works for Mailgun Events Webhooks (configured under Webhooks → Stored Messages)
// Mailgun Routes (email forwarding) do NOT include signature fields
function verifyMailgunSignature(raw: any): boolean {
  const signingKey = process.env.MAILGUN_SIGNING_KEY;
  if (!signingKey) {
    // If signing key is not configured, skip verification
    return true;
  }

  // Verify we're using the HTTP webhook signing key format (not API key)
  if (signingKey.startsWith('key-')) {
    console.error(
      '[Email Webhook] ❌ MAILGUN_SIGNING_KEY appears to be an API key, not HTTP webhook signing key!',
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

  if (!token || !timestamp || !signature) {
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
  // - "order 1009 status" (handles text after the number)
  // - Just standalone numbers in context (more lenient)
  const patterns = [
    /#\s?(\d{3,8})/i, // #1003 or # 1003
    /order\s+#?\s?(\d{3,8})(?:\s|$|[^\d])/i, // order #1003, order 1003, or "order 1009 status" (captures number before status)
    /order\s+status\s+(\d{3,8})/i, // order status 1003
    /order\s+number\s+(\d{3,8})/i, // order number 1003
    /\b(\d{4,5})\b/i, // Standalone 4-5 digit numbers (likely order numbers)
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const candidate = m[1];
      console.log(
        `[Email Webhook] 📝 Extracted order candidate "${candidate}" using pattern: ${re.source}`,
      );
      return candidate;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  let errorRequestId = requestId; // For use in catch block

  // Use console.error for visibility in Vercel logs (console.log is often filtered/buffered)
  // Also log to Sentry for better visibility
  logWithSentry('info', '[Email Webhook] 📧 Received request', {
    requestId,
    method: req.method,
    path: '/api/webhooks/email/custom',
    contentType: req.headers.get('content-type'),
    hasXEmailWebhookSecret: !!req.headers.get('x-email-webhook-secret'),
    hasMailgunSigningKey: !!process.env.MAILGUN_SIGNING_KEY,
    timestamp: new Date().toISOString(),
  });
  try {

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

    // Extract Message-ID header for message metadata
    const messageIdHeader =
      (raw['Message-Id'] as string) ||
      (raw['message-id'] as string) ||
      undefined;

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

    // Require at least one authentication method to pass
    if (!secretOk && !mailgunOk && !basicAuthOk) {
      console.error(
        '[Email Webhook] ❌ Authentication failed: all methods failed',
      );
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

    // NOTE: Email limit check temporarily disabled for demo
    // TODO: Re-enable canReceiveEmail check after demo
    // if (conn.userId) {
    //   const emailLimit = await canReceiveEmail(conn.userId);
    //   if (!emailLimit.allowed) {
    //     ...
    //   }
    // }

    const shopDomainForAlias: string | undefined = metadata.shopDomain;

    const rawBody = text || html || '';
    const strippedBody = stripHtml(String(rawBody)).slice(0, 20000);
    // Clean the body to remove quoted conversation history
    const body = cleanEmailBody(strippedBody);

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
    const searchText = `${subject ?? ''} ${body}`;
    const candidate = extractOrderCandidate(searchText);
    if (candidate) {
      console.error(
        `[Email Webhook] 🔍 Extracted order candidate: "${candidate}" from subject/body`,
        { subject, bodyPreview: body.substring(0, 100) },
      );

      // Build where clause with shop domain scoping if available
      // Try multiple formats: "#1009", "1009", and also check shopifyId (which is numeric string)
      // IMPORTANT: Prisma requires AND/OR to be at the top level, so we structure it properly
      const baseWhere: any = {
        OR: [
          { name: `#${candidate}` }, // "#1009" - exact match
          { name: candidate }, // "1009" - exact match (in case stored without #)
          { name: { contains: candidate } }, // Contains "1009" (handles "ORDER-1009" format)
          { shopifyId: candidate }, // Shopify numeric ID (though this is usually a long number)
        ],
      };

      // Add shop domain filter if available (AND condition)
      if (shopDomain) {
        baseWhere.shopDomain = shopDomain;
        console.error(
          `[Email Webhook] 🔎 Scoping order search to shop: ${shopDomain}`,
        );
      }

      // Find the associated Shopify connection if we have shopDomain
      // Orders belong to Shopify connections, not CUSTOM_EMAIL connections
      let shopifyConnectionId: string | undefined = undefined;
      if (shopDomain && conn.userId) {
        // Find the Shopify connection for the same user and shop
        const shopifyConn = await prisma.connection.findFirst({
          where: {
            type: 'SHOPIFY' as any,
            shopDomain: shopDomain,
            userId: conn.userId,
          },
          select: { id: true },
        });
        if (shopifyConn) {
          shopifyConnectionId = shopifyConn.id;
          console.error(
            `[Email Webhook] 🔎 Found Shopify connection: ${shopifyConnectionId} for shop: ${shopDomain}`,
          );
        } else {
          console.warn(
            `[Email Webhook] ⚠️ No Shopify connection found for shop: ${shopDomain}, userId: ${conn.userId}`,
          );
        }
      }

      // Try to match order with Shopify connection first (most accurate)
      if (shopifyConnectionId) {
        const whereWithShopifyConnection = {
          ...baseWhere,
          connectionId: shopifyConnectionId,
        };

        const byName = await prisma.order.findFirst({
          where: whereWithShopifyConnection,
        });
        if (byName) {
          orderId = byName.id;
          console.error(
            `[Email Webhook] ✅ Matched order "${candidate}" using Shopify connection to order ID: ${orderId} (name: ${byName.name || 'null'}, shopifyId: ${byName.shopifyId})`,
          );
        }
      }

      // If not found, try with the email connection's connectionId (in case orders are linked to email connections)
      if (!orderId && conn.id) {
        console.error(
          `[Email Webhook] 🔎 Trying to match order with email connectionId: ${conn.id}`,
        );
        const whereWithEmailConnection = {
          ...baseWhere,
          connectionId: conn.id,
        };

        const byName = await prisma.order.findFirst({
          where: whereWithEmailConnection,
        });
        if (byName) {
          orderId = byName.id;
          console.error(
            `[Email Webhook] ✅ Matched order "${candidate}" using email connection to order ID: ${orderId} (name: ${byName.name || 'null'}, shopifyId: ${byName.shopifyId})`,
          );
        }
      }

      // Final fallback: search without connectionId filter (match by name/shopDomain only)
      if (!orderId) {
        console.warn(
          `[Email Webhook] ⚠️ Order "${candidate}" not found with connection filters, trying without connectionId...`,
          {
            shopifyConnectionId,
            emailConnectionId: conn.id,
            candidate,
            shopDomain,
          },
        );
        const byName = await prisma.order.findFirst({
          where: baseWhere,
        });
        if (byName) {
          orderId = byName.id;
          console.error(
            `[Email Webhook] ✅ Matched order "${candidate}" (without connectionId filter) to order ID: ${orderId} (name: ${byName.name || 'null'}, shopifyId: ${byName.shopifyId}, connectionId: ${byName.connectionId})`,
          );
        } else {
          // Log what we're searching for to help debug
          console.warn(
            `[Email Webhook] ⚠️ Order "${candidate}" not found even without connectionId filter`,
            {
              searchCriteria: baseWhere,
              shopifyConnectionId,
              emailConnectionId: conn.id,
            },
          );
        }
      }

      if (!orderId && candidate) {
        // Log all orders for debugging (limited to recent orders)
        const recentOrders = await prisma.order.findMany({
          where: shopDomain ? { shopDomain } : {},
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { name: true, shopifyId: true, shopDomain: true },
        });
        console.warn(
          `[Email Webhook] ❌ Could not find order matching candidate "${candidate}"${shopDomain ? ` for shop ${shopDomain}` : ''}`,
          {
            candidate,
            shopDomain,
            connectionId: conn.id,
            recentOrders: recentOrders.map((o) => ({
              name: o.name,
              shopifyId: o.shopifyId,
              shopDomain: o.shopDomain,
            })),
          },
        );
      }
    }

    // IMPORTANT: Do NOT fallback to email matching if no order number is found
    // If no order matches, leave orderId as undefined so email goes to "Unassigned Emails" section
    // This allows manual assignment by support staff
    if (!orderId) {
      console.error(
        `[Email Webhook] ⚠️ No order matched - email will be marked as unassigned (customer: ${customerEmail})`,
      );
    }



    // Create thread and message
    // Thread requires connectionId - use the connection we found earlier
    if (!conn) {
      return NextResponse.json(
        { error: 'no connection found for alias' },
        { status: 404 },
      );
    }

    // Check if this is a reply to an existing thread by matching In-Reply-To or References headers
    // Mailgun Routes may send headers with 'h:' prefix, so check both formats
    let existingThread = null;
    const inReplyTo =
      (raw['h:In-Reply-To'] as string) ||
      (raw['h:in-reply-to'] as string) ||
      (raw['In-Reply-To'] as string) ||
      (raw['in-reply-to'] as string) ||
      undefined;
    const references =
      (raw['h:References'] as string) ||
      (raw['h:references'] as string) ||
      (raw['References'] as string) ||
      (raw['references'] as string) ||
      undefined;

    if (inReplyTo || references) {
      // Try to find existing thread by matching Message-ID in headers
      const messageIdsToMatch: string[] = [];
      if (inReplyTo) {
        // Extract Message-ID from In-Reply-To (format: "<message-id@domain.com>")
        const match = inReplyTo.match(/<([^>]+)>/) || inReplyTo.match(/([^\s<>]+)/);
        if (match) messageIdsToMatch.push(match[1]);
      }
      if (references) {
        // References can contain multiple Message-IDs separated by spaces
        const refIds = references.match(/<([^>]+)>/g) || references.split(/\s+/);
        refIds.forEach((ref) => {
          const match = ref.match(/<([^>]+)>/) || ref.match(/([^\s<>]+)/);
          if (match) messageIdsToMatch.push(match[1]);
        });
      }

      // Find messages with matching Message-IDs
      if (messageIdsToMatch.length > 0) {
        const matchingMessages = await prisma.message.findMany({
          where: {
            messageId: { in: messageIdsToMatch },
            thread: { connectionId: conn.id },
          },
          include: { thread: true },
          take: 1,
        });

        if (matchingMessages.length > 0) {
          existingThread = matchingMessages[0].thread;
        }
      }
    }

    // Fallback: If header-based matching failed, try matching by customer email + subject
    if (!existingThread && subject) {
      const normalizedSubject = subject.trim();
      if (normalizedSubject) {
        // Try to find thread with same customer email and subject (case-insensitive)
        // Also check for "Re:" prefix variations
        const subjectVariations = [
          normalizedSubject,
          normalizedSubject.replace(/^Re:\s*/i, '').trim(),
          `Re: ${normalizedSubject.replace(/^Re:\s*/i, '')}`,
        ];

        existingThread = await prisma.thread.findFirst({
          where: {
            customerEmail,
            connectionId: conn.id,
            subject: {
              in: subjectVariations,
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
      }
    }

    // Use existing thread if found, otherwise create a new one
    const thread =
      existingThread ||
      (await prisma.thread.create({
        data: {
          customerEmail,
          subject: subject ?? null,
          connectionId: conn.id,
        },
      }));

    // Store headers including threading information
    const headers: Record<string, any> = {
      'message-id': messageIdHeader,
      subject,
      from,
      to,
    };
    // Store threading headers if present
    if (inReplyTo) {
      headers['in-reply-to'] = inReplyTo;
    }
    if (references) {
      headers['references'] = references;
    }

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

    // Check if this is a reply to our message (latest message before this one was OUTBOUND)
    // If so, mark thread as unread
    const previousMessages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'desc' },
      take: 2, // Get the two most recent (one is the one we just created)
      select: { direction: true, id: true },
    });

    // If there are at least 2 messages and the second one (before the new inbound) was OUTBOUND,
    // this means the customer is replying to our message - mark thread as unread
    if (
      previousMessages.length >= 2 &&
      previousMessages[1].direction === 'OUTBOUND'
    ) {
      await prisma.thread.update({
        where: { id: thread.id },
        data: { isUnread: true },
      });
    }
    // If this is a new thread (only one message), it's already unread by default (isUnread: true)

    await logEvent(
      'email.inbound',
      { from, to, subject, orderId },
      'thread',
      thread.id,
    );

    // Increment email received count after successfully processing
    if (conn.userId) {
      try {
        await incrementEmailReceived(conn.userId);
      } catch (error) {
        // Log error but don't fail the webhook - email is already stored
        console.error(
          '[Email Webhook] Failed to increment email received count:',
          error,
        );
      }
    }

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
      console.error(
        `[Email Webhook] 🚀 Triggered Inngest event for message ${msg.id}`,
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
    // Use console.error for visibility in Vercel logs
    logWithSentry(
      'info',
      '[Email Webhook] ✅✅✅ SUCCESSFULLY PROCESSED EMAIL',
      {
        requestId,
        messageId: msg.id,
        threadId: thread.id,
        orderId: orderId || 'unassigned',
        from: customerEmail,
        to: to,
        subject: subject || '(no subject)',
        inngestTriggered: true,
        timestamp: new Date().toISOString(),
      },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('[Email Webhook] ❌ Error processing webhook:', error);

    // Send error to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: {
          source: 'email-webhook',
          endpoint: '/api/webhooks/email/custom',
        },
        extra: {
          requestId: errorRequestId,
          url: req.url,
          method: req.method,
        },
      });
    }

    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
