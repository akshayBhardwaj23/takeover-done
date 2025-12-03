import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { decryptSecure } from '@ai-ecom/api';

// Vercel Cron runs this endpoint every 2 hours
// This catches any orders that might have been missed by webhooks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Pro plan

// Verify the request is from Vercel Cron
function verifyCronRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow all requests
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // If CRON_SECRET is set, verify it
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Vercel automatically adds this header for cron jobs
  const vercelCronHeader = req.headers.get('x-vercel-cron');
  return vercelCronHeader === '1';
}

export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronRequest(req)) {
    console.log('[Cron Sync] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron Sync] Starting scheduled Shopify order sync...');
  const startTime = Date.now();

  try {
    // Get all active Shopify connections with custom_app method
    const connections = await prisma.connection.findMany({
      where: {
        type: 'SHOPIFY',
      },
      select: {
        id: true,
        shopDomain: true,
        userId: true,
        metadata: true,
      },
    });

    console.log(`[Cron Sync] Found ${connections.length} Shopify connections`);

    const results: Array<{
      shop: string;
      synced: number;
      errors: number;
      skipped?: string;
    }> = [];

    // Process each connection
    for (const conn of connections) {
      const metadata = (conn.metadata as Record<string, unknown>) || {};

      // Skip non-custom-app connections (they don't have API access)
      if (metadata.connectionMethod !== 'custom_app') {
        console.log(
          `[Cron Sync] Skipping ${conn.shopDomain} - not a custom app connection`,
        );
        results.push({
          shop: conn.shopDomain || 'unknown',
          synced: 0,
          errors: 0,
          skipped: 'not_custom_app',
        });
        continue;
      }

      // Get API credentials
      const encryptedToken = metadata.encryptedAccessToken as string | undefined;
      if (!encryptedToken) {
        console.log(
          `[Cron Sync] Skipping ${conn.shopDomain} - no access token`,
        );
        results.push({
          shop: conn.shopDomain || 'unknown',
          synced: 0,
          errors: 0,
          skipped: 'no_token',
        });
        continue;
      }

      let accessToken: string;
      try {
        accessToken = decryptSecure(encryptedToken);
      } catch (err) {
        console.error(
          `[Cron Sync] Failed to decrypt token for ${conn.shopDomain}:`,
          err,
        );
        results.push({
          shop: conn.shopDomain || 'unknown',
          synced: 0,
          errors: 1,
          skipped: 'decrypt_failed',
        });
        continue;
      }

      // Fetch orders updated in the last 2.5 hours (slightly longer than cron interval)
      const twoAndHalfHoursAgo = new Date();
      twoAndHalfHoursAgo.setMinutes(twoAndHalfHoursAgo.getMinutes() - 150);

      try {
        const shopUrl = `https://${conn.shopDomain}`;
        const params = new URLSearchParams({
          status: 'any',
          limit: '250',
          updated_at_min: twoAndHalfHoursAgo.toISOString(),
        });

        const url = `${shopUrl}/admin/api/2024-10/orders.json?${params.toString()}`;
        const resp = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        });

        if (!resp.ok) {
          const errorText = await resp.text().catch(() => '');
          console.error(
            `[Cron Sync] Shopify API error for ${conn.shopDomain}:`,
            resp.status,
            errorText,
          );
          results.push({
            shop: conn.shopDomain || 'unknown',
            synced: 0,
            errors: 1,
            skipped: `api_error_${resp.status}`,
          });
          continue;
        }

        const json: any = await resp.json();
        const orders = json.orders || [];

        let synced = 0;
        let errors = 0;

        for (const order of orders) {
          try {
            // Determine status - check for cancellation
            let orderStatus = (order.financial_status || 'PENDING').toUpperCase();
            if (order.cancelled_at) {
              orderStatus = 'CANCELLED';
            }

            const orderData = {
              name: order.name || null,
              email: order.email || order.customer?.email || null,
              totalAmount: Math.round(
                parseFloat(order.total_price || '0') * 100,
              ),
              status: orderStatus,
              fulfillmentStatus: (
                order.fulfillment_status || 'UNFULFILLED'
              ).toUpperCase(),
              shopDomain: conn.shopDomain,
              customerName: order.customer
                ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() ||
                  null
                : null,
              processedAt: order.processed_at
                ? new Date(order.processed_at)
                : null,
              statusUpdatedAt: order.updated_at
                ? new Date(order.updated_at)
                : new Date(),
            };

            await prisma.order.upsert({
              where: { shopifyId: order.id.toString() },
              create: {
                shopifyId: order.id.toString(),
                connectionId: conn.id,
                ...orderData,
              },
              update: orderData,
            });

            synced++;
          } catch (err) {
            console.error(
              `[Cron Sync] Failed to sync order ${order.id} for ${conn.shopDomain}:`,
              err,
            );
            errors++;
          }
        }

        console.log(
          `[Cron Sync] ${conn.shopDomain}: synced ${synced}/${orders.length} orders, ${errors} errors`,
        );
        results.push({
          shop: conn.shopDomain || 'unknown',
          synced,
          errors,
        });
      } catch (err) {
        console.error(`[Cron Sync] Error processing ${conn.shopDomain}:`, err);
        results.push({
          shop: conn.shopDomain || 'unknown',
          synced: 0,
          errors: 1,
          skipped: 'exception',
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    console.log(
      `[Cron Sync] Completed in ${duration}ms. Total: ${totalSynced} synced, ${totalErrors} errors`,
    );

    return NextResponse.json({
      ok: true,
      duration: `${duration}ms`,
      connections: connections.length,
      totalSynced,
      totalErrors,
      results,
    });
  } catch (error) {
    console.error('[Cron Sync] Fatal error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

