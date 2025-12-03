import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';
import { decryptSecure } from '@ai-ecom/api';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
// Ensure we get fresh request body (no caching)
export const dynamic = 'force-dynamic';

// ============================================================================
// Types for Shopify webhook payloads
// ============================================================================

interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  province_code?: string;
  country?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
}

interface ShopifyCustomer {
  id: number;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  orders_count?: number;
  total_spent?: string;
  accepts_marketing?: boolean;
  default_address?: ShopifyAddress;
}

interface ShopifyOrderPayload {
  id: number;
  name?: string;
  email?: string;
  contact_email?: string;
  total_price?: string;
  currency?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  processed_at?: string;
  updated_at?: string;
  customer?: ShopifyCustomer;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
}

// ============================================================================
// Helper: Extract and upsert Customer from webhook payload
// ============================================================================

async function upsertCustomerFromWebhook(
  order: ShopifyOrderPayload,
  connectionId: string,
): Promise<string | null> {
  const customer = order.customer;

  if (!customer?.id) {
    return null;
  }

  const shopifyCustomerId = String(customer.id);
  const address =
    order.shipping_address || order.billing_address || customer.default_address;
  const totalSpentCents = customer.total_spent
    ? Math.round(parseFloat(customer.total_spent) * 100)
    : 0;

  try {
    const upsertedCustomer = await prisma.customer.upsert({
      where: { shopifyId: shopifyCustomerId },
      create: {
        shopifyId: shopifyCustomerId,
        connectionId,
        email: customer.email || order.email || order.contact_email || null,
        phone: customer.phone || address?.phone || null,
        firstName: customer.first_name || address?.first_name || null,
        lastName: customer.last_name || address?.last_name || null,
        address1: address?.address1 || null,
        address2: address?.address2 || null,
        city: address?.city || null,
        province: address?.province || null,
        provinceCode: address?.province_code || null,
        country: address?.country || null,
        countryCode: address?.country_code || null,
        zip: address?.zip || null,
        company: address?.company || null,
        ordersCount: customer.orders_count || 1,
        totalSpent: totalSpentCents,
        acceptsMarketing: customer.accepts_marketing || false,
      },
      update: {
        email:
          customer.email || order.email || order.contact_email || undefined,
        phone: customer.phone || address?.phone || undefined,
        firstName: customer.first_name || address?.first_name || undefined,
        lastName: customer.last_name || address?.last_name || undefined,
        address1: address?.address1 || undefined,
        address2: address?.address2 || undefined,
        city: address?.city || undefined,
        province: address?.province || undefined,
        provinceCode: address?.province_code || undefined,
        country: address?.country || undefined,
        countryCode: address?.country_code || undefined,
        zip: address?.zip || undefined,
        company: address?.company || undefined,
        ordersCount: customer.orders_count || undefined,
        totalSpent: totalSpentCents || undefined,
        acceptsMarketing: customer.accepts_marketing,
      },
    });

    return upsertedCustomer.id;
  } catch (err) {
    console.error('[Shopify Webhook Token] Failed to upsert customer:', err);
    return null;
  }
}

// ============================================================================
// Helper: Extract customer name from order data
// ============================================================================

function extractCustomerName(order: ShopifyOrderPayload): string | null {
  if (order.customer) {
    const first = order.customer.first_name || '';
    const last = order.customer.last_name || '';
    if (first || last) {
      return `${first} ${last}`.trim();
    }
    if (order.customer.default_address) {
      const def = order.customer.default_address;
      const name =
        def.name ||
        `${def.first_name || ''} ${def.last_name || ''}`.trim() ||
        def.company;
      if (name) return name;
    }
  }

  if (order.billing_address) {
    const name =
      order.billing_address.name ||
      `${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`.trim();
    if (name) return name;
  }

  if (order.shipping_address) {
    const name =
      order.shipping_address.name ||
      `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim();
    if (name) return name;
  }

  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const webhookToken = params.token;
  if (!webhookToken) {
    return NextResponse.json(
      { error: 'Missing webhook token' },
      { status: 400 },
    );
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
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';
  const shop = req.headers.get('x-shopify-shop-domain') ?? '';

  // Read raw body as text
  const payload = await req.text();

  // Get API secret - prefer per-connection, fallback to env
  const metadata = (connection.metadata as Record<string, unknown>) || {};
  const encryptedApiSecret = metadata.encryptedApiSecret as string | undefined;

  let secret: string | null = null;
  if (encryptedApiSecret) {
    try {
      secret = decryptSecure(encryptedApiSecret);
      console.log('[Shopify Webhook Token] Using per-connection API secret');
    } catch (err) {
      console.error(
        '[Shopify Webhook Token] Failed to decrypt per-connection secret:',
        err,
      );
    }
  }
  if (!secret) {
    secret = process.env.SHOPIFY_API_SECRET || null;
    if (secret) {
      console.log('[Shopify Webhook Token] Using env SHOPIFY_API_SECRET');
    }
  }

  // Verify HMAC if secret is available
  if (secret && hmac) {
    const digest = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    if (digest !== hmac) {
      console.error('[Shopify Webhook Token] ❌ Invalid HMAC');
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
    }
  }

  // Update last webhook received timestamp
  const existingMetadata =
    (connection.metadata as Record<string, unknown>) || {};
  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      metadata: {
        ...existingMetadata,
        lastWebhookReceived: new Date().toISOString(),
      },
    },
  });

  await logEvent(
    'shopify.webhook',
    { topic, shop },
    'connection',
    connection.id,
  );

  // Handle app uninstall
  if (topic === 'app/uninstalled') {
    try {
      await prisma.connection.delete({
        where: { id: connection.id },
      });
      await logEvent(
        'shopify.app.uninstalled',
        { shop },
        'connection',
        connection.id,
      );
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

    if (topic === 'orders/create' || topic === 'orders/updated') {
      const order = json as ShopifyOrderPayload;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);
      const customerName = extractCustomerName(order);

      // Upsert customer with full PII from webhook payload
      const customerId = await upsertCustomerFromWebhook(order, connection.id);

      console.log(`[Shopify Webhook Token] Processing ${topic}:`, {
        shopifyId: String(order.id),
        name: order.name,
        customerId,
      });

      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: connection.id,
          customerId,
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
          customerId,
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
