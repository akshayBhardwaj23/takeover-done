import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';
import { Redis } from '@upstash/redis';

export async function POST(req: NextRequest) {
  // Idempotency: prevent replayed webhooks
  const webhookId = req.headers.get('x-shopify-webhook-id');
  const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        })
      : null;
  if (webhookId && redis) {
    const key = `webhook:${webhookId}`;
    const exists = await redis.get<string>(key);
    if (exists) return NextResponse.json({ ok: true, deduped: true });
  }
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

  // Handle app uninstall: remove DB entries so the dashboard reflects disconnects
  if (topic === 'app/uninstalled') {
    try {
      await prisma.connection.deleteMany({
        where: { type: 'SHOPIFY' as any, shopDomain: shop },
      });
      // Best-effort: remove orders tied to this shop domain (if tracked)
      await prisma.order.deleteMany({ where: { shopDomain: shop as any } });
      await logEvent('shopify.app.uninstalled', { shop }, 'connection', shop);
    } catch (err) {
      await logEvent('shopify.app.uninstalled.error', {
        shop,
        err: String(err),
      });
    }
    return NextResponse.json({ ok: true, removed: true });
  }

  // Persist minimal Order info for dashboard visibility
  try {
    const json = JSON.parse(payload);
    // Resolve connection for this shop (required for Order.connectionId)
    const conn = await prisma.connection.findFirst({
      where: { type: 'SHOPIFY' as any, shopDomain: shop },
      select: { id: true },
    });
    if (!conn) {
      // If no connection found for this shop, skip persistence safely
      await logEvent('shopify.webhook.no_connection', { shop, topic });
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (topic === 'orders/create') {
      const order = json;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);
      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: conn.id,
          name: order.name || null,
          shopDomain: shop || null,
          status: 'CREATED',
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
        },
        update: {
          name: order.name || null,
          shopDomain: shop || null,
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
  if (webhookId && redis) {
    await redis.set(`webhook:${webhookId}`, '1', { ex: 60 * 60 * 24 });
  }
  return NextResponse.json({ ok: true });
}
