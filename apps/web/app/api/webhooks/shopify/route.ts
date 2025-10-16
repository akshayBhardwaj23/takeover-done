import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';

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

  await logEvent('shopify.webhook', { topic, shop });

  // Persist minimal Order info for dashboard visibility
  try {
    const json = JSON.parse(payload);
    if (topic === 'orders/create') {
      const order = json;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);
      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          status: 'CREATED',
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
        },
        update: {
          status: 'CREATED',
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
        },
      });
    } else if (topic === 'orders/fulfilled') {
      const order = json;
      await prisma.order.updateMany({
        where: { shopifyId: String(order.id) },
        data: { status: 'FULFILLED' },
      });
    } else if (topic === 'refunds/create') {
      const refund = json;
      await prisma.order.updateMany({
        where: { shopifyId: String(refund.order_id) },
        data: { status: 'REFUNDED' },
      });
    }
  } catch (err) {
    await logEvent('shopify.webhook.persist.error', {
      topic,
      shop,
      err: String(err),
    });
  }
  return NextResponse.json({ ok: true });
}
