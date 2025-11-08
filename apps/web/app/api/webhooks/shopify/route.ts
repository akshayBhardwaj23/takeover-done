import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';
import { Redis } from '@upstash/redis';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
// Ensure we get fresh request body (no caching)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Idempotency: prevent replayed webhooks
  const webhookId = req.headers.get('x-shopify-webhook-id');

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
        '[Shopify Webhook] Failed to initialize Redis, continuing without idempotency:',
        err,
      );
      redis = null;
    }
  }

  if (webhookId && redis) {
    try {
      const key = `webhook:${webhookId}`;
      // Use SETNX (SET with NX) - atomic check-and-set in 1 command instead of GET+SET (2 commands)
      // Returns 1 if key was set (first time), 0 if already exists (duplicate)
      const wasNew = await redis.set(key, '1', {
        nx: true, // Only set if key doesn't exist
        ex: 60 * 60 * 24, // 24 hour TTL
      });
      if (!wasNew) {
        // Key already exists - this is a duplicate webhook
        return NextResponse.json({ ok: true, deduped: true });
      }
    } catch (err) {
      console.warn(
        '[Shopify Webhook] Redis idempotency check failed, continuing:',
        err,
      );
    }
  }

  // Get headers and secret first for debugging
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';
  const shop = req.headers.get('x-shopify-shop-domain') ?? '';

  // Debug logging
  console.log('[Shopify Webhook] Received webhook:', {
    shop,
    topic,
    webhookId,
    hmacPresent: !!hmac,
    hmacPrefix: hmac.substring(0, 10) + '...',
    secretPresent: !!secret,
    secretLength: secret?.length ?? 0,
    secretPrefix: secret
      ? secret.substring(0, 3) + '...' + secret.substring(secret.length - 3)
      : 'missing',
  });

  if (!secret) {
    console.error('[Shopify Webhook] ❌ Missing SHOPIFY_API_SECRET');
    return NextResponse.json({ error: 'Missing secret' }, { status: 500 });
  }

  // Read raw body as text (Shopify sends JSON as text)
  // Important: Must read body BEFORE any other processing
  const payload = await req.text();
  const payloadLength = payload.length;

  // Calculate HMAC using the exact payload Shopify sent
  const digest = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');

  // Debug HMAC calculation
  console.log('[Shopify Webhook] HMAC validation:', {
    payloadLength,
    payloadPreview:
      payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
    computedHMAC: digest,
    receivedHMAC: hmac,
    match: digest === hmac,
  });

  if (digest !== hmac) {
    console.error(
      '[Shopify Webhook] ❌ Invalid HMAC - Secret mismatch!',
      '\nShop:',
      shop,
      '\nTopic:',
      topic,
      '\nPayload length:',
      payloadLength,
      '\nComputed HMAC:',
      digest,
      '\nReceived HMAC:',
      hmac,
      '\nSecret length:',
      secret.length,
      '\nSecret preview:',
      secret.substring(0, 3) + '...' + secret.substring(secret.length - 3),
    );
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

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
    // Normalize shop domain (remove protocol, ensure lowercase)
    const normalizedShop = shop
      .replace(/^https?:\/\//, '')
      .toLowerCase()
      .trim();

    // Resolve connection for this shop (required for Order.connectionId)
    // Try exact match first, then case-insensitive
    let conn = await prisma.connection.findFirst({
      where: {
        type: 'SHOPIFY' as any,
        shopDomain: normalizedShop,
      },
      select: { id: true },
    });

    // If not found, try case-insensitive search by fetching all and filtering
    if (!conn) {
      const allConnections = await prisma.connection.findMany({
        where: { type: 'SHOPIFY' as any },
        select: { id: true, shopDomain: true },
      });
      conn =
        allConnections.find(
          (c: { id: string; shopDomain: string | null }) =>
            c.shopDomain?.toLowerCase() === normalizedShop.toLowerCase(),
        ) || null;
    }

    if (!conn) {
      // If no connection found for this shop, skip persistence safely
      console.error(
        '[Shopify Webhook] ❌ No connection found for shop:',
        normalizedShop,
        'topic:',
        topic,
        '\nAvailable connections:',
        await prisma.connection
          .findMany({
            where: { type: 'SHOPIFY' as any },
            select: { shopDomain: true },
          })
          .then((conns: Array<{ shopDomain: string | null }>) =>
            conns.map((c) => c.shopDomain),
          ),
      );
      await logEvent('shopify.webhook.no_connection', {
        shop: normalizedShop,
        topic,
      });
      return NextResponse.json({
        ok: true,
        ignored: true,
        error: 'no_connection',
      });
    }

    if (topic === 'orders/create') {
      const order = json;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);

      console.log('[Shopify Webhook] Saving order:', {
        shopifyId: String(order.id),
        name: order.name,
        shop: normalizedShop,
        totalCents,
      });

      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: conn.id,
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: 'CREATED',
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
        },
        update: {
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: 'CREATED',
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
        },
      });

      console.log(
        '[Shopify Webhook] Order saved successfully:',
        String(order.id),
      );
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
    console.error('[Shopify Webhook] ❌ Error persisting webhook:', {
      topic,
      shop,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    await logEvent('shopify.webhook.persist.error', {
      topic,
      shop,
      err: String(err),
    });
  }
  // Note: Webhook idempotency is already handled at the start with SETNX
  // No need to set again here - it was already set if this webhook is new
  return NextResponse.json({ ok: true });
}
