import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
// Ensure we get fresh request body (no caching)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Get headers and secret first for debugging
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';
  const shop = req.headers.get('x-shopify-shop-domain') ?? '';
  const webhookId = req.headers.get('x-shopify-webhook-id');

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

      let customerName: string | null = null;
      if (order.customer) {
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        if (first || last) {
          customerName = `${first} ${last}`.trim();
        }
      }

      if (!customerName && order.billing_address) {
        customerName =
          order.billing_address.name ||
          `${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`.trim() ||
          null;
      }

      if (!customerName && order.shipping_address) {
        customerName =
          order.shipping_address.name ||
          `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim() ||
          null;
      }

      console.log('[Shopify Webhook] Saving order:', {
        shopifyId: String(order.id),
        name: order.name,
        shop: normalizedShop,
        totalCents,
        customerName,
      });

      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: conn.id,
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: (order.financial_status || 'PENDING').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'UNFULFILLED'
          ).toUpperCase(),
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
          customerName,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          statusUpdatedAt: order.updated_at
            ? new Date(order.updated_at)
            : new Date(),
        },
        update: {
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: (order.financial_status || 'PENDING').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'UNFULFILLED'
          ).toUpperCase(),
          email: order.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
          customerName,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          statusUpdatedAt: order.updated_at
            ? new Date(order.updated_at)
            : new Date(),
        },
      });

      console.log(
        '[Shopify Webhook] Order saved successfully:',
        String(order.id),
      );
    } else if (topic === 'orders/updated') {
      const order = json;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);

      let customerName: string | null = null;
      if (order.customer) {
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        if (first || last) {
          customerName = `${first} ${last}`.trim();
        }
        // Fallback to default_address in customer object
        if (!customerName && order.customer.default_address) {
          const def = order.customer.default_address;
          customerName =
            def.name ||
            `${def.first_name || ''} ${def.last_name || ''}`.trim() ||
            def.company ||
            null;
        }
      }

      if (!customerName && order.billing_address) {
        customerName =
          order.billing_address.name ||
          `${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`.trim() ||
          null;
      }

      if (!customerName && order.shipping_address) {
        customerName =
          order.shipping_address.name ||
          `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim() ||
          null;
      }

      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: conn.id,
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: (order.financial_status || 'PENDING').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'UNFULFILLED'
          ).toUpperCase(),
          email:
            order.email ?? order.contact_email ?? order.customer?.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
          customerName,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          statusUpdatedAt: order.updated_at
            ? new Date(order.updated_at)
            : new Date(),
        },
        update: {
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: (order.financial_status || 'PENDING').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'UNFULFILLED'
          ).toUpperCase(),
          email:
            order.email ?? order.contact_email ?? order.customer?.email ?? null,
          totalAmount: Number.isFinite(totalCents) ? totalCents : 0,
          customerName,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          statusUpdatedAt: order.updated_at
            ? new Date(order.updated_at)
            : new Date(),
        },
      });
    } else if (topic === 'orders/fulfilled') {
      const order = json;
      await prisma.order.updateMany({
        where: { shopifyId: String(order.id) },
        data: {
          fulfillmentStatus: 'FULFILLED',
          statusUpdatedAt: new Date(),
        },
      });
    } else if (topic === 'refunds/create') {
      const refund = json;
      await prisma.order.updateMany({
        where: { shopifyId: String(refund.order_id) },
        data: {
          status: 'REFUNDED',
          statusUpdatedAt: new Date(),
        },
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
