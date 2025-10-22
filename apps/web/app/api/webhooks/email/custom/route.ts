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
      const alias: string | undefined = (c.metadata as any)?.alias;
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
    // Inline fallback: create a minimal AISuggestion now (replace with worker later)
    await prisma.aISuggestion.upsert({
      where: { messageId: msg.id },
      update: {},
      create: {
        messageId: msg.id,
        reply:
          'Thanks for reaching out. We have your email and will follow up with order details shortly.',
        proposedAction: 'NONE' as any,
        orderId: orderId ?? null,
        confidence: 0.4,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('email webhook error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
