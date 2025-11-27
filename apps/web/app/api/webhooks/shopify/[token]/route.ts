import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
// Ensure we get fresh request body (no caching)
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const webhookToken = params.token;
  if (!webhookToken) {
    return NextResponse.json({ error: 'Missing webhook token' }, { status: 400 });
  }


  // Find connection by webhook token
  const connection = await prisma.connection.findFirst({
    where: {
      type: 'SHOPIFY' as any,
      metadata: {
        path: ['webhookToken'],
        equals: webhookToken,
      } as any,
    },
    select: {
      id: true,
      shopDomain: true,
      userId: true,
      metadata: true,
    },
  });

  if (!connection) {
    console.error(
      '[Shopify Webhook] ❌ No connection found for webhook token:',
      webhookToken,
    );
    await logEvent('shopify.webhook.no_connection_token', {
      webhookToken,
    });
    return NextResponse.json({
      ok: true,
      ignored: true,
      error: 'no_connection',
    });
  }

  // Get headers
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';
  const shop = req.headers.get('x-shopify-shop-domain') ?? '';

  // Read raw body as text
  const payload = await req.text();

  // Verify HMAC if secret is available
  if (secret && hmac) {
    const digest = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    if (digest !== hmac) {
      console.error('[Shopify Webhook] ❌ Invalid HMAC');
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
    }
  }

  // Update last webhook received timestamp
  const existingMetadata = (connection.metadata as Record<string, unknown>) || {};
  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      metadata: {
        ...existingMetadata,
        lastWebhookReceived: new Date().toISOString(),
      },
    },
  });

  await logEvent('shopify.webhook', { topic, shop }, 'connection', connection.id);

  // Handle app uninstall
  if (topic === 'app/uninstalled') {
    try {
      await prisma.connection.delete({
        where: { id: connection.id },
      });
      await logEvent('shopify.app.uninstalled', { shop }, 'connection', connection.id);
    } catch (err) {
      await logEvent('shopify.app.uninstalled.error', {
        shop,
        err: String(err),
      });
    }
    return NextResponse.json({ ok: true, removed: true });
  }

  // Process webhook data
  try {
    const json = JSON.parse(payload);
    const normalizedShop = shop
      .replace(/^https?:\/\//, '')
      .toLowerCase()
      .trim();

    if (topic === 'orders/create') {
      const order = json;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);

      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: connection.id,
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
    console.error('[Shopify Webhook] ❌ Error processing webhook:', {
      topic,
      shop,
      error: err instanceof Error ? err.message : String(err),
    });
    await logEvent('shopify.webhook.process.error', {
      topic,
      shop,
      err: String(err),
    });
  }

  return NextResponse.json({ ok: true });
}

