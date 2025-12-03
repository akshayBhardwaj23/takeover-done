import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';
import { decryptSecure } from '@ai-ecom/api';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';
// Ensure we get fresh request body (no caching)
export const dynamic = 'force-dynamic';

// ============================================================================
// Helper: Get API secret for a shop (per-connection or fallback to env)
// ============================================================================

async function getApiSecretForShop(shopDomain: string): Promise<string | null> {
  // Normalize shop domain
  const normalizedShop = shopDomain
    .replace(/^https?:\/\//, '')
    .toLowerCase()
    .trim();

  // Try to find connection with stored API secret
  const connection = await prisma.connection.findFirst({
    where: {
      type: 'SHOPIFY' as any,
      shopDomain: normalizedShop,
    },
    select: {
      metadata: true,
    },
  });

  // If connection has encrypted API secret, use it
  const metadata = (connection?.metadata as Record<string, unknown>) || {};
  const encryptedApiSecret = metadata.encryptedApiSecret as string | undefined;

  if (encryptedApiSecret) {
    try {
      const decrypted = decryptSecure(encryptedApiSecret);
      if (decrypted) {
        console.log(
          '[Shopify Webhook] Using per-connection API secret for:',
          normalizedShop,
        );
        return decrypted;
      }
    } catch (err) {
      console.error(
        '[Shopify Webhook] Failed to decrypt per-connection secret:',
        err,
      );
    }
  }

  // Fallback to environment variable
  const envSecret = process.env.SHOPIFY_API_SECRET;
  if (envSecret) {
    console.log(
      '[Shopify Webhook] Using env SHOPIFY_API_SECRET for:',
      normalizedShop,
    );
    return envSecret;
  }

  return null;
}

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
  cancelled_at?: string | null; // Timestamp when order was cancelled
  cancel_reason?: string | null; // Reason for cancellation (customer, fraud, inventory, declined, other)
  customer?: ShopifyCustomer;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
}

// ============================================================================
// Helper: Extract and upsert Customer from webhook payload
// Webhooks contain full PII that Admin API redacts for non-embedded apps
// ============================================================================

async function upsertCustomerFromWebhook(
  order: ShopifyOrderPayload,
  connectionId: string,
): Promise<string | null> {
  // Customer data can come from order.customer or addresses
  const customer = order.customer;

  if (!customer?.id) {
    // No customer data available (guest checkout or missing data)
    return null;
  }

  const shopifyCustomerId = String(customer.id);

  // Extract address - prefer shipping, fall back to billing, then default_address
  const address =
    order.shipping_address || order.billing_address || customer.default_address;

  // Calculate total spent in cents
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
        // Update PII on every webhook - ensures we have latest data
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

    console.log('[Shopify Webhook] Customer upserted:', {
      customerId: upsertedCustomer.id,
      shopifyId: shopifyCustomerId,
      email: upsertedCustomer.email,
      hasPhone: !!upsertedCustomer.phone,
      hasAddress: !!upsertedCustomer.address1,
    });

    return upsertedCustomer.id;
  } catch (err) {
    console.error('[Shopify Webhook] Failed to upsert customer:', {
      shopifyCustomerId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't fail the webhook - customer data is supplementary
    return null;
  }
}

// ============================================================================
// Helper: Extract customer name from order data
// ============================================================================

function extractCustomerName(order: ShopifyOrderPayload): string | null {
  // Try customer object first
  if (order.customer) {
    const first = order.customer.first_name || '';
    const last = order.customer.last_name || '';
    if (first || last) {
      return `${first} ${last}`.trim();
    }
    // Fallback to default_address in customer object
    if (order.customer.default_address) {
      const def = order.customer.default_address;
      const name =
        def.name ||
        `${def.first_name || ''} ${def.last_name || ''}`.trim() ||
        def.company;
      if (name) return name;
    }
  }

  // Try billing address
  if (order.billing_address) {
    const name =
      order.billing_address.name ||
      `${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`.trim();
    if (name) return name;
  }

  // Try shipping address
  if (order.shipping_address) {
    const name =
      order.shipping_address.name ||
      `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim();
    if (name) return name;
  }

  return null;
}

export async function POST(req: NextRequest) {
  // Get headers first
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';
  const shop = req.headers.get('x-shopify-shop-domain') ?? '';
  const webhookId = req.headers.get('x-shopify-webhook-id');

  // Read raw body as text BEFORE any other processing
  // Important: Must read body first as it can only be read once
  const payload = await req.text();
  const payloadLength = payload.length;

  // Get API secret for this shop (per-connection or env fallback)
  const secret = await getApiSecretForShop(shop);

  // Debug logging
  console.log('[Shopify Webhook] Received webhook:', {
    shop,
    topic,
    webhookId,
    hmacPresent: !!hmac,
    hmacPrefix: hmac.substring(0, 10) + '...',
    secretPresent: !!secret,
    secretLength: secret?.length ?? 0,
    secretSource: secret ? 'found' : 'missing',
  });

  if (!secret) {
    console.error('[Shopify Webhook] ❌ No API secret found for shop:', shop);
    return NextResponse.json(
      { error: 'Missing secret for shop' },
      { status: 500 },
    );
  }

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

    if (topic === 'orders/create' || topic === 'orders/updated') {
      const order = json as ShopifyOrderPayload;
      const totalCents = Math.round(Number(order.total_price || '0') * 100);
      const customerName = extractCustomerName(order);

      // Upsert customer with full PII from webhook payload
      // This is the key advantage of webhooks - they contain unredacted customer data
      const customerId = await upsertCustomerFromWebhook(order, conn.id);

      // Determine order status - check for cancellation first
      // If cancelled_at is set, the order is cancelled regardless of financial_status
      let orderStatus = (order.financial_status || 'PENDING').toUpperCase();
      if (order.cancelled_at) {
        orderStatus = 'CANCELLED';
      }

      console.log(`[Shopify Webhook] Processing ${topic}:`, {
        shopifyId: String(order.id),
        name: order.name,
        shop: normalizedShop,
        totalCents,
        customerName,
        customerId,
        hasCustomerData: !!order.customer,
        isCancelled: !!order.cancelled_at,
        cancelReason: order.cancel_reason,
      });

      await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          connectionId: conn.id,
          customerId, // Link to Customer record with full PII
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: orderStatus,
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
          customerId, // Update customer link on order updates
          name: order.name || null,
          shopDomain: normalizedShop || null,
          status: orderStatus, // Uses CANCELLED if cancelled_at is set
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

      console.log(
        `[Shopify Webhook] Order ${topic === 'orders/create' ? 'created' : 'updated'} successfully:`,
        String(order.id),
      );
    } else if (topic === 'orders/fulfilled') {
      const order = json;
      await prisma.order.updateMany({
        where: { shopifyId: String(order.id) },
        data: {
          fulfillmentStatus: 'FULFILLED',
          statusUpdatedAt: new Date(),
        },
      });
    } else if (topic === 'orders/cancelled') {
      // Handle order cancellation
      const order = json;
      const cancelReason = order.cancel_reason || 'unknown';

      console.log('[Shopify Webhook] Order cancelled:', {
        shopifyId: String(order.id),
        cancelReason,
        cancelledAt: order.cancelled_at,
      });

      await prisma.order.updateMany({
        where: { shopifyId: String(order.id) },
        data: {
          status: 'CANCELLED',
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
