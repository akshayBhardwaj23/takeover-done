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
  const sig = raw?.signature;
  const token = sig?.token as string | undefined;
  const timestamp = sig?.timestamp as string | undefined;
  const signature = sig?.signature as string | undefined;
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
    const raw = await req.json().catch(() => null);
    if (!raw)
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });

    const to: string | undefined = raw.to;
    const from: string | undefined = raw.from;
    const subject: string | undefined = raw.subject;
    const text: string | undefined = raw.text;
    const html: string | undefined = raw.html;
    const headers: Record<string, string> | undefined = raw.headers;

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
    if (!verifySecret(req, secret) || !verifyMailgunSignature(raw)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const metadata = (conn.metadata as any) ?? {};
    const alias: string | undefined = metadata.alias;
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

    const msg = await prisma.message.create({
      data: {
        threadId: thread.id,
        orderId: orderId ?? null,
        from: customerEmail,
        to: to.toLowerCase(),
        body: body || '(no content)',
        direction: 'INBOUND',
      },
    });

    await logEvent(
      'email.inbound',
      { from, to, subject, orderId },
      'thread',
      thread.id,
    );

    // Stub: create AISuggestion row linked to this message
    await prisma.aISuggestion.create({
      data: {
        messageId: msg.id,
        reply:
          'Hi there, thanks for reaching out. I took a look at your order and can help next with an update or a refund if needed. Let me know how you would like to proceed.',
        proposedAction: 'NONE',
        orderId: orderId ?? null,
        confidence: 0.5,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('email webhook error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
