import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { decryptSecure, ShopifyClient } from '@ai-ecom/api';
import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth'; // Assumption: standard next-auth setup

// Helper for quick debug authentication
async function isAuthenticated(req: NextRequest) {
  const debugSecret = process.env.DEBUG_API_SECRET;
  // 1. Check Header
  if (debugSecret && req.headers.get('x-debug-secret') === debugSecret) {
    return true;
  }

  // 2. Check Query Param (for easy browser access)
  const searchParams = req.nextUrl.searchParams;
  if (debugSecret && searchParams.get('secret') === debugSecret) {
    return true;
  }

  // TODO: Add session check if needed, but for now secret is safer for quick debug
  return false;
}

export async function GET(req: NextRequest) {
  // 1. Auth Check
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const targetShop = searchParams.get('shop');

  try {
    // 2. Find Connection
    let connection;
    if (targetShop) {
      connection = await prisma.connection.findFirst({
        where: {
          type: 'SHOPIFY' as any,
          shopDomain: { contains: targetShop, mode: 'insensitive' },
        },
      });
    } else {
      // Default to first found if no shop specified
      connection = await prisma.connection.findFirst({
        where: { type: 'SHOPIFY' as any },
      });
    }

    if (!connection) {
      return NextResponse.json(
        { error: 'No Shopify connection found' },
        { status: 404 },
      );
    }

    // 3. Decrypt Token
    // Note: We need to handle if decryptSecure is not available in this scope or path.
    // Since this file is in apps/web, it might fail to import from @ai-ecom/api/src/crypto if exports map blocks it.
    // We'll try to use the imported function.
    let accessToken = '';
    try {
      accessToken = decryptSecure(connection.accessToken);
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to decrypt token', details: String(e) },
        { status: 500 },
      );
    }

    const metadata = (connection.metadata as any) || {};
    const subdomain = metadata.subdomain;
    // Handle custom app vs oauth
    const shopUrl =
      metadata.connectionMethod === 'custom_app' && subdomain
        ? `https://${subdomain}.myshopify.com`
        : `https://${connection.shopDomain}`;

    // 4. Fetch Orders
    const client = new ShopifyClient(shopUrl, accessToken);
    const orders = await client.getOrders(5, { includeHistorical: true });

    // 5. Return Debug Data
    const debugData = orders.map((order) => ({
      id: order.id,
      name: order.name,
      email: order.email,
      contact_email: order.contact_email,
      customer_obj: order.customer,
      billing_address: order.billing_address,
      shipping_address: order.shipping_address,
      raw_customer_name: order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`
        : null,
    }));

    return NextResponse.json({
      shop: shopUrl,
      count: orders.length,
      orders: debugData,
    });
  } catch (error) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
