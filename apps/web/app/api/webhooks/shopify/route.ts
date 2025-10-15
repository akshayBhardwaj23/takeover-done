import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { logEvent } from '@ai-ecom/db';

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';
  const shop = req.headers.get('x-shopify-shop-domain') ?? '';
  const payload = await req.text();

  if (!secret)
    return NextResponse.json({ error: 'Missing secret' }, { status: 500 });
  const digest = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');
  if (digest !== hmac)
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });

  await logEvent('shopify.webhook', {
    topic,
    shop,
    payload: payload.slice(0, 200),
  });
  return NextResponse.json({ ok: true });
}
