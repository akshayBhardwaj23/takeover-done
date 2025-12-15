import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  prisma,
  logEvent,
  getUsageSummary,
  getUsageHistory,
  canSendEmail,
  canUseAI,
  PLAN_LIMITS,
  ensureSubscription,
  incrementEmailSent,
  incrementAISuggestion,
} from '@ai-ecom/db';
import {
  getOrCreateCustomer,
  createSubscription as createRazorpaySubscription,
  getSubscription,
  cancelSubscription as cancelRazorpaySubscription,
} from './payments/razorpay';
import { getRazorpayPlanConfig } from './payments/planMapping';
import {
  detectCurrency,
  getPlanPrice,
  formatPrice,
  PLAN_PRICING,
  type Currency,
} from './payments/currency';

// Helper function to build signature block, avoiding duplication
function buildSignatureBlock(storeName: string): string {
  // If store name is generic/fallback values, just use "Support Team"
  const genericNames = ['Support', 'Your Store', 'Store', 'Shop'];
  const normalizedName = storeName.trim();

  if (genericNames.includes(normalizedName)) {
    return 'Support Team';
  }

  // If store name already contains "Support", just use the store name
  if (normalizedName.toLowerCase().includes('support')) {
    return normalizedName;
  }

  // Otherwise, use "[Store Name] Support Team"
  return `${normalizedName} Support Team`;
}
import { decryptSecure, encryptSecure } from './crypto';
import crypto from 'node:crypto';
import {
  sanitizeLimited,
  safeEmail,
  safeShopDomain,
  clampNumber,
} from './validation';
import {
  listGA4Properties,
  fetchGA4Analytics,
  type GA4Property,
} from './google-analytics';
import {
  listAdAccounts,
  fetchMetaAdsInsights,
  updateCampaignStatus,
  updateAdSetStatus,
  updateCampaignBudget,
  createOptimizedAdSet,
  type MetaAdAccount,
  type MetaAdsInsights,
} from './meta-ads';

import { ShopifyClient } from './services/shopify';
export { ShopifyClient } from './services/shopify';
type Context = {
  session: any;
  userId: string | null;
};

const t = initTRPC.context<Context>().create();

// Rate limit helper (simplified for API package)
// Note: Actual rate limiting happens in the web app middleware
// This is a fallback check
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkSimpleRateLimit(
  userId: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const key = userId;
  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Middleware to check if user is authenticated
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

// Rate limit middleware for general API calls (100 req/min)
const withRateLimit = t.middleware(async ({ ctx, next }) => {
  if (ctx.userId) {
    const allowed = checkSimpleRateLimit(ctx.userId, 100, 60000);
    if (!allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.',
      });
    }
  }
  return next();
});

// Rate limit middleware for AI operations (10 req/min)
const withAIRateLimit = t.middleware(async ({ ctx, next }) => {
  if (ctx.userId) {
    const allowed = checkSimpleRateLimit(`ai:${ctx.userId}`, 10, 60000);
    if (!allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message:
          'AI rate limit exceeded. Please wait before generating more suggestions.',
      });
    }
  }
  return next();
});

// Public procedure (no authentication required)
const publicProcedure = t.procedure;

// Protected procedure (authentication + rate limiting)
const protectedProcedure = t.procedure.use(isAuthenticated).use(withRateLimit);

// AI procedure (authentication + AI rate limiting)
const aiProcedure = t.procedure.use(isAuthenticated).use(withAIRateLimit);

const STORE_DEFAULT_NAME = 'Your Store';

function normalizeStoreNameFromDomain(domain?: string | null): string | null {
  if (!domain) return null;
  const withoutSuffix = domain.replace(/\.myshopify\.com$/i, '');
  const cleaned = withoutSuffix.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractStoreNameFromMetadata(metadata: unknown): string | null {
  if (
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    'storeName' in metadata
  ) {
    const value = (metadata as { storeName?: unknown }).storeName;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

async function resolveStoreName(
  userId: string | null,
  orderId?: string | null,
): Promise<string> {
  if (!userId) return STORE_DEFAULT_NAME;

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { shopifyId: orderId },
      include: {
        connection: {
          select: { metadata: true, shopDomain: true, userId: true },
        },
      },
    });
    if (order?.connection && order.connection.userId === userId) {
      const nameFromMetadata = extractStoreNameFromMetadata(
        order.connection.metadata,
      );
      if (nameFromMetadata) return nameFromMetadata;
      const normalized = normalizeStoreNameFromDomain(
        order.connection.shopDomain,
      );
      if (normalized) return normalized;
    }
  }

  const connection = await prisma.connection.findFirst({
    where: { userId, type: 'SHOPIFY' },
    orderBy: { createdAt: 'asc' },
    select: { metadata: true, shopDomain: true },
  });

  if (connection) {
    const nameFromMetadata = extractStoreNameFromMetadata(connection.metadata);
    if (nameFromMetadata) return nameFromMetadata;
    const normalized = normalizeStoreNameFromDomain(connection.shopDomain);
    if (normalized) return normalized;
  }

  return STORE_DEFAULT_NAME;
}

/**
 * Get Shopify API credentials from connection
 * Supports both OAuth tokens and custom app credentials
 */
async function getShopifyApiCredentials(
  connectionId: string,
  userId: string,
): Promise<{ shopUrl: string; accessToken: string } | null> {
  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      userId,
      type: 'SHOPIFY',
    },
    select: {
      shopDomain: true,
      accessToken: true,
      metadata: true,
    },
  });

  if (!connection) return null;

  const metadata = (connection.metadata as Record<string, unknown>) || {};
  const subdomain = metadata.subdomain as string | undefined;
  const connectionMethod = metadata.connectionMethod as string | undefined;

  // If custom app connection, use subdomain
  if (connectionMethod === 'custom_app' && subdomain) {
    const accessToken = decryptSecure(connection.accessToken);
    return {
      shopUrl: `https://${subdomain}.myshopify.com`,
      accessToken,
    };
  }

  // Otherwise, use OAuth token with shop domain
  if (connection.shopDomain) {
    const accessToken = decryptSecure(connection.accessToken);
    return {
      shopUrl: `https://${connection.shopDomain}`,
      accessToken,
    };
  }

  return null;
}

function ensureSignature(text: string, signatureBlock: string): string {
  const trimmedSignature = signatureBlock.trim();
  if (!trimmedSignature) return text;

  // Remove any placeholder text patterns
  let cleanedText = text
    .replace(/\[Your Name\]/gi, '')
    .replace(/\[Your Company\]/gi, '')
    .replace(/\[Your Contact Information\]/gi, '')
    .replace(/\[Store Name\]/gi, '')
    .trim();

  const normalizedText = cleanedText.toLowerCase().replace(/\s+/g, ' ');
  const normalizedSignature = trimmedSignature
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (normalizedText.includes(normalizedSignature)) {
    return cleanedText;
  }
  const requiredSignature = `Warm Regards,\n\n${trimmedSignature}`;
  const trimmed = cleanedText.trimEnd();
  const separator = trimmed.endsWith('\n') ? '' : '\n\n';
  return `${trimmed}${separator}${requiredSignature}`;
}

/**
 * Format original email as quoted text for email threading
 * This appends the original customer email at the bottom of the reply
 */
function formatEmailWithQuotedOriginal(
  replyBody: string,
  originalFrom: string,
  originalDate: Date,
  originalBody: string,
): string {
  // Format the date nicely
  const dateStr = originalDate.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format quoted text (prefix each line with >)
  const quotedLines = originalBody
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  // Combine reply with quoted original
  return `${replyBody.trimEnd()}

---

On ${dateStr}, ${originalFrom} wrote:

${quotedLines}`;
}

export { encryptSecure, decryptSecure } from './crypto';

async function syncShopifyData(connectionId: string, userId: string) {
  try {
    console.log(
      `[Shopify Sync] Starting sync for connectionId: ${connectionId}, userId: ${userId}`,
    );

    const credentials = await getShopifyApiCredentials(connectionId, userId);
    if (!credentials) {
      console.log(
        `[Shopify Sync] No credentials found for connectionId: ${connectionId}`,
      );
      return;
    }

    const client = new ShopifyClient(
      credentials.shopUrl,
      credentials.accessToken,
    );

    // Fetch last 100 orders on initial sync (including historical orders beyond 60 days)
    const orders = await client.getOrders(100, { includeHistorical: true });
    console.log(
      `[Shopify Sync] Fetched ${orders.length} orders from Shopify API for ${credentials.shopUrl}`,
    );

    for (const order of orders) {
      const totalAmount = Math.round(parseFloat(order.total_price) * 100); // Convert to cents

      let customerName: string | null = null;

      // Debug log for customer data
      console.log(`[Shopify Sync] Processing order ${order.id}:`, {
        hasCustomer: !!order.customer,
        hasBilling: !!order.billing_address,
        hasShipping: !!order.shipping_address,
        email: order.email,
        contactEmail: order.contact_email,
        customerEmail: order.customer?.email,
      });

      if (order.customer) {
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        if (first || last) {
          customerName = `${first} ${last}`.trim();
        }

        // Try to extract from default address in customer object if first/last name is empty
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

      const upsertedOrder = await prisma.order.upsert({
        where: { shopifyId: String(order.id) },
        create: {
          shopifyId: String(order.id),
          status: (order.financial_status || 'pending').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'unfulfilled'
          ).toUpperCase(),
          email: order.email || order.contact_email || order.customer?.email,
          totalAmount,
          currency: order.currency || 'INR',
          customerName,
          name: order.name,
          shopDomain: credentials.shopUrl.replace('https://', ''),
          connectionId,
          createdAt: new Date(order.created_at),
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          statusUpdatedAt: order.updated_at
            ? new Date(order.updated_at)
            : new Date(),
        },
        update: {
          status: (order.financial_status || 'pending').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'unfulfilled'
          ).toUpperCase(),
          email: order.email || order.contact_email || order.customer?.email,
          totalAmount,
          currency: order.currency || 'INR',
          customerName,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          statusUpdatedAt: order.updated_at
            ? new Date(order.updated_at)
            : new Date(),
          updatedAt: new Date(),
        },
      });

      // Sync line items if present
      if (order.line_items && order.line_items.length > 0) {
        try {
          // Delete existing line items and insert new ones (handles updates)
          await prisma.orderLineItem.deleteMany({
            where: { orderId: upsertedOrder.id },
          });

          await prisma.orderLineItem.createMany({
            data: order.line_items.map((item) => ({
              orderId: upsertedOrder.id,
              shopifyId: String(item.id),
              title: item.title,
              quantity: item.quantity,
              price: Math.round(parseFloat(item.price) * 100), // Convert to cents
              sku: item.sku || null,
              variantId: item.variant_id ? String(item.variant_id) : null,
              productId: item.product_id ? String(item.product_id) : null,
            })),
          });

          console.log(
            `[Shopify Sync] Synced ${order.line_items.length} line items for order ${order.id}`,
          );
        } catch (lineItemError: any) {
          // If OrderLineItem table doesn't exist yet, skip line items
          // This allows orders to sync even before migration is applied
          if (
            lineItemError?.code === 'P2021' ||
            lineItemError?.message?.includes('does not exist')
          ) {
            console.warn(
              `[Shopify Sync] OrderLineItem table not found, skipping line items for order ${order.id}`,
            );
          } else {
            console.error(
              `[Shopify Sync] Failed to sync line items for order ${order.id}:`,
              lineItemError,
            );
            // Don't throw - continue syncing other orders
          }
        }
      }
    }

    console.log(
      `[Shopify Sync] Successfully synced ${orders.length} orders for connectionId: ${connectionId}`,
    );

    await logEvent(
      'shopify.sync.completed',
      { count: orders.length, shop: credentials.shopUrl },
      'connection',
      connectionId,
    );
  } catch (error) {
    console.error('[Shopify Sync] Failed to sync Shopify data:', error);
    await logEvent(
      'shopify.sync.failed',
      { error: String(error) },
      'connection',
      connectionId,
    );
  }
}

const shopifyRouter = t.router({
  createWebhook: protectedProcedure
    .input(
      z.object({
        shopDomain: z.string().min(3),
        storeName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const cleanShop = safeShopDomain(input.shopDomain);
      if (!cleanShop) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid shop domain',
        });
      }

      // Check if connection already exists
      const existing = await prisma.connection.findFirst({
        where: {
          shopDomain: cleanShop,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
      });

      // If not updating existing, check store limit
      if (!existing) {
        const subscription = await ensureSubscription(ctx.userId);
        const planLimits = PLAN_LIMITS[subscription.planType];
        const storeLimit = planLimits.stores;

        // Check current store count (only if limit is not unlimited)
        if (storeLimit !== -1) {
          const currentStoreCount = await prisma.connection.count({
            where: {
              userId: ctx.userId,
              type: 'SHOPIFY',
            },
          });

          if (currentStoreCount >= storeLimit) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You've reached your store limit (${storeLimit} store${storeLimit > 1 ? 's' : ''}). Please upgrade your plan to add more stores.`,
            });
          }
        }
      }

      if (existing) {
        // Return existing webhook URL
        const webhookUrl = (existing.metadata as any)?.webhookUrl;
        if (webhookUrl) {
          return {
            connectionId: existing.id,
            webhookUrl,
            shopDomain: cleanShop,
          };
        }
      }

      // Generate unique webhook URL
      const webhookToken = crypto.randomBytes(32).toString('hex');
      // Use SHOPIFY_APP_URL if available, otherwise construct from NEXT_PUBLIC_APP_URL
      const baseUrl =
        process.env.SHOPIFY_APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://www.zyyp.ai';
      const webhookUrl = `${baseUrl}/api/webhooks/shopify/${webhookToken}`;

      const metadata: Record<string, unknown> = {
        webhookUrl,
        webhookToken,
        connectionMethod: 'webhook',
        lastWebhookReceived: null,
      };

      if (input.storeName) {
        metadata.storeName = input.storeName.trim();
      }

      const connection = existing
        ? await prisma.connection.update({
            where: { id: existing.id },
            data: {
              metadata: metadata as any,
              shopDomain: cleanShop,
            },
            select: { id: true },
          })
        : await prisma.connection.create({
            data: {
              type: 'SHOPIFY' as any,
              accessToken: encryptSecure('webhook-only'), // Placeholder, no API access
              shopDomain: cleanShop,
              userId: ctx.userId,
              metadata: metadata as any,
            },
            select: { id: true },
          });

      await logEvent(
        'shopify.webhook.connection.created',
        { shop: cleanShop },
        'connection',
        connection.id,
      );

      return {
        connectionId: connection.id,
        webhookUrl,
        shopDomain: cleanShop,
      };
    }),
  createCustomAppConnection: protectedProcedure
    .input(
      z.object({
        shopDomain: z.string().min(3),
        subdomain: z.string().min(1),
        accessToken: z.string().min(1),
        apiSecret: z.string().min(1), // API secret key for webhook HMAC verification
        storeName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const cleanShop = safeShopDomain(input.shopDomain);
      if (!cleanShop) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid shop domain',
        });
      }

      // Validate subdomain format
      const subdomain = input.subdomain.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid subdomain format',
        });
      }

      // First check if connection exists for ANY user (not just current user)
      const existingAnyUser = await prisma.connection.findFirst({
        where: {
          shopDomain: cleanShop,
          type: 'SHOPIFY',
        },
        select: { id: true, userId: true },
      });

      // If store exists and belongs to a different user, reject the connection
      if (existingAnyUser && existingAnyUser.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'This Shopify store is already connected to another account. Please ask the current owner to disconnect it first, then you can connect it to your account.',
        });
      }

      // If connection exists for current user, fetch full connection (including metadata) for update scenario
      const existing =
        existingAnyUser?.userId === ctx.userId
          ? await prisma.connection.findUnique({
              where: { id: existingAnyUser.id },
            })
          : null;

      // If not updating existing, check store limit
      if (!existing) {
        const subscription = await ensureSubscription(ctx.userId);
        const planLimits = PLAN_LIMITS[subscription.planType];
        const storeLimit = planLimits.stores;

        // Check current store count (only if limit is not unlimited)
        if (storeLimit !== -1) {
          const currentStoreCount = await prisma.connection.count({
            where: {
              userId: ctx.userId,
              type: 'SHOPIFY',
            },
          });

          if (currentStoreCount >= storeLimit) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You've reached your store limit (${storeLimit} store${storeLimit > 1 ? 's' : ''}). Please upgrade your plan to add more stores.`,
            });
          }
        }
      }

      // Verify access token by making a test API call
      try {
        const testUrl = `https://${subdomain}.myshopify.com/admin/api/2024-10/shop.json`;
        const testRes = await fetch(testUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': input.accessToken,
          },
        });

        if (!testRes.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid access token or subdomain',
          });
        }

        const shopData = (await testRes.json()) as {
          shop?: { name?: string | null };
        };
        const fetchedStoreName = shopData?.shop?.name;

        const metadata: Record<string, unknown> = {
          subdomain,
          connectionMethod: 'custom_app',
          // Store encrypted API secret for per-connection webhook HMAC verification
          encryptedApiSecret: encryptSecure(input.apiSecret),
        };

        if (input.storeName || fetchedStoreName) {
          metadata.storeName = (input.storeName || fetchedStoreName)?.trim();
        }

        const connection = existing
          ? await prisma.connection.update({
              where: { id: existing.id },
              data: {
                accessToken: encryptSecure(input.accessToken),
                shopDomain: cleanShop,
                metadata: {
                  ...((existing.metadata as Record<string, unknown>) || {}),
                  ...metadata,
                } as any,
              },
              select: { id: true },
            })
          : await prisma.connection.create({
              data: {
                type: 'SHOPIFY' as any,
                accessToken: encryptSecure(input.accessToken),
                shopDomain: cleanShop,
                userId: ctx.userId,
                metadata: metadata as any,
              },
              select: { id: true },
            });

        await logEvent(
          'shopify.custom_app.connection.created',
          { shop: cleanShop },
          'connection',
          connection.id,
        );

        // Register webhooks for real-time updates + customer PII
        // Webhooks contain unredacted customer data that Admin API doesn't provide
        const appUrl =
          process.env.SHOPIFY_APP_URL ||
          process.env.NEXTAUTH_URL ||
          'http://localhost:3000';
        const webhookUrl = `${appUrl}/api/webhooks/shopify`;

        const shopifyClient = new ShopifyClient(cleanShop, input.accessToken);
        const webhookResults = await shopifyClient
          .registerWebhooks(webhookUrl)
          .catch((err) => {
            console.error(
              '[Shopify Custom App] Failed to register webhooks:',
              err,
            );
            return [];
          });

        const successfulWebhooks = webhookResults.filter(
          (r) => r.success,
        ).length;
        console.log(
          `[Shopify Custom App] Registered ${successfulWebhooks}/${webhookResults.length} webhooks for ${cleanShop}`,
        );

        // Trigger initial sync (historical orders via Admin API)
        void syncShopifyData(connection.id, ctx.userId).catch(console.error);

        return {
          connectionId: connection.id,
          shopDomain: cleanShop,
          webhooksRegistered: successfulWebhooks,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify credentials',
        });
      }
    }),
  updateStoreName: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().min(1),
        storeName: z
          .string()
          .trim()
          .min(2, 'Store name must be at least 2 characters long')
          .max(120, 'Store name must be at most 120 characters long'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          id: input.connectionId,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }

      const trimmedName = input.storeName.trim();
      const existingMetadata =
        (connection.metadata as Record<string, unknown> | null) ?? {};

      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          metadata: {
            ...existingMetadata,
            storeName: trimmedName,
          },
        },
      });

      return { ok: true };
    }),
  syncOrders: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          id: input.connectionId,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }

      // Check if custom app connection (has API access)
      const metadata = (connection.metadata as Record<string, unknown>) || {};
      if (metadata.connectionMethod !== 'custom_app') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Order sync requires a Custom App connection with API access',
        });
      }

      // Trigger sync in background
      void syncShopifyData(connection.id, ctx.userId).catch(console.error);

      return {
        ok: true,
        message: 'Order sync started. This may take a moment.',
      };
    }),
  disconnectStore: protectedProcedure
    .input(z.object({ connectionId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          id: input.connectionId,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
        select: {
          id: true,
          shopDomain: true,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }

      const shopDomain = connection.shopDomain;

      // Delete related data in the correct order to avoid foreign key constraint violations
      // 1. Get all orders and threads for this connection
      const orders = await prisma.order.findMany({
        where: { connectionId: connection.id },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      const threads = await prisma.thread.findMany({
        where: { connectionId: connection.id },
        select: { id: true },
      });
      const threadIds = threads.map((t) => t.id);

      // 2. Get all messages for these orders and threads
      const messages = await prisma.message.findMany({
        where: {
          OR: [{ orderId: { in: orderIds } }, { threadId: { in: threadIds } }],
        },
        select: { id: true },
      });
      const messageIds = messages.map((m) => m.id);

      // 3. Delete AISuggestions (they reference Message)
      if (messageIds.length > 0) {
        await prisma.aISuggestion.deleteMany({
          where: { messageId: { in: messageIds } },
        });
      }

      // 4. Delete Actions (they reference Order)
      if (orderIds.length > 0) {
        await prisma.action.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 5. Delete Messages (they reference Order and Thread)
      if (messageIds.length > 0) {
        await prisma.message.deleteMany({
          where: { id: { in: messageIds } },
        });
      }

      // 6. Delete Orders
      if (orderIds.length > 0) {
        await prisma.order.deleteMany({
          where: { connectionId: connection.id },
        });
      }

      // 7. Delete Threads (they reference Connection)
      if (threadIds.length > 0) {
        await prisma.thread.deleteMany({
          where: { connectionId: connection.id },
        });
      }

      // 8. Finally, delete the connection
      await prisma.connection.delete({
        where: { id: connection.id },
      });

      await logEvent(
        'shopify.store.disconnected',
        { shop: shopDomain },
        'connection',
        connection.id,
      );

      return { ok: true, shopDomain };
    }),
  getWebhookUrl: protectedProcedure
    .input(z.object({ connectionId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          id: input.connectionId,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
        select: {
          id: true,
          metadata: true,
          shopDomain: true,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }

      const webhookUrl = (connection.metadata as any)?.webhookUrl;
      const lastWebhookReceived = (connection.metadata as any)
        ?.lastWebhookReceived;

      return {
        webhookUrl: webhookUrl || null,
        lastWebhookReceived: lastWebhookReceived || null,
        shopDomain: connection.shopDomain,
      };
    }),

  // ============================================================================
  // Refund and Cancel Order Mutations (via Shopify Admin API)
  // ============================================================================

  initiateRefund: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1), // Internal order ID
        amount: z.number().int().positive().optional(), // Amount in cents (optional for full refund)
        reason: z.string().max(500).optional(),
        notify: z.boolean().default(true), // Whether to send notification to customer
        lineItems: z
          .array(
            z.object({
              lineItemId: z.string(),
              quantity: z.number().int().positive(),
              restockType: z
                .enum(['no_restock', 'cancel', 'return'])
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Get the order and verify ownership
      const order = await prisma.order.findFirst({
        where: { id: input.orderId },
        include: {
          connection: {
            select: {
              id: true,
              userId: true,
              accessToken: true,
              shopDomain: true,
              metadata: true,
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Verify user owns this connection
      if (order.connection.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this order',
        });
      }

      // Check if connection has API access (custom app)
      const metadata =
        (order.connection.metadata as Record<string, unknown>) || {};
      if (metadata.connectionMethod !== 'custom_app') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Refunds require a Custom App connection with API access',
        });
      }

      // Decrypt access token and create Shopify client
      const accessToken = await decryptSecure(order.connection.accessToken);
      if (!accessToken || !order.connection.shopDomain) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid connection credentials',
        });
      }

      const client = new ShopifyClient(
        order.connection.shopDomain,
        accessToken,
      );

      // Initiate the refund via Shopify Admin API
      const result = await client.createRefund({
        orderId: order.shopifyId,
        amount: input.amount,
        reason: input.reason,
        notify: input.notify,
        lineItems: input.lineItems,
      });

      if (!result.success) {
        await logEvent(
          'shopify.refund.failed',
          {
            orderId: input.orderId,
            shopifyOrderId: order.shopifyId,
            error: result.error,
          },
          'order',
          input.orderId,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to create refund',
        });
      }

      // Update local order status (webhook will also update this)
      await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: input.amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
          statusUpdatedAt: new Date(),
        },
      });

      // Log the refund action
      await prisma.action.create({
        data: {
          orderId: input.orderId,
          type: 'REFUND',
          status: 'EXECUTED',
          payload: {
            refundId: result.refundId,
            amount: result.amount,
            reason: input.reason,
          },
          executedAt: new Date(),
        },
      });

      await logEvent(
        'shopify.refund.success',
        {
          orderId: input.orderId,
          shopifyOrderId: order.shopifyId,
          refundId: result.refundId,
          amount: result.amount,
        },
        'order',
        input.orderId,
      );

      return {
        success: true,
        refundId: result.refundId,
        amount: result.amount,
      };
    }),

  cancelOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1), // Internal order ID
        reason: z
          .enum(['customer', 'fraud', 'inventory', 'declined', 'other'])
          .default('other'),
        email: z.boolean().default(true), // Whether to send cancellation email
        restock: z.boolean().default(true), // Whether to restock items
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Get the order and verify ownership
      const order = await prisma.order.findFirst({
        where: { id: input.orderId },
        include: {
          connection: {
            select: {
              id: true,
              userId: true,
              accessToken: true,
              shopDomain: true,
              metadata: true,
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Verify user owns this connection
      if (order.connection.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this order',
        });
      }

      // Check if connection has API access (custom app)
      const metadata =
        (order.connection.metadata as Record<string, unknown>) || {};
      if (metadata.connectionMethod !== 'custom_app') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Order cancellation requires a Custom App connection with API access',
        });
      }

      // Decrypt access token and create Shopify client
      const accessToken = await decryptSecure(order.connection.accessToken);
      if (!accessToken || !order.connection.shopDomain) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid connection credentials',
        });
      }

      const client = new ShopifyClient(
        order.connection.shopDomain,
        accessToken,
      );

      // Cancel the order via Shopify Admin API
      const result = await client.cancelOrder({
        orderId: order.shopifyId,
        reason: input.reason,
        email: input.email,
        restock: input.restock,
      });

      if (!result.success) {
        await logEvent(
          'shopify.cancel.failed',
          {
            orderId: input.orderId,
            shopifyOrderId: order.shopifyId,
            error: result.error,
          },
          'order',
          input.orderId,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to cancel order',
        });
      }

      // Update local order status
      await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: 'CANCELLED',
          statusUpdatedAt: new Date(),
        },
      });

      // Log the cancel action
      await prisma.action.create({
        data: {
          orderId: input.orderId,
          type: 'CANCEL',
          status: 'EXECUTED',
          payload: {
            reason: input.reason,
            cancelledAt: result.cancelledAt,
          },
          executedAt: new Date(),
        },
      });

      await logEvent(
        'shopify.cancel.success',
        {
          orderId: input.orderId,
          shopifyOrderId: order.shopifyId,
          cancelledAt: result.cancelledAt,
        },
        'order',
        input.orderId,
      );

      return {
        success: true,
        cancelledAt: result.cancelledAt,
      };
    }),

  // Get order details including customer info from linked Customer record
  getOrderDetails: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ shopifyId: input.orderId }, { id: input.orderId }],
        },
        include: {
          connection: {
            select: { userId: true, shopDomain: true },
          },
          lineItems: true, // Included for inbox details view
          customer: true, // Include linked customer with full PII
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      if (order.connection.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      return {
        id: order.id,
        shopifyId: order.shopifyId,
        name: order.name,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
        email: order.email,
        customerName: order.customerName,
        shopDomain: order.shopDomain,
        processedAt: order.processedAt,
        statusUpdatedAt: order.statusUpdatedAt,
        lineItems: order.lineItems.map((item) => ({
          id: item.id,
          shopifyId: item.shopifyId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku,
        })),
        // Customer PII from webhooks
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
              phone: order.customer.phone,
              firstName: order.customer.firstName,
              lastName: order.customer.lastName,
              fullName:
                [order.customer.firstName, order.customer.lastName]
                  .filter(Boolean)
                  .join(' ') || null,
              address: {
                address1: order.customer.address1,
                address2: order.customer.address2,
                city: order.customer.city,
                province: order.customer.province,
                country: order.customer.country,
                zip: order.customer.zip,
                company: order.customer.company,
              },
              ordersCount: order.customer.ordersCount,
              totalSpent: order.customer.totalSpent,
              acceptsMarketing: order.customer.acceptsMarketing,
            }
          : null,
        recentActions: order.actions,
      };
    }),
});

const emailRouter = t.router({
  createAlias: protectedProcedure
    .input(
      z.object({
        userEmail: z.string().email(),
        domain: z.string().min(3),
        shop: z.string().min(3).optional(), // NOW OPTIONAL - allows standalone aliases
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const cleanEmail = safeEmail(input.userEmail);
      const domain = sanitizeLimited(input.domain, 255);

      if (!cleanEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid email address',
        });
      }

      // Get all existing aliases for this user
      const existingAliases = await prisma.connection.findMany({
        where: {
          userId: ctx.userId,
          type: 'CUSTOM_EMAIL' as any,
        },
        select: { id: true, metadata: true },
      });

      // Determine if this is a standalone or store-linked alias
      const isStandalone = !input.shop;
      let cleanShop: string | undefined;
      let shopConnection: any = null;

      if (isStandalone) {
        // STANDALONE ALIAS - Check if user already has one
        const hasStandalone = existingAliases.some(
          (a) => !(a.metadata as any)?.shopDomain,
        );

        if (hasStandalone) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'You already have a standalone email alias. Each user can have only one standalone alias.',
          });
        }
      } else {
        // STORE-LINKED ALIAS
        const shopDomainResult = safeShopDomain(input.shop);
        cleanShop = shopDomainResult || undefined;

        if (!cleanShop) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid shop domain',
          });
        }

        // Verify user owns the shop connection
        shopConnection = await prisma.connection.findFirst({
          where: {
            shopDomain: cleanShop,
            userId: ctx.userId,
            type: 'SHOPIFY',
          },
        });

        if (!shopConnection) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not own this Shopify store',
          });
        }

        // Check if this store already has an alias
        const storeHasAlias = existingAliases.some(
          (a) => (a.metadata as any)?.shopDomain === cleanShop,
        );

        if (storeHasAlias) {
          const existing = existingAliases.find(
            (a) => (a.metadata as any)?.shopDomain === cleanShop,
          );
          return {
            id: existing!.id,
            alias: (existing!.metadata as any)?.alias,
          };
        }
      }

      // Create or ensure user exists
      const owner = await prisma.user.upsert({
        where: { email: cleanEmail },
        create: { email: cleanEmail },
        update: {},
      });

      // Generate alias
      const short = Math.random().toString(36).slice(2, 6);

      // For standalone, use generic prefix; for store, use shop slug
      const prefix = cleanShop
        ? cleanShop
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 8)
            .toLowerCase()
        : 'support';

      // Add environment suffix to alias for routing (local/staging/production)
      const envSuffix =
        process.env.NODE_ENV === 'development'
          ? '-local'
          : process.env.ENVIRONMENT === 'staging'
            ? '-staging'
            : ''; // Production has no suffix

      const alias = `in+${prefix}-${short}${envSuffix}@${domain}`;
      const webhookSecret =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);

      // Extract store name from Shopify connection metadata if available
      let storeName: string | undefined;
      if (!isStandalone && shopConnection) {
        const shopMeta = (shopConnection.metadata as any) || {};
        storeName =
          shopMeta.storeName ||
          normalizeStoreNameFromDomain(cleanShop) ||
          undefined;
      }

      const conn = await prisma.connection.create({
        data: {
          type: 'CUSTOM_EMAIL' as any,
          accessToken: webhookSecret,
          userId: owner.id,
          metadata: {
            alias,
            provider: 'CUSTOM',
            domain,
            verifiedAt: null,
            type: isStandalone ? 'STANDALONE' : 'STORE_LINKED',
            shopDomain: cleanShop,
            storeName: storeName,
          } as any,
        },
        select: { id: true },
      });

      await logEvent(
        'email.alias.created',
        { alias, type: isStandalone ? 'standalone' : 'store-linked' },
        'connection',
        conn.id,
      );
      return { id: conn.id, alias };
    }),
  rotateAlias: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.connection.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId, // Multi-tenant scoping
        },
      });
      if (!existing || (existing.type as any) !== 'CUSTOM_EMAIL') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }
      const domain = (existing.metadata as any)?.domain as string | undefined;
      if (!domain) return { ok: false } as any;

      // Get shop domain from metadata to generate consistent shop slug
      const shopDomain = (existing.metadata as any)?.shopDomain as
        | string
        | undefined;
      if (!shopDomain) return { ok: false } as any;

      // Generate new alias with same format as createEmailAlias
      const short = Math.random().toString(36).slice(2, 6);
      const shopSlug = shopDomain
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8)
        .toLowerCase();

      // Add environment suffix to alias for routing (local/staging/production)
      const envSuffix =
        process.env.NODE_ENV === 'development'
          ? '-local'
          : process.env.ENVIRONMENT === 'staging'
            ? '-staging'
            : ''; // Production has no suffix

      const alias = `in+${shopSlug}-${short}${envSuffix}@${domain}`;
      const webhookSecret =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const updated = await prisma.connection.update({
        where: { id: input.id },
        data: {
          accessToken: webhookSecret,
          metadata: {
            ...(existing.metadata as any),
            alias,
            rotatedAt: new Date().toISOString(),
          } as any,
        },
        select: { id: true, metadata: true },
      });
      await logEvent('email.alias.rotated', { alias }, 'connection', input.id);
      return { ok: true, connection: updated } as any;
    }),
  setAliasStatus: protectedProcedure
    .input(z.object({ id: z.string(), disabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.connection.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId, // Multi-tenant scoping
        },
      });
      if (!existing || (existing.type as any) !== 'CUSTOM_EMAIL') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }
      const updated = await prisma.connection.update({
        where: { id: input.id },
        data: {
          metadata: {
            ...(existing.metadata as any),
            disabled: input.disabled,
          } as any,
        },
        select: { id: true, metadata: true },
      });
      await logEvent(
        input.disabled ? 'email.alias.disabled' : 'email.alias.enabled',
        {},
        'connection',
        input.id,
      );
      return { ok: true, connection: updated } as any;
    }),

  deleteAlias: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const alias = await prisma.connection.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          type: 'CUSTOM_EMAIL' as any,
        },
      });

      if (!alias) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email alias not found',
        });
      }

      // Delete the alias
      await prisma.connection.delete({
        where: { id: input.id },
      });

      await logEvent(
        'email.alias.deleted',
        { alias: (alias.metadata as any)?.alias },
        'connection',
        input.id,
      );

      return { success: true };
    }),

  getAliasLimits: protectedProcedure.query(async ({ ctx }) => {
    // Count Shopify stores
    const shopifyStores = await prisma.connection.count({
      where: {
        userId: ctx.userId,
        type: 'SHOPIFY',
      },
    });

    // Get existing aliases
    const aliases = await prisma.connection.findMany({
      where: {
        userId: ctx.userId,
        type: 'CUSTOM_EMAIL' as any,
      },
      select: { metadata: true },
    });

    const standaloneCount = aliases.filter(
      (a) => !(a.metadata as any)?.shopDomain,
    ).length;

    const storeLinkCount = aliases.filter(
      (a) => !!(a.metadata as any)?.shopDomain,
    ).length;

    return {
      maxAliases: shopifyStores + 1, // 1 standalone + 1 per store
      currentAliases: aliases.length,
      standaloneUsed: standaloneCount,
      storeLinkUsed: storeLinkCount,
      canCreateStandalone: standaloneCount === 0,
      canCreateStoreLink: storeLinkCount < shopifyStores,
      shopifyStores,
    };
  }),
});

export const appRouter = t.router({
  shopify: shopifyRouter,
  email: emailRouter,
  // Public endpoints (no auth required)
  health: publicProcedure.query(() => ({ status: 'ok' })),
  echo: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => ({ text: input.text })),

  // Protected endpoints (auth required)
  ordersCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const count = await prisma.order.count();
      return { count };
    } catch {
      return { count: 0 };
    }
  }),
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User profile not found',
      });
    }

    const connections = await prisma.connection.findMany({
      where: { userId: ctx.userId, type: 'SHOPIFY' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        shopDomain: true,
        createdAt: true,
        metadata: true,
      },
    });

    const stores = connections.map((connection) => {
      const metadata =
        (connection.metadata as Record<string, unknown> | null) ?? {};
      const nameFromMetadata =
        typeof (metadata as { storeName?: unknown }).storeName === 'string'
          ? ((metadata as { storeName?: string }).storeName ?? '').trim()
          : null;
      const supportEmail =
        typeof (metadata as { supportEmail?: unknown }).supportEmail ===
        'string'
          ? ((metadata as { supportEmail?: string }).supportEmail ?? '').trim()
          : null;

      const normalizedName = normalizeStoreNameFromDomain(
        connection.shopDomain,
      );

      return {
        id: connection.id,
        shopDomain: connection.shopDomain ?? '',
        createdAt: connection.createdAt,
        name:
          nameFromMetadata && nameFromMetadata.length > 0
            ? nameFromMetadata
            : (normalizedName ?? STORE_DEFAULT_NAME),
        supportEmail,
      };
    });

    return {
      user,
      stores,
    };
  }),
  updateUserProfile: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .trim()
          .min(2, 'Name must be at least 2 characters long')
          .max(120, 'Name must be at most 120 characters long')
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updates: { name?: string | null } = {};

      if (input.name !== undefined) {
        const sanitized = sanitizeLimited(input.name, 120).trim();
        updates.name = sanitized.length > 0 ? sanitized : null;
      }

      if (Object.keys(updates).length === 0) {
        return {
          user: await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
        };
      }

      const updated = await prisma.user.update({
        where: { id: ctx.userId },
        data: updates,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await logEvent(
        'user.profile.updated',
        { hasName: updated.name != null },
        'user',
        ctx.userId,
      );

      return { user: updated };
    }),
  threadsList: protectedProcedure
    .input(
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        const take = clampNumber(input?.take ?? 20, 1, 100);

        // Get user's connections to filter threads (multi-tenant scoping)
        const connections = await prisma.connection.findMany({
          where: { userId: ctx.userId },
          select: { id: true },
        });

        const connectionIds = connections.map((c) => c.id);

        if (connectionIds.length === 0) {
          return { threads: [] };
        }

        const threads = await prisma.thread.findMany({
          where: { connectionId: { in: connectionIds } },
          take,
          orderBy: { createdAt: 'desc' },
        });
        return { threads };
      } catch {
        return { threads: [] };
      }
    }),
  threadMessages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // First verify the thread belongs to one of the user's connections (multi-tenant scoping)
        const thread = await prisma.thread.findFirst({
          where: {
            id: input.threadId,
            connection: {
              userId: ctx.userId,
            },
          },
          select: { id: true },
        });

        if (!thread) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Thread not found or access denied',
          });
        }

        const messages = await prisma.message.findMany({
          where: { threadId: input.threadId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            from: true,
            to: true,
            body: true,
            direction: true,
            createdAt: true,
            aiSuggestion: {
              select: {
                reply: true,
                proposedAction: true,
                confidence: true,
              },
            },
          },
        });
        return { messages };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        return { messages: [] };
      }
    }),
  connections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const cons = await prisma.connection.findMany({
        where: { userId: ctx.userId }, // Multi-tenant scoping
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          shopDomain: true,
          createdAt: true,
          metadata: true,
        },
      });
      return { connections: cons };
    } catch {
      return { connections: [] };
    }
  }),

  updateConnectionSettings: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        supportEmail: z.string().email().optional(),
        storeName: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user owns the connection
      const existing = await prisma.connection.findFirst({
        where: {
          id: input.connectionId,
          userId: ctx.userId, // Multi-tenant scoping
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found or access denied',
        });
      }

      // Update metadata with support email and/or store name
      const currentMetadata = (existing.metadata as any) ?? {};
      const updatedMetadata: any = { ...currentMetadata };

      if (input.supportEmail !== undefined) {
        updatedMetadata.supportEmail = input.supportEmail;
      }

      if (input.storeName !== undefined) {
        updatedMetadata.storeName = input.storeName;
      }

      const updated = await prisma.connection.update({
        where: { id: input.connectionId },
        data: {
          metadata: updatedMetadata,
        },
        select: { id: true, metadata: true },
      });

      await logEvent(
        'connection.settings.updated',
        {
          supportEmail: input.supportEmail,
          storeName: input.storeName,
        },
        'connection',
        input.connectionId,
      );

      return { ok: true, connection: updated };
    }),
  emailHealth: publicProcedure.query(async () => {
    try {
      const last = await prisma.message.findFirst({
        where: { direction: 'INBOUND' as any },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      return { lastInboundAt: last?.createdAt ?? null };
    } catch {
      return { lastInboundAt: null };
    }
  }),

  ordersListDb: protectedProcedure
    .input(
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        const take = clampNumber(input?.take ?? 20, 1, 100);
        // Get user's connections to filter orders
        const connections = await prisma.connection.findMany({
          where: { userId: ctx.userId },
          select: { id: true },
        });
        const connectionIds = connections.map((c: { id: string }) => c.id);

        if (connectionIds.length === 0) {
          return { orders: [] };
        }

        const orders = await prisma.order.findMany({
          where: { connectionId: { in: connectionIds } }, // Multi-tenant scoping
          orderBy: { createdAt: 'desc' },
          take,
        });
        return { orders };
      } catch {
        return { orders: [] };
      }
    }),
  inboxBootstrap: protectedProcedure
    .input(
      z
        .object({
          ordersTake: z.number().min(0).max(100).default(25), // Allow 0 for conditional fetching
          unassignedTake: z.number().min(0).max(100).default(40), // Allow 0 for conditional fetching
          unassignedOffset: z.number().min(0).default(0),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const ordersTake = clampNumber(input?.ordersTake ?? 25, 0, 100); // Allow 0 for conditional fetching
      const unassignedTake = clampNumber(input?.unassignedTake ?? 40, 0, 100); // Allow 0 for conditional fetching
      const unassignedOffset = input?.unassignedOffset ?? 0;
      const search = input?.search?.trim() || undefined;

      // Fetch all connections once to avoid multiple round-trips
      const connections = await prisma.connection.findMany({
        where: { userId: ctx.userId },
        select: { id: true, type: true, shopDomain: true, metadata: true },
      });

      if (connections.length === 0) {
        return {
          orders: [],
          unassigned: [],
          emailLimit: await canSendEmail(ctx.userId),
          connections: [], // Include empty connections array for consistent return type
        };
      }

      const orderConnectionIds = connections.map((c) => c.id);
      const unassignedConnectionIds = connections
        .filter((c) => c.type === ('CUSTOM_EMAIL' as any))
        .map((c) => c.id);

      const [orders, unassignedMessages, emailLimit] = await Promise.all([
        // Only fetch orders if ordersTake > 0
        ordersTake > 0
          ? prisma.order.findMany({
              where: { connectionId: { in: orderConnectionIds } },
              orderBy: { createdAt: 'desc' },
              take: ordersTake,
              select: {
                id: true,
                shopifyId: true,
                name: true,
                email: true,
                totalAmount: true,
                currency: true,
                customerName: true,
                status: true,
                fulfillmentStatus: true,
                createdAt: true,
                updatedAt: true,
                shopDomain: true,
                connectionId: true,
                // lineItems removed for performance - fetched on demand via getOrderDetails
              },
            })
          : Promise.resolve([]),
        unassignedConnectionIds.length && unassignedTake > 0
          ? (async () => {
              // Create connection lookup map from cached connections (already fetched at line 2084)
              // This eliminates the need for database JOINs - much faster!
              const connectionMap = new Map(connections.map((c) => [c.id, c]));

              // Optimized: Get thread IDs first (uses index efficiently)
              const threadIds = await prisma.thread.findMany({
                where: { connectionId: { in: unassignedConnectionIds } },
                select: { id: true },
              });
              const threadIdList = threadIds.map((t) => t.id);

              if (threadIdList.length === 0) {
                return { messages: [], hasMore: false };
              }

              // Build search filter (optimized approach)
              // Use all thread IDs (optimization: direct threadId filter instead of nested)
              // When searching, use OR condition that includes thread.subject (nested, but only when searching)
              const messageSearchFilter = search
                ? {
                    OR: [
                      {
                        from: {
                          contains: search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        body: {
                          contains: search,
                          mode: 'insensitive' as const,
                        },
                      },
                      // Include thread subject in search (nested, but only when searching)
                      {
                        thread: {
                          subject: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                      },
                    ],
                  }
                : undefined;

              // Use threadId filter (direct relation, faster than nested connectionId)
              const whereClause = {
                direction: 'INBOUND' as any,
                threadId: { in: threadIdList }, // Direct relation - uses index efficiently
                ...(messageSearchFilter || {}),
              };

              const [unassignedMessages, totalCount] = await Promise.all([
                prisma.message.findMany({
                  where: whereClause,
                  orderBy: { createdAt: 'desc' },
                  skip: unassignedOffset,
                  take: unassignedTake,
                  select: {
                    id: true,
                    threadId: true,
                    from: true,
                    to: true,
                    body: true,
                    createdAt: true,
                    orderId: true,
                    direction: true,
                    thread: {
                      select: {
                        id: true,
                        subject: true,
                        isUnread: true,
                        isFlagged: true,
                        connectionId: true,
                        // REMOVED: nested connection relation - use cached connections instead
                        // connection: {
                        //   select: {
                        //     shopDomain: true,
                        //     metadata: true,
                        //   },
                        // },
                      },
                    },
                    aiSuggestion: {
                      select: {
                        reply: true,
                        proposedAction: true,
                        confidence: true,
                      },
                    },
                  },
                }),
                prisma.message.count({
                  where: whereClause,
                }),
              ]);

              // Add connection data manually from cached connections (fast in-memory lookup)
              const messagesWithConnections = unassignedMessages.map((msg) => {
                const connection = msg.thread?.connectionId
                  ? connectionMap.get(msg.thread.connectionId)
                  : null;

                return {
                  ...msg,
                  thread: {
                    ...msg.thread,
                    connection: connection
                      ? {
                          shopDomain: connection.shopDomain,
                          metadata: connection.metadata,
                        }
                      : null,
                  },
                };
              });

              return {
                messages: messagesWithConnections,
                hasMore: totalCount > unassignedOffset + unassignedTake,
              };
            })()
          : Promise.resolve({ messages: [], hasMore: false }),
        canSendEmail(ctx.userId),
      ]);

      // Calculate pending email counts for each order (only if orders were fetched)
      const orderIds = orders.map((o) => o.id);
      const pendingCountsMap = new Map<string, number>();

      if (orderIds.length > 0 && ordersTake > 0) {
        // Simplified: Use simple groupBy to count INBOUND messages per order
        // This is much faster than complex SQL subqueries, especially for small datasets
        try {
          const pendingCounts = await prisma.message.groupBy({
            by: ['orderId'],
            where: {
              orderId: { in: orderIds },
              direction: 'INBOUND', // Count INBOUND messages
            },
            _count: { id: true },
          });

          // Convert results to Map (filter out null orderIds)
          for (const row of pendingCounts) {
            if (row.orderId) {
              pendingCountsMap.set(row.orderId, row._count.id);
            }
          }
        } catch (error) {
          // Fallback: if groupBy fails, log error and continue with empty map
          console.error(
            '[inboxBootstrap] Error in pending count query:',
            error,
          );
        }
      }

      // Add pending email counts to orders
      const ordersWithPending = orders.map((order) => ({
        ...order,
        pendingEmailCount: pendingCountsMap.get(order.id) ?? 0,
      }));

      // Handle unassignedMessages which is now { messages, hasMore } or array
      const unassignedData = Array.isArray(unassignedMessages)
        ? unassignedMessages
        : unassignedMessages.messages || [];
      const unassignedHasMore = Array.isArray(unassignedMessages)
        ? false
        : unassignedMessages.hasMore || false;

      return {
        orders: ordersWithPending,
        unassigned: unassignedData,
        unassignedHasMore,
        emailLimit,
        connections, // Include connections for store name lookup
      };
    }),
  orderGet: protectedProcedure
    .input(z.object({ shop: z.string(), orderId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const cleanShop = safeShopDomain(input.shop);
        if (!cleanShop) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid shop domain',
          });
        }
        const conn = await prisma.connection.findFirst({
          where: {
            type: 'SHOPIFY',
            shopDomain: cleanShop,
            userId: ctx.userId, // Multi-tenant scoping
          },
        });
        if (!conn) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Shop access denied',
          });
        }
        const credentials = await getShopifyApiCredentials(conn.id, ctx.userId);
        if (!credentials) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get API credentials',
          });
        }
        const resp = await fetch(
          `${credentials.shopUrl}/admin/api/2024-10/orders/${input.orderId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': credentials.accessToken,
            },
          },
        );
        if (!resp.ok) return { order: null };
        const json: any = await resp.json();
        const o = json.order;
        if (!o) return { order: null };
        return {
          order: {
            id: String(o.id),
            name: o.name,
            email: o.email,
            totalPrice: o.total_price,
            createdAt: o.created_at,
            currency: o.currency,
            lineItems: (o.line_items ?? []).map((li: any) => ({
              id: String(li.id),
              title: li.title,
              quantity: li.quantity,
              price: li.price,
            })),
            shippingAddress: o.shipping_address ?? null,
          },
        };
      } catch {
        return { order: null };
      }
    }),
  aiSuggestReply: aiProcedure
    .input(
      z.object({
        customerMessage: z.string().min(1),
        orderSummary: z.string().optional(),
        tone: z.enum(['friendly', 'professional']).default('friendly'),
        customerEmail: z.string().optional(),
        orderId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check AI usage limit before processing
      const aiUsage = await canUseAI(ctx.userId);
      if (!aiUsage.allowed) {
        const message =
          aiUsage.trial.isTrial && aiUsage.trial.expired
            ? 'Your free trial has expired. Please upgrade to continue using AI-assisted replies.'
            : `You've reached your AI reply limit (${aiUsage.limit} per month). Please upgrade your plan for more AI-assisted replies.`;
        throw new TRPCError({
          code: 'FORBIDDEN',
          message,
        });
      }

      // Sanitize inputs
      const message = sanitizeLimited(input.customerMessage, 5000);
      const orderSummary = sanitizeLimited(input.orderSummary, 500);
      const customerEmail = safeEmail(input.customerEmail) ?? undefined;
      const apiKey = process.env.OPENAI_API_KEY;

      // Enhanced fallback with personalization
      const customerName = customerEmail
        ? customerEmail
            .split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())
        : 'there';

      const greeting = input.tone === 'professional' ? 'Hello' : 'Hi';
      const storeName = await resolveStoreName(ctx.userId, input.orderId);
      const signatureBlock = buildSignatureBlock(storeName);
      const requiredSignature = `Warm Regards,\n\n${signatureBlock}`;

      const buildFallback = () => {
        let body = `${greeting} ${customerName},\n\n`;
        body += `Thank you for reaching out to us! `;

        if (orderSummary) {
          body += `I can see your order details (${orderSummary}) and I'm here to help you with any questions or concerns you may have.\n\n`;
        } else {
          body += `I'd be happy to assist you with your inquiry. `;
          body += `If you have an order number, please share it so I can look up your specific order details.\n\n`;
        }

        body += `I'm currently reviewing your message and will provide you with a detailed response shortly. `;
        body += `I want to make sure I address all your concerns properly.\n\n`;
        body += `If you have any other questions in the meantime, please don't hesitate to reach out.\n\n`;
        body += `${requiredSignature}`;
        return body;
      };

      if (!apiKey) {
        // Enhanced fallback response - still counts toward AI usage since we're generating a reply
        await incrementAISuggestion(ctx.userId);
        return { suggestion: buildFallback() };
      }

      // Enhanced OpenAI prompt for better replies (lightweight heuristics to avoid latency hits)
      const orderContext = orderSummary
        ? `Order Details: ${orderSummary}`
        : 'No specific order referenced - customer may need to provide order number';

      const lowerMsg = message.toLowerCase();
      const urgencyLabel = /(asap|urgent|immediately|right away|today|now)/.test(lowerMsg)
        ? 'urgent'
        : 'standard';
      const issueType =
        /(refund|return|exchange|cancel)/.test(lowerMsg)
          ? 'refund/return'
          : /(shipping|delivery|delayed|tracking)/.test(lowerMsg)
            ? 'shipping'
            : /(payment|charge|billing)/.test(lowerMsg)
              ? 'payment'
              : /(product|size|spec|compatib|information|question)/.test(lowerMsg)
                ? 'product_info'
                : 'general';

      const prompt = `You are a professional customer support representative for an e-commerce store. Draft a concise, empathetic reply that feels tailored to the customer (keep speed high, avoid fluff).

Context:
- Store: ${storeName}
- Customer: ${customerName} (${customerEmail || 'unknown email'})
- Order: ${orderContext}
- Detected issue type: ${issueType}
- Urgency: ${urgencyLabel}
- Tone: ${input.tone}

Guidelines:
- Acknowledge their exact concern and urgency level.
- If order info is missing, ask once for order number/email used to place it.
- Reference known order details when present; otherwise be transparent you need specifics.
- Add 1–2 data-driven specifics (order dates, status, ETA, return window) when available.
- Match sentiment: if upset → apologize + clear next step; if neutral → concise and actionable; if positive → appreciative.
- Keep it short, direct, and ready to send.
- Avoid placeholders; use the real store name and sign-off below.
- Sign off with:
Warm Regards,

${signatureBlock}

Customer Message:
${input.customerMessage}

Write a comprehensive reply that addresses their concern and provides clear next steps.`;

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a professional customer support representative with excellent communication skills. You write personalized, empathetic, and helpful responses that make customers feel valued and understood. You always:

1. Acknowledge the customer's specific concern
2. Use a warm, professional tone
3. Reference their order details when available
4. Provide clear, actionable next steps
5. Show genuine care for their experience
6. Keep responses comprehensive but not overwhelming
7. Use the customer's name when appropriate
8. Address their specific request directly

Write responses that sound like they come from a real human support agent who genuinely cares about helping the customer.

IMPORTANT: Do NOT include the email subject line in your reply. Only write the email body content. The subject will be set separately.

Always end your response with:
Warm Regards,

${signatureBlock}

Do NOT use placeholders like [Your Name], [Your Company], or [Your Contact Information]. Use the actual store name: ${storeName}`,
              },
              {
                role: 'user',
                content: prompt.replace(/\s+/g, ' ').slice(0, 8000),
              },
            ],
            temperature: 0.7,
            max_tokens: 400,
          }),
        });

        if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);

        const json: any = await resp.json();
        const fallbackSuggestion = buildFallback();
        let suggestion =
          json.choices?.[0]?.message?.content ?? fallbackSuggestion;

        // Remove any "Subject:" lines that might have been included in the reply
        suggestion = suggestion.replace(/^Subject:\s*.+$/gim, '').trim();

        // Increment AI usage counter after successful generation
        await incrementAISuggestion(ctx.userId);

        return { suggestion: ensureSignature(suggestion, signatureBlock) };
      } catch (error) {
        console.error('OpenAI API error:', error);

        // Increment AI usage counter even for fallback (since we generated a response)
        await incrementAISuggestion(ctx.userId);

        // Fallback response
        return { suggestion: buildFallback() };
      }
    }),
  actionCreate: protectedProcedure
    .input(
      z.object({
        shop: z.string(),
        shopifyOrderId: z.string(),
        email: z.string().optional(),
        type: z.enum([
          'REFUND',
          'CANCEL',
          'REPLACE_ITEM',
          'ADDRESS_CHANGE',
          'INFO_REQUEST',
          'NONE',
        ]),
        note: z.string().optional(),
        draft: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const cleanShop = safeShopDomain(input.shop);
      if (!cleanShop)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid shop domain',
        });
      const cleanEmail = safeEmail(input.email ?? undefined) ?? undefined;
      const cleanNote = sanitizeLimited(input.note, 5000);
      const cleanDraft = sanitizeLimited(input.draft, 10000);
      // Verify user owns the shop connection
      const connection = await prisma.connection.findFirst({
        where: {
          shopDomain: cleanShop,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Shop access denied',
        });
      }

      // Ensure an Order row exists for this external order id
      const order = await prisma.order.upsert({
        where: { shopifyId: input.shopifyOrderId },
        create: {
          shopifyId: input.shopifyOrderId,
          connectionId: connection.id, // Link to connection
          status: 'PENDING',
          email: cleanEmail ?? null,
          totalAmount: 0,
        },
        update: {},
      });

      const action = await prisma.action.create({
        data: {
          orderId: order.id,
          type: input.type,
          status: 'PENDING',
          payload: {
            shop: cleanShop,
            note: cleanNote,
            draft: cleanDraft,
          } as any,
        },
      });

      await logEvent(
        'action.created',
        {
          actionId: action.id,
          orderId: order.id,
          type: input.type,
        },
        'action',
        action.id,
      );

      return { actionId: action.id };
    }),
  actionApproveAndSend: protectedProcedure
    .input(
      z.object({
        actionId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const toEmail = safeEmail(input.to);
        if (!toEmail) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid recipient email',
          });
        }
        const subject = sanitizeLimited(input.subject, 500);
        let body = sanitizeLimited(input.body, 20000);

        // Verify user owns the action (via order -> connection)
        const action = await prisma.action.findUnique({
          where: { id: input.actionId },
          include: {
            order: {
              include: {
                connection: true,
                messages: {
                  where: { direction: 'INBOUND' as any },
                  orderBy: { createdAt: 'desc' as any },
                  take: 1,
                  select: {
                    messageId: true,
                    headers: true,
                    from: true,
                    body: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        });

        if (!action || action.order.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Action access denied',
          });
        }

        // ============================================================================
        // Execute Shopify Action (if applicable) BEFORE sending email
        // ============================================================================
        let shopifyActionResult: {
          success: boolean;
          error?: string;
          data?: any;
        } | null = null;

        // Check if this action requires Shopify API execution
        const actionType = action.type;
        const actionPayload = (action.payload as Record<string, any>) || {};
        const connection = action.order.connection;
        const metadata = (connection.metadata as Record<string, unknown>) || {};

        // Only execute Shopify actions if connection has API access (custom app)
        if (
          metadata.connectionMethod === 'custom_app' &&
          actionType !== 'NONE' &&
          actionType !== 'INFO_REQUEST'
        ) {
          try {
            // Decrypt access token and create Shopify client
            const accessToken = await decryptSecure(connection.accessToken);
            if (!accessToken || !connection.shopDomain) {
              throw new Error('Invalid connection credentials');
            }

            const shopifyClient = new ShopifyClient(
              connection.shopDomain,
              accessToken,
            );

            // Execute action based on type
            switch (actionType) {
              case 'REFUND': {
                // Extract refund parameters from action payload
                const refundAmount = actionPayload.amount as number | undefined;
                const refundReason = actionPayload.reason as string | undefined;
                const refundNotify = actionPayload.notify !== false; // Default to true
                const refundLineItems = actionPayload.lineItems as
                  | Array<{
                      lineItemId: string;
                      quantity: number;
                      restockType?: 'no_restock' | 'cancel' | 'return';
                    }>
                  | undefined;

                const refundResult = await shopifyClient.createRefund({
                  orderId: action.order.shopifyId,
                  amount: refundAmount,
                  reason: refundReason || 'Refund initiated via ZYYP',
                  notify: refundNotify,
                  lineItems: refundLineItems,
                });

                if (!refundResult.success) {
                  shopifyActionResult = {
                    success: false,
                    error: refundResult.error || 'Failed to create refund',
                  };
                } else {
                  shopifyActionResult = {
                    success: true,
                    data: {
                      refundId: refundResult.refundId,
                      amount: refundResult.amount,
                    },
                  };

                  // Update order status
                  await prisma.order.update({
                    where: { id: action.order.id },
                    data: {
                      status: refundAmount ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
                      statusUpdatedAt: new Date(),
                    },
                  });

                  await logEvent(
                    'shopify.refund.success',
                    {
                      actionId: action.id,
                      orderId: action.order.id,
                      shopifyOrderId: action.order.shopifyId,
                      refundId: refundResult.refundId,
                      amount: refundResult.amount,
                    },
                    'action',
                    action.id,
                  );
                }
                break;
              }

              case 'CANCEL': {
                // Extract cancel parameters from action payload
                const cancelReason =
                  (actionPayload.reason as
                    | 'customer'
                    | 'fraud'
                    | 'inventory'
                    | 'declined'
                    | 'other') || 'other';
                const cancelEmail = actionPayload.email !== false; // Default to true
                const cancelRestock = actionPayload.restock !== false; // Default to true

                const cancelResult = await shopifyClient.cancelOrder({
                  orderId: action.order.shopifyId,
                  reason: cancelReason,
                  email: cancelEmail,
                  restock: cancelRestock,
                });

                if (!cancelResult.success) {
                  shopifyActionResult = {
                    success: false,
                    error: cancelResult.error || 'Failed to cancel order',
                  };
                } else {
                  shopifyActionResult = {
                    success: true,
                    data: {
                      cancelledAt: cancelResult.cancelledAt,
                    },
                  };

                  // Update order status
                  await prisma.order.update({
                    where: { id: action.order.id },
                    data: {
                      status: 'CANCELLED',
                      statusUpdatedAt: new Date(),
                    },
                  });

                  await logEvent(
                    'shopify.cancel.success',
                    {
                      actionId: action.id,
                      orderId: action.order.id,
                      shopifyOrderId: action.order.shopifyId,
                      cancelledAt: cancelResult.cancelledAt,
                    },
                    'action',
                    action.id,
                  );
                }
                break;
              }

              case 'REPLACE_ITEM': {
                // For REPLACE_ITEM, we would typically create a new fulfillment
                // This is a placeholder - you may need to implement fulfillment creation
                // For now, we'll just log it and mark as success
                shopifyActionResult = {
                  success: true,
                  data: {
                    note: 'Replace item action logged - fulfillment to be created manually',
                  },
                };

                await logEvent(
                  'shopify.replace_item.logged',
                  {
                    actionId: action.id,
                    orderId: action.order.id,
                    shopifyOrderId: action.order.shopifyId,
                    note: 'Replace item requires manual fulfillment creation',
                  },
                  'action',
                  action.id,
                );
                break;
              }

              case 'ADDRESS_CHANGE': {
                // For ADDRESS_CHANGE, we would update the shipping address
                // This requires updating the order's shipping address via Shopify API
                // For now, we'll log it - you may need to implement address update
                shopifyActionResult = {
                  success: true,
                  data: {
                    note: 'Address change action logged - requires manual update',
                  },
                };

                await logEvent(
                  'shopify.address_change.logged',
                  {
                    actionId: action.id,
                    orderId: action.order.id,
                    shopifyOrderId: action.order.shopifyId,
                    note: 'Address change requires manual order update',
                  },
                  'action',
                  action.id,
                );
                break;
              }

              default:
                // Unknown action type - don't execute
                break;
            }
          } catch (shopifyError: any) {
            const errorMessage =
              shopifyError instanceof Error
                ? shopifyError.message
                : String(shopifyError);
            shopifyActionResult = {
              success: false,
              error: errorMessage,
            };

            await logEvent(
              'shopify.action.failed',
              {
                actionId: action.id,
                actionType,
                orderId: action.order.id,
                error: errorMessage,
              },
              'action',
              action.id,
            );
          }

          // If Shopify action failed and it's critical (REFUND, CANCEL), fail the whole operation
          if (
            shopifyActionResult &&
            !shopifyActionResult.success &&
            (actionType === 'REFUND' || actionType === 'CANCEL')
          ) {
            // Mark action as failed
            await prisma.action.update({
              where: { id: input.actionId },
              data: {
                status: 'REJECTED',
                payload: {
                  ...actionPayload,
                  shopifyError: shopifyActionResult.error,
                } as any,
              },
            });

            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                shopifyActionResult.error ||
                `Failed to execute ${actionType} action on Shopify`,
            });
          }
        }

        // Get the original message's Message-ID for threading
        const originalMessage = action.order.messages[0];
        const originalMessageId = originalMessage?.messageId ?? null;
        const originalHeaders =
          (originalMessage?.headers as Record<string, any>) ?? {};

        // Remove any placeholder text and ensure proper signature
        const storeName =
          (metadata.storeName as string | undefined) ||
          connection.shopDomain ||
          'Support';
        const signatureBlock = buildSignatureBlock(storeName);

        // Replace placeholders in body
        body = body
          .replace(/\[Your Name\]/gi, '')
          .replace(/\[Your Company\]/gi, storeName)
          .replace(/\[Your Contact Information\]/gi, '')
          .replace(/\[Store Name\]/gi, storeName);

        // Remove any "Subject:" lines that might have been included
        body = body.replace(/^Subject:\s*.+$/gim, '').trim();

        // Ensure signature is present
        body = ensureSignature(body, signatureBlock);

        // Append quoted original email for better context
        if (originalMessage && originalMessage.body) {
          body = formatEmailWithQuotedOriginal(
            body,
            originalMessage.from,
            originalMessage.createdAt,
            originalMessage.body,
          );
        }

        // Check usage limits before sending
        const limitCheck = await canSendEmail(ctx.userId);
        if (!limitCheck.allowed) {
          const upgradeMessage =
            limitCheck.trial?.isTrial && limitCheck.trial.expired
              ? 'Your free trial has ended. Please upgrade to continue sending emails.'
              : `Email limit reached (${limitCheck.current}/${limitCheck.limit}). Please upgrade your plan to send more emails.`;
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: upgradeMessage,
          });
        }

        // Send email via Mailgun
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        // Support both US and EU Mailgun endpoints
        // EU keys typically have format: xxxxxxxx-xxxx-xxxx
        // US keys typically start with: key-...
        const mailgunRegion =
          process.env.MAILGUN_REGION ||
          (apiKey?.includes('-') && !apiKey.startsWith('key-') ? 'eu' : 'us');
        const mailgunBaseUrl =
          mailgunRegion === 'eu'
            ? 'https://api.eu.mailgun.net/v3'
            : 'https://api.mailgun.net/v3';
        const defaultFromEmail =
          process.env.MAILGUN_FROM_EMAIL || `support@${domain}`;

        // Get store's support email from connection metadata (metadata already fetched above)
        const storeSupportEmail = metadata.supportEmail as string | undefined;

        // Build FROM email with store name for better branding
        // Format: "Store Name <support@mail.zyyp.ai>"
        // Reply-To will be set to store's actual support email
        const fromEmail = storeSupportEmail
          ? `${storeName} <${defaultFromEmail}>`
          : defaultFromEmail;
        const replyToEmail = storeSupportEmail || defaultFromEmail;

        if (!apiKey || !domain) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'Mailgun API key or domain not configured. Please check environment variables.',
          });
        }

        const formData = new FormData();
        formData.append('from', fromEmail);
        formData.append('to', toEmail);
        formData.append('subject', subject);
        formData.append('text', body.trim());

        // Set Reply-To to store's support email so replies go to the store
        if (storeSupportEmail && storeSupportEmail !== defaultFromEmail) {
          formData.append('h:Reply-To', replyToEmail);
        }

        // Add email threading headers for proper reply threading
        // This makes replies appear in the same conversation thread in email clients
        if (originalMessageId) {
          // In-Reply-To: ID of the message being replied to
          formData.append('h:In-Reply-To', originalMessageId);

          // References: List of all message IDs in the thread
          // Start with existing References from original message (if any) and append the original Message-ID
          const existingReferences =
            originalHeaders['references'] ||
            originalHeaders['References'] ||
            '';
          const referencesChain = existingReferences
            ? `${existingReferences} ${originalMessageId}`.trim()
            : originalMessageId;
          formData.append('h:References', referencesChain);
        }

        const response = await fetch(`${mailgunBaseUrl}/${domain}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => 'Unable to read error');
          console.error('[Mailgun API Error]', {
            status: response.status,
            statusText: response.statusText,
            domain,
            region: mailgunRegion,
            endpoint: mailgunBaseUrl,
            apiKeyPrefix: apiKey.substring(0, 12) + '...',
            error: errorText,
          });

          if (response.status === 401) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                'Mailgun API authentication failed. Please verify MAILGUN_API_KEY and MAILGUN_DOMAIN are set correctly in Vercel environment variables.',
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Mailgun API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`,
          });
        }

        const result = await response.json();

        // Mark action as executed and include Shopify action results
        const updatedPayload = {
          ...actionPayload,
          ...(shopifyActionResult
            ? {
                shopifyAction: {
                  executed: true,
                  success: shopifyActionResult.success,
                  ...(shopifyActionResult.data || {}),
                  ...(shopifyActionResult.error
                    ? { error: shopifyActionResult.error }
                    : {}),
                },
              }
            : {}),
        };

        const updated = await prisma.action.update({
          where: { id: input.actionId },
          data: {
            status: 'EXECUTED',
            executedAt: new Date(),
            payload: updatedPayload as any,
          },
        });

        await logEvent(
          'email.sent',
          { to: toEmail, subject, messageId: result.id },
          'action',
          input.actionId,
        );

        // Increment usage tracking
        await incrementEmailSent(ctx.userId).catch((err) => {
          console.error('Failed to increment email usage:', err);
        });

        return { ok: true, status: updated.status, messageId: result.id };
      } catch (error: any) {
        // Mark action as failed
        await prisma.action.update({
          where: { id: input.actionId },
          data: { status: 'REJECTED' },
        });

        await logEvent(
          'email.sent.error',
          { to: input.to, subject: input.subject, error: error.message },
          'action',
          input.actionId,
        );

        return { ok: false, error: error.message };
      }
    }),
  sendUnassignedReply: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        replyBody: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const safeBody = sanitizeLimited(input.replyBody, 20000);
        // Get the original message and verify ownership
        const message = await prisma.message.findUnique({
          where: { id: input.messageId },
          select: {
            id: true,
            from: true,
            body: true,
            createdAt: true,
            messageId: true,
            headers: true,
            thread: {
              select: {
                id: true,
                subject: true,
                connectionId: true,
                connection: {
                  select: {
                    id: true,
                    userId: true,
                    shopDomain: true,
                    metadata: true,
                  },
                },
              },
            },
          },
        });

        if (!message || message.thread.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Message access denied',
          });
        }

        // Get the original message's Message-ID and headers for threading
        const originalMessageId = message.messageId ?? null;
        const originalHeaders = (message.headers as Record<string, any>) ?? {};

        // Check usage limits before sending
        const limitCheck = await canSendEmail(ctx.userId);
        if (!limitCheck.allowed) {
          const upgradeMessage =
            limitCheck.trial?.isTrial && limitCheck.trial.expired
              ? 'Your free trial has ended. Please upgrade to continue sending emails.'
              : `Email limit reached (${limitCheck.current}/${limitCheck.limit}). Please upgrade your plan to send more emails.`;
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: upgradeMessage,
          });
        }

        // Send email via Mailgun
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        // Support both US and EU Mailgun endpoints
        // EU keys typically have format: xxxxxxxx-xxxx-xxxx
        // US keys typically start with: key-...
        const mailgunRegion =
          process.env.MAILGUN_REGION ||
          (apiKey?.includes('-') && !apiKey.startsWith('key-') ? 'eu' : 'us');
        const mailgunBaseUrl =
          mailgunRegion === 'eu'
            ? 'https://api.eu.mailgun.net/v3'
            : 'https://api.mailgun.net/v3';
        const defaultFromEmail =
          process.env.MAILGUN_FROM_EMAIL || `support@${domain}`;

        // Get store's support email from connection metadata
        const connection = message.thread.connection;
        const metadata = (connection.metadata as any) ?? {};
        const storeSupportEmail = metadata.supportEmail as string | undefined;
        const aliasEmail = metadata.alias as string | undefined;
        const storeName =
          (metadata.storeName as string | undefined) ||
          connection.shopDomain ||
          'Support';

        // Build FROM email with store name for better branding
        // Format: "Store Name <support@mail.zyyp.ai>"
        // Reply-To will be set to store's actual support email, or the alias that received the email
        const fromEmail =
          storeSupportEmail || aliasEmail
            ? `${storeName} <${defaultFromEmail}>`
            : defaultFromEmail;
        // Priority: 1. storeSupportEmail, 2. alias (original recipient), 3. defaultFromEmail
        const replyToEmail =
          storeSupportEmail || aliasEmail || defaultFromEmail;

        if (!apiKey || !domain) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'Mailgun API key or domain not configured. Please check environment variables.',
          });
        }

        // Remove any placeholder text and ensure proper signature
        const signatureBlock = `${storeName} Support Team`;
        let cleanedBody = safeBody
          .replace(/\[Your Name\]/gi, '')
          .replace(/\[Your Company\]/gi, storeName)
          .replace(/\[Your Contact Information\]/gi, '')
          .replace(/\[Store Name\]/gi, storeName);

        // Remove any "Subject:" lines that might have been included
        cleanedBody = cleanedBody.replace(/^Subject:\s*.+$/gim, '').trim();

        // Ensure signature is present
        cleanedBody = ensureSignature(cleanedBody, signatureBlock);

        // Append quoted original email for better context
        if (message.body) {
          cleanedBody = formatEmailWithQuotedOriginal(
            cleanedBody,
            message.from,
            message.createdAt,
            message.body,
          );
        }

        const formData = new FormData();
        formData.append('from', fromEmail);
        formData.append('to', message.from);
        formData.append(
          'subject',
          `Re: ${message.thread.subject || 'Your inquiry'}`,
        );
        formData.append('text', cleanedBody.trim());

        // Set Reply-To so customer replies go to the merchant's mailbox (not our system email)
        // Always set Reply-To unless it's the same as the From address
        if (replyToEmail !== defaultFromEmail) {
          formData.append('h:Reply-To', replyToEmail);
        }

        // Add email threading headers for proper reply threading
        // This makes replies appear in the same conversation thread in email clients
        if (originalMessageId) {
          // In-Reply-To: ID of the message being replied to
          formData.append('h:In-Reply-To', originalMessageId);

          // References: List of all message IDs in the thread
          // Start with existing References from original message (if any) and append the original Message-ID
          const existingReferences =
            originalHeaders['references'] ||
            originalHeaders['References'] ||
            '';
          const referencesChain = existingReferences
            ? `${existingReferences} ${originalMessageId}`.trim()
            : originalMessageId;
          formData.append('h:References', referencesChain);
        }

        const response = await fetch(`${mailgunBaseUrl}/${domain}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => 'Unable to read error');
          console.error('[Mailgun API Error]', {
            status: response.status,
            statusText: response.statusText,
            domain,
            region: mailgunRegion,
            endpoint: mailgunBaseUrl,
            apiKeyPrefix: apiKey.substring(0, 12) + '...',
            error: errorText,
          });

          if (response.status === 401) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                'Mailgun API authentication failed. Please verify MAILGUN_API_KEY and MAILGUN_DOMAIN are set correctly in Vercel environment variables.',
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Mailgun API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`,
          });
        }

        const result = await response.json();

        // Extract Message-ID from Mailgun response (format: "<message-id@mailgun.org>")
        // Mailgun returns the Message-ID in the 'id' field
        const mailgunMessageId = result.id || null;

        // Store headers we sent for threading (In-Reply-To, References)
        const outboundHeaders: Record<string, any> = {
          'message-id': mailgunMessageId,
          subject: `Re: ${message.thread.subject || 'Your inquiry'}`,
          from: fromEmail,
          to: message.from,
        };

        if (originalMessageId) {
          outboundHeaders['in-reply-to'] = originalMessageId;
          const existingReferences =
            originalHeaders['references'] ||
            originalHeaders['References'] ||
            '';
          outboundHeaders['references'] = existingReferences
            ? `${existingReferences} ${originalMessageId}`.trim()
            : originalMessageId;
        }

        // Create outbound message record
        // Note: connectionId column doesn't exist in database, connection is tracked via thread
        // Store Message-ID and headers for proper email threading
        await prisma.message.create({
          data: {
            threadId: message.thread.id,
            from: fromEmail,
            to: message.from,
            body: safeBody,
            direction: 'OUTBOUND',
            messageId: mailgunMessageId,
            headers: outboundHeaders,
          },
        });

        // Mark thread as read after sending reply
        await prisma.thread.update({
          where: { id: message.thread.id },
          data: { isUnread: false },
        });

        await logEvent(
          'email.sent.unassigned',
          { to: message.from, messageId: result.id },
          'message',
          input.messageId,
        );

        // Increment usage tracking
        await incrementEmailSent(ctx.userId).catch((err) => {
          console.error('Failed to increment email usage:', err);
        });

        return { ok: true, messageId: result.id };
      } catch (error: any) {
        await logEvent(
          'email.sent.error',
          { error: error.message },
          'message',
          input.messageId,
        );

        return { ok: false, error: error.message };
      }
    }),
  messagesByOrder: protectedProcedure
    .input(z.object({ shopifyOrderId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const order = await prisma.order.findFirst({
          where: { shopifyId: input.shopifyOrderId },
          include: { connection: true },
        });
        if (!order || order.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Order access denied',
          });
        }
        const msgs = await prisma.message.findMany({
          where: { orderId: order.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            threadId: true,
            from: true,
            to: true,
            body: true,
            direction: true,
            createdAt: true,
            thread: {
              select: {
                subject: true,
              },
            },
            aiSuggestion: {
              select: {
                reply: true,
                proposedAction: true,
                confidence: true,
              },
            },
          },
        });
        return { messages: msgs };
      } catch {
        return { messages: [] };
      }
    }),
  unassignedInbound: protectedProcedure
    .input(
      z
        .object({
          take: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        const take = input?.take ?? 20;
        const offset = input?.offset ?? 0;
        const search = input?.search?.trim() || undefined;
        // Get user's CUSTOM_EMAIL connections to filter messages
        const connections = await prisma.connection.findMany({
          where: { userId: ctx.userId, type: 'CUSTOM_EMAIL' },
          select: { id: true },
        });
        const connectionIds = connections.map((c: { id: string }) => c.id);

        if (connectionIds.length === 0) {
          return { messages: [], hasMore: false };
        }

        // Optimized: Get thread IDs first (uses index efficiently)
        const threadIds = await prisma.thread.findMany({
          where: { connectionId: { in: connectionIds } },
          select: { id: true },
        });
        const threadIdList = threadIds.map((t) => t.id);

        if (threadIdList.length === 0) {
          return { messages: [], hasMore: false };
        }

        // Build search filter (optimized approach)
        // Use all thread IDs (optimization: direct threadId filter instead of nested)
        // When searching, use OR condition that includes thread.subject (nested, but only when searching)
        const messageSearchFilter = search
          ? {
              OR: [
                { from: { contains: search, mode: 'insensitive' as const } },
                { body: { contains: search, mode: 'insensitive' as const } },
                // Include thread subject in search (nested, but only when searching)
                {
                  thread: {
                    subject: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              ],
            }
          : undefined;

        // Use threadId filter (direct relation, faster than nested connectionId)
        const whereClause = {
          direction: 'INBOUND' as any,
          threadId: { in: threadIdList }, // Direct relation - uses index efficiently
          ...(messageSearchFilter || {}),
        };

        const [msgs, totalCount] = await Promise.all([
          prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take,
            select: {
              id: true,
              threadId: true,
              from: true,
              to: true,
              body: true,
              createdAt: true,
              orderId: true,
              direction: true,
              thread: {
                select: {
                  id: true,
                  subject: true,
                  isUnread: true,
                  isFlagged: true,
                  connectionId: true,
                  connection: {
                    select: {
                      shopDomain: true,
                      metadata: true,
                    },
                  },
                },
              },
              aiSuggestion: {
                select: {
                  reply: true,
                  proposedAction: true,
                  confidence: true,
                },
              },
            },
          }),
          prisma.message.count({
            where: whereClause,
          }),
        ]);
        return {
          messages: msgs,
          hasMore: totalCount > offset + take,
        };
      } catch {
        return { messages: [] };
      }
    }),
  assignMessageToOrder: protectedProcedure
    .input(z.object({ messageId: z.string(), shopifyOrderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user owns both the message and order
        const message = await prisma.message.findUnique({
          where: { id: input.messageId },
          include: { thread: { include: { connection: true } } },
        });

        if (!message || message.thread.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Message access denied',
          });
        }

        const order = await prisma.order.findFirst({
          where: {
            shopifyId: input.shopifyOrderId,
            connection: { userId: ctx.userId }, // Verify user owns the order
          },
          select: { id: true },
        });

        if (!order) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Order access denied',
          });
        }

        await prisma.message.update({
          where: { id: input.messageId },
          data: { orderId: order.id },
        });
        return { ok: true } as any;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return { ok: false } as any;
      }
    }),
  markThreadUnread: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        isUnread: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user owns the thread
        const thread = await prisma.thread.findUnique({
          where: { id: input.threadId },
          include: { connection: true },
        });

        if (!thread || thread.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Thread access denied',
          });
        }

        await prisma.thread.update({
          where: { id: input.threadId },
          data: { isUnread: input.isUnread },
        });

        await logEvent(
          'thread.mark_unread',
          { threadId: input.threadId, isUnread: input.isUnread },
          'thread',
          input.threadId,
        );

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update thread read status',
        });
      }
    }),
  flagThread: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        isFlagged: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user owns the thread
        const thread = await prisma.thread.findUnique({
          where: { id: input.threadId },
          include: { connection: true },
        });

        if (!thread || thread.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Thread access denied',
          });
        }

        await prisma.thread.update({
          where: { id: input.threadId },
          data: { isFlagged: input.isFlagged },
        });

        await logEvent(
          'thread.flag',
          { threadId: input.threadId, isFlagged: input.isFlagged },
          'thread',
          input.threadId,
        );

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update thread flag status',
        });
      }
    }),
  refreshOrderFromShopify: protectedProcedure
    .input(z.object({ shop: z.string(), orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = await prisma.connection.findFirst({
          where: {
            type: 'SHOPIFY',
            shopDomain: input.shop,
            userId: ctx.userId, // Multi-tenant scoping
          },
        });
        if (!conn) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Shop access denied',
          });
        }

        const credentials = await getShopifyApiCredentials(conn.id, ctx.userId);
        if (!credentials) {
          return { ok: false, error: 'Failed to get API credentials' };
        }
        const url = `${credentials.shopUrl}/admin/api/2024-10/orders/${input.orderId}.json`;
        const resp = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': credentials.accessToken,
          },
        });
        if (!resp.ok)
          return { ok: false, error: 'Failed to fetch from Shopify' };

        const json: any = await resp.json();
        const order = json.order;
        if (!order) return { ok: false, error: 'Order not found' };

        // Update the order in database
        const orderData = {
          name: order.name || null,
          email: order.email || order.customer?.email || null,
          totalAmount: Math.round(parseFloat(order.total_price || '0') * 100),
          status: (order.financial_status || 'PENDING').toUpperCase(),
          fulfillmentStatus: (
            order.fulfillment_status || 'UNFULFILLED'
          ).toUpperCase(),
          shopDomain: input.shop,
        };

        await prisma.order.upsert({
          where: { shopifyId: order.id.toString() },
          create: {
            shopifyId: order.id.toString(),
            connectionId: conn.id, // Link to connection
            ...orderData,
          },
          update: orderData,
        });

        return { ok: true };
      } catch (error: any) {
        return { ok: false, error: error.message || 'Unknown error' };
      }
    }),

  // Sync all orders from Shopify - bulk resync for catching missed webhooks
  syncAllOrdersFromShopify: protectedProcedure
    .input(
      z.object({
        shopDomain: z.string(),
        // Optional: only sync orders updated after this date
        updatedAfter: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = await prisma.connection.findFirst({
          where: {
            type: 'SHOPIFY',
            shopDomain: input.shopDomain,
            userId: ctx.userId,
          },
        });

        if (!conn) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Shop access denied',
          });
        }

        const credentials = await getShopifyApiCredentials(conn.id, ctx.userId);
        if (!credentials) {
          return {
            ok: false,
            error: 'Failed to get API credentials',
            synced: 0,
          };
        }

        // Build query params - CRITICAL: Shopify does NOT sort by newest automatically!
        const params = new URLSearchParams({
          status: 'any',
          limit: '100', // Fetch latest 100 orders
          order: 'created_at desc', // REQUIRED: Sort by newest first
          fields:
            'id,created_at,order_number,updated_at,name,email,total_price,currency,financial_status,fulfillment_status,customer,line_items,cancelled_at,processed_at,contact_email',
        });

        if (input.updatedAfter) {
          params.set('updated_at_min', input.updatedAfter);
        }
        // Don't set created_at_min - let Shopify return the latest 100 orders

        const url = `${credentials.shopUrl}/admin/api/2024-10/orders.json?${params.toString()}`;

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        let orders: any[] = [];

        try {
          const resp = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': credentials.accessToken,
            },
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!resp.ok) {
            const errorText = await resp.text().catch(() => '');
            console.error(
              '[syncAllOrders] Shopify API error:',
              resp.status,
              errorText,
            );
            return {
              ok: false,
              error: `Shopify API error: ${resp.status}`,
              synced: 0,
            };
          }

          const json: any = await resp.json();
          orders = json.orders || [];

          // CRITICAL DEBUG: Log what Shopify actually returned
          console.log('[SYNC] ========== SHOPIFY RESPONSE DEBUG ==========');
          console.log(
            '[SYNC] Total orders returned by Shopify:',
            orders.length,
          );
          console.log('[SYNC] Shop:', input.shopDomain);
          if (orders.length > 0) {
            console.log('[SYNC] Top 3 orders from Shopify (should be newest):');
            orders.slice(0, 3).forEach((o: any, idx: number) => {
              console.log(
                `[SYNC]   ${idx + 1}. Order #${o.order_number || o.name} (ID: ${o.id}) - Created: ${o.created_at}`,
              );
            });
            console.log(
              '[SYNC] Highest order number returned:',
              orders[0]?.order_number || orders[0]?.name,
            );
            console.log(
              '[SYNC] Lowest order number returned:',
              orders[orders.length - 1]?.order_number ||
                orders[orders.length - 1]?.name,
            );
          } else {
            console.log('[SYNC] WARNING: Shopify returned 0 orders!');
          }
          console.log('[SYNC] ===============================================');
        } catch (fetchError: any) {
          clearTimeout(timeout);
          if (fetchError.name === 'AbortError') {
            console.error('[syncAllOrders] Request timed out after 60 seconds');
            return {
              ok: false,
              error: 'Request timed out',
              synced: 0,
            };
          }
          throw fetchError;
        }

        let synced = 0;
        let errors = 0;

        for (const order of orders) {
          try {
            // Determine status - check for cancellation
            let orderStatus = (
              order.financial_status || 'PENDING'
            ).toUpperCase();
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
              shopDomain: input.shopDomain,
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

            // CRITICAL: Store created_at from Shopify to maintain proper order
            const orderDataWithDate = {
              ...orderData,
              createdAt: order.created_at
                ? new Date(order.created_at)
                : new Date(),
            };

            const upsertedOrder = await prisma.order.upsert({
              where: { shopifyId: order.id.toString() },
              create: {
                shopifyId: order.id.toString(),
                connectionId: conn.id,
                ...orderDataWithDate,
              },
              update: orderDataWithDate, // Update ALL fields including createdAt to ensure latest data
            });

            // Log first 3 orders being saved to verify newest is first
            if (synced < 3) {
              console.log(
                `[SYNC] Saving order ${synced + 1}: #${order.order_number || order.name} (ID: ${order.id}) to database`,
              );
            }

            // Sync line items if present (only if table exists)
            if (order.line_items && order.line_items.length > 0) {
              try {
                // Delete existing and insert new (handles updates)
                await prisma.orderLineItem.deleteMany({
                  where: { orderId: upsertedOrder.id },
                });

                await prisma.orderLineItem.createMany({
                  data: order.line_items.map((item: any) => ({
                    orderId: upsertedOrder.id,
                    shopifyId: String(item.id),
                    title: item.title || 'Unknown Item',
                    quantity: item.quantity || 1,
                    price: Math.round(parseFloat(item.price || '0') * 100),
                    sku: item.sku || null,
                    variantId: item.variant_id ? String(item.variant_id) : null,
                    productId: item.product_id ? String(item.product_id) : null,
                  })),
                });
              } catch (lineItemError: any) {
                // If OrderLineItem table doesn't exist yet, skip line items
                // This allows orders to sync even before migration is applied
                if (
                  lineItemError?.code === 'P2021' ||
                  lineItemError?.message?.includes('does not exist')
                ) {
                  console.warn(
                    `[syncAllOrders] OrderLineItem table not found, skipping line items for order ${order.id}`,
                  );
                } else {
                  throw lineItemError; // Re-throw other errors
                }
              }
            }

            synced++;
          } catch (err) {
            console.error(
              '[syncAllOrders] Failed to sync order:',
              order.id,
              err,
            );
            errors++;
            // Don't stop the entire sync if one order fails
          }
        }

        console.log(
          `[syncAllOrders] Completed sync: ${synced} orders synced, ${errors} errors, ${orders.length} total for ${input.shopDomain}`,
        );

        await logEvent(
          'shopify.sync.completed',
          {
            synced,
            errors,
            total: orders.length,
            shopDomain: input.shopDomain,
          },
          'connection',
          conn.id,
        );

        return { ok: true, synced, errors, total: orders.length };
      } catch (error: any) {
        console.error('[syncAllOrders] Error:', error);
        return {
          ok: false,
          error: error.message || 'Unknown error',
          synced: 0,
        };
      }
    }),

  ordersRecent: protectedProcedure
    .input(
      z.object({
        shop: z.string(),
        limit: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const limit = input.limit ?? 10;
        const conn = await prisma.connection.findFirst({
          where: {
            type: 'SHOPIFY',
            shopDomain: input.shop,
            userId: ctx.userId, // Multi-tenant scoping
          },
        });
        if (!conn) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Shop access denied',
          });
        }
        const url = `https://${input.shop}/admin/api/2024-07/orders.json?status=any&limit=${limit}&order=created_at%20desc`;
        const resp: Response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': decryptSecure(conn.accessToken),
          },
        });
        if (!resp.ok) return { orders: [] };
        const json: any = await resp.json();
        const orders = (json.orders ?? []).map((o: any) => ({
          id: String(o.id),
          name: o.name,
          email: o.email,
          totalPrice: o.total_price,
          createdAt: o.created_at,
          financialStatus: o.financial_status,
          fulfillmentStatus: o.fulfillment_status,
        }));
        return { orders };
      } catch {
        return { orders: [] };
      }
    }),
  // Paginated orders list from DB for the current user (used by Inbox "Load more")
  ordersList: protectedProcedure
    .input(
      z.object({
        offset: z.number().min(0).default(0),
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(), // Optional cursor for better pagination
      }),
    )
    .query(async ({ input, ctx }) => {
      // Fetch all connection IDs for this user (cached by index)
      const connections = await prisma.connection.findMany({
        where: { userId: ctx.userId },
        select: { id: true },
      });
      const connectionIds = connections.map((c) => c.id);

      // Debug: Log connection IDs and total order count
      console.log(
        `[ordersList] User ${ctx.userId} has ${connectionIds.length} connections:`,
        connectionIds,
      );
      const totalOrdersInDb = await prisma.order.count({
        where: { connectionId: { in: connectionIds } },
      });
      console.log(
        `[ordersList] Total orders for user's connections: ${totalOrdersInDb}`,
      );

      if (connectionIds.length === 0) {
        return { orders: [], hasMore: false };
      }

      // Optimized: Use cursor-based pagination when cursor is provided
      // Otherwise fall back to offset (for backward compatibility)
      const take = input.limit + 1; // fetch one extra to detect hasMore

      let orders;
      const orderSelect = {
        id: true,
        shopifyId: true,
        name: true,
        email: true,
        totalAmount: true,
        currency: true,
        customerName: true,
        status: true,
        fulfillmentStatus: true,
        createdAt: true,
        updatedAt: true,
        shopDomain: true,
        connectionId: true,
        // lineItems removed for performance - fetched on demand via getOrderDetails
      };

      if (input.cursor) {
        // Cursor-based pagination (faster for large datasets)
        orders = await prisma.order.findMany({
          where: {
            connectionId: { in: connectionIds },
            createdAt: { lt: new Date(input.cursor) }, // Less than cursor date
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: orderSelect,
        });
      } else {
        // Offset-based pagination (for backward compatibility)
        // Note: skip is slow for large offsets, but we keep it for compatibility
        orders = await prisma.order.findMany({
          where: { connectionId: { in: connectionIds } },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take,
          select: orderSelect,
        });
      }

      const hasMore = orders.length > input.limit;
      const page = hasMore ? orders.slice(0, input.limit) : orders;

      // Get pending email counts for these orders
      const orderIds = page.map((o) => o.id);

      // Optimized: Use groupBy to count INBOUND messages for these orders
      const pendingCounts = await prisma.message.groupBy({
        by: ['orderId'],
        where: {
          orderId: { in: orderIds },
          direction: 'INBOUND', // Fix: was OUTBOUND (wrong)
        },
        _count: {
          id: true,
        },
      });

      const pendingCountsMap = new Map(
        pendingCounts.map((c) => [c.orderId, c._count.id]),
      );

      // Add pending email counts to orders
      const ordersWithPending = page.map((order) => ({
        ...order,
        pendingEmailCount: pendingCountsMap.get(order.id) ?? 0,
      }));

      // Return cursor for next page (last order's createdAt as ISO string)
      const nextCursor =
        hasMore && page.length > 0
          ? page[page.length - 1].createdAt.toISOString()
          : null;

      return { orders: ordersWithPending, hasMore, nextCursor };
    }),
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user's connections for scoping
      const connections = await prisma.connection.findMany({
        where: { userId: ctx.userId },
        select: { id: true },
      });
      const connectionIds = connections.map((c: { id: string }) => c.id);

      if (connectionIds.length === 0) {
        // Return empty analytics if no connections
        return {
          totalEmails: 0,
          emailsThisWeek: 0,
          emailsThisMonth: 0,
          mappedEmails: 0,
          unmappedEmails: 0,
          totalOrders: 0,
          actionsTaken: 0,
          actionsThisWeek: 0,
          aiSuggestionAccuracy: 0,
          aiSuggestionsTotal: 0,
          averageResponseTime: null,
          customerSatisfactionScore: 0,
          volumeTrend: [],
        };
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total emails (scoped to user's connections)
      const totalEmails = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          thread: { connectionId: { in: connectionIds } },
        },
      });

      // Emails this week
      const emailsThisWeek = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          createdAt: { gte: weekAgo },
          thread: { connectionId: { in: connectionIds } },
        },
      });

      // Emails this month
      const emailsThisMonth = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          createdAt: { gte: monthAgo },
          thread: { connectionId: { in: connectionIds } },
        },
      });

      // Mapped vs unmapped (scoped)
      const mappedEmails = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          orderId: { not: null },
          thread: { connectionId: { in: connectionIds } },
        },
      });

      const unmappedEmails = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          orderId: null,
          thread: { connectionId: { in: connectionIds } },
        },
      });

      // Total orders (scoped to user's connections)
      const totalOrders = await prisma.order.count({
        where: { connectionId: { in: connectionIds } },
      });

      // Actions taken (scoped via order -> connection)
      const actionsTaken = await prisma.action.count({
        where: { order: { connectionId: { in: connectionIds } } },
      });

      // Actions this week (scoped)
      const actionsThisWeek = await prisma.action.count({
        where: {
          createdAt: { gte: weekAgo },
          order: { connectionId: { in: connectionIds } },
        },
      });

      // AI suggestions (scoped)
      const aiSuggestions = await prisma.aISuggestion.count({
        where: { message: { thread: { connectionId: { in: connectionIds } } } },
      });
      const aiSuggestionAccuracy =
        aiSuggestions > 0 ? actionsTaken / aiSuggestions : 0;

      // Average response time (time from inbound message to first action on that order) - scoped
      const messagesWithActions = await prisma.message.findMany({
        where: {
          direction: 'INBOUND',
          orderId: { not: null },
          thread: { connectionId: { in: connectionIds } },
        },
        include: {
          order: {
            include: {
              actions: {
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      let totalResponseTimeMinutes = 0;
      let responseTimeCount = 0;

      for (const message of messagesWithActions) {
        const firstAction = message.order?.actions[0];
        if (message && firstAction) {
          const diffMs =
            firstAction.createdAt.getTime() - message.createdAt.getTime();
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          if (diffMinutes >= 0 && diffMinutes < 10000) {
            // Sanity check
            totalResponseTimeMinutes += diffMinutes;
            responseTimeCount++;
          }
        }
      }

      const avgResponseTime =
        responseTimeCount > 0
          ? Math.round(totalResponseTimeMinutes / responseTimeCount)
          : 0;

      // Calculate customer satisfaction (based on action types)
      const positiveActions = await prisma.action.count({
        where: {
          type: {
            in: ['REFUND', 'REPLACE_ITEM', 'ADDRESS_CHANGE'],
          },
        },
      });

      const customerSatisfactionScore =
        actionsTaken > 0 ? (positiveActions / actionsTaken) * 100 : 0;

      // Email volume trend (last 7 days) - scoped
      const volumeTrend = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const count = await prisma.message.count({
          where: {
            direction: 'INBOUND',
            createdAt: { gte: dayStart, lte: dayEnd },
            thread: { connectionId: { in: connectionIds } },
          },
        });

        volumeTrend.push({
          date: dayStart.toISOString().split('T')[0],
          count,
        });
      }

      return {
        totalEmails,
        emailsThisWeek,
        emailsThisMonth,
        mappedEmails,
        unmappedEmails,
        totalOrders,
        actionsTaken,
        actionsThisWeek,
        aiSuggestionAccuracy,
        aiSuggestionsTotal: aiSuggestions,
        averageResponseTime: avgResponseTime,
        customerSatisfactionScore,
        volumeTrend,
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return {
        totalEmails: 0,
        emailsThisWeek: 0,
        emailsThisMonth: 0,
        mappedEmails: 0,
        unmappedEmails: 0,
        totalOrders: 0,
        actionsTaken: 0,
        actionsThisWeek: 0,
        aiSuggestionAccuracy: 0,
        aiSuggestionsTotal: 0,
        averageResponseTime: 0,
        customerSatisfactionScore: 0,
        volumeTrend: [],
      };
    }
  }),
  getShopifyAnalytics: protectedProcedure
    .input(z.object({ shop: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify user owns this shop connection
        const connection = await prisma.connection.findFirst({
          where: {
            shopDomain: input.shop,
            userId: ctx.userId,
            type: 'SHOPIFY',
          },
        });

        if (!connection) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Shop access denied',
          });
        }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total orders for this shop (scoped via connectionId)
        const totalOrders = await prisma.order.count({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
          },
        });

        // Orders this week
        const ordersThisWeek = await prisma.order.count({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
            createdAt: { gte: weekAgo },
          },
        });

        // Orders this month
        const ordersThisMonth = await prisma.order.count({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
            createdAt: { gte: monthAgo },
          },
        });

        // Total revenue (sum of all order totalAmount values - stored in cents)
        const allOrders = await prisma.order.findMany({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
          },
          select: { totalAmount: true },
        });

        let totalRevenue = 0;
        for (const order of allOrders) {
          totalRevenue += order.totalAmount / 100; // Convert cents to dollars
        }

        // Revenue this week
        const weekOrders = await prisma.order.findMany({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
            createdAt: { gte: weekAgo },
          },
          select: { totalAmount: true },
        });

        let revenueThisWeek = 0;
        for (const order of weekOrders) {
          revenueThisWeek += order.totalAmount / 100;
        }

        // Revenue this month
        const monthOrders = await prisma.order.findMany({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
            createdAt: { gte: monthAgo },
          },
          select: { totalAmount: true },
        });

        let revenueThisMonth = 0;
        for (const order of monthOrders) {
          revenueThisMonth += order.totalAmount / 100;
        }

        // Average order value
        const averageOrderValue =
          totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Unique customers (scoped)
        const uniqueCustomers = await prisma.order.groupBy({
          by: ['email'],
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
            email: { not: null },
          },
        });

        const totalCustomers = uniqueCustomers.length;

        // New customers this week
        const newCustomersThisWeek = await prisma.order.groupBy({
          by: ['email'],
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
            email: { not: null },
            createdAt: { gte: weekAgo },
          },
        });

        // Order status breakdown (scoped)
        const ordersGrouped = await prisma.order.findMany({
          where: {
            shopDomain: input.shop,
            connectionId: connection.id,
          },
          select: { status: true },
        });

        const fulfilled = ordersGrouped.filter(
          (o: { status: string }) =>
            o.status.toLowerCase().includes('fulfilled') ||
            o.status === 'completed',
        ).length;
        const pending = ordersGrouped.filter(
          (o: { status: string }) =>
            o.status.toLowerCase().includes('pending') ||
            o.status.toLowerCase().includes('processing') ||
            o.status === 'open',
        ).length;

        // Top products placeholder (no lineItems field in schema yet)
        const topProducts: { name: string; count: number }[] = [];

        // Revenue trend (last 7 days) - scoped
        const revenueTrend = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now);
          dayStart.setDate(dayStart.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const dayOrders = await prisma.order.findMany({
            where: {
              shopDomain: input.shop,
              connectionId: connection.id,
              createdAt: { gte: dayStart, lte: dayEnd },
            },
            select: { totalAmount: true },
          });

          let revenue = 0;
          for (const order of dayOrders) {
            revenue += order.totalAmount / 100;
          }

          revenueTrend.push({
            date: dayStart.toISOString().split('T')[0],
            revenue: Math.round(revenue * 100) / 100,
          });
        }

        return {
          totalOrders,
          ordersThisWeek,
          ordersThisMonth,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          revenueThisWeek: Math.round(revenueThisWeek * 100) / 100,
          revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          currency: 'USD', // Hardcoded for now, can be extracted from Shopify metadata later
          totalCustomers,
          newCustomersThisWeek: newCustomersThisWeek.length,
          ordersFulfilled: fulfilled,
          ordersPending: pending,
          topProducts,
          revenueTrend,
        };
      } catch (error) {
        console.error('Shopify analytics error:', error);
        return {
          totalOrders: 0,
          ordersThisWeek: 0,
          ordersThisMonth: 0,
          totalRevenue: 0,
          revenueThisWeek: 0,
          revenueThisMonth: 0,
          averageOrderValue: 0,
          currency: 'USD',
          totalCustomers: 0,
          newCustomersThisWeek: 0,
          ordersFulfilled: 0,
          ordersPending: 0,
          topProducts: [],
          revenueTrend: [],
        };
      }
    }),

  // Usage & Subscription endpoints
  getUsageSummary: protectedProcedure
    .input(
      z
        .object({
          currency: z.enum(['USD', 'INR']).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        const summary = await getUsageSummary(ctx.userId);
        const currency = input?.currency || detectCurrency() || 'INR';
        const pricing = PLAN_PRICING[summary.planType];

        return {
          ...summary,
          currency,
          price: pricing ? pricing[currency] : 0,
          priceUSD: pricing ? pricing.USD : 0,
          priceINR: pricing ? pricing.INR : 0,
          formattedPrice: pricing
            ? formatPrice(pricing[currency], currency)
            : 'Custom',
        };
      } catch (error) {
        console.error('Usage summary error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch usage summary',
        });
      }
    }),

  getUsageHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      const history = await getUsageHistory(ctx.userId);
      return { history };
    } catch (error) {
      console.error('Usage history error:', error);
      return { history: [] };
    }
  }),
  getAccountDetails: protectedProcedure.query(async ({ ctx }) => {
    const [user, subscription, usageSummary] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      }),
      prisma.subscription.findUnique({
        where: { userId: ctx.userId },
        include: {
          usageRecords: {
            orderBy: { periodStart: 'desc' },
            take: 6,
            select: {
              id: true,
              periodStart: true,
              periodEnd: true,
              emailsSent: true,
              emailsReceived: true,
              aiSuggestions: true,
              createdAt: true,
            },
          },
        },
      }),
      getUsageSummary(ctx.userId),
    ]);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const billingCycle =
      subscription?.currentPeriodStart && subscription?.currentPeriodEnd
        ? {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd,
          }
        : null;

    const billingHistory =
      subscription?.usageRecords.map((record) => ({
        id: record.id,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        emailsSent: record.emailsSent,
        emailsReceived: record.emailsReceived,
        aiSuggestions: record.aiSuggestions,
        createdAt: record.createdAt,
      })) ?? [];

    return {
      user,
      subscription: subscription
        ? {
            id: subscription.id,
            planType: subscription.planType,
            status: subscription.status,
            paymentGateway: subscription.paymentGateway,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            canceledAt: subscription.canceledAt,
            metadata: subscription.metadata,
          }
        : null,
      billingCycle,
      billingHistory,
      usageSummary,
    };
  }),

  checkEmailLimit: protectedProcedure.query(async ({ ctx }) => {
    try {
      const limitCheck = await canSendEmail(ctx.userId);
      return limitCheck;
    } catch (error) {
      console.error('Email limit check error:', error);
      return {
        allowed: false,
        current: 0,
        limit: 0,
        percentage: 100,
        remaining: 0,
        planType: 'TRIAL',
        trial: {
          isTrial: false,
          expired: false,
          endsAt: null,
          daysRemaining: null,
        },
      };
    }
  }),

  getAvailablePlans: protectedProcedure
    .input(
      z
        .object({
          currency: z.enum(['USD', 'INR']).optional(),
          country: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      // Detect currency if not provided
      const currency =
        input?.currency || detectCurrency(input?.country, undefined) || 'INR';

      return {
        currency,
        plans: Object.entries(PLAN_LIMITS).map(([key, value]) => {
          const pricing = PLAN_PRICING[key];
          return {
            type: key,
            name: value.name,
            emailsPerMonth: value.emailsPerMonth,
            aiRepliesLimit: value.aiRepliesLimit,
            stores: value.stores,
            price: pricing ? pricing[currency] : -1,
            priceUSD: pricing ? pricing.USD : -1,
            priceINR: pricing ? pricing.INR : -1,
            formattedPrice: pricing
              ? formatPrice(pricing[currency], currency)
              : 'Custom',
          };
        }),
      };
    }),

  // Payment/Subscription endpoints
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planType: z.enum(['STARTER', 'GROWTH', 'PRO']),
        currency: z.enum(['USD', 'INR']).optional(),
        country: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: ctx.userId },
          select: { email: true, name: true },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Detect currency if not provided
        const currency =
          input.currency || detectCurrency(input.country, undefined) || 'INR';

        // Get current subscription
        const subscription = await ensureSubscription(ctx.userId);

        // Get Razorpay plan config with currency
        const planConfig = getRazorpayPlanConfig(input.planType, currency);
        if (!planConfig) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid plan type for payment',
          });
        }

        // Create or get Razorpay customer
        const customer = await getOrCreateCustomer(
          user.email,
          user.name || 'Customer',
        );

        // Create Razorpay subscription with currency
        const razorpaySubscription = await createRazorpaySubscription(
          customer.id,
          input.planType,
          ctx.userId,
          currency,
        );

        // Update our subscription record
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const updatedSubscription = await prisma.subscription.update({
          where: { userId: ctx.userId },
          data: {
            planType: input.planType,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            paymentGateway: 'razorpay',
            gatewaySubscriptionId: razorpaySubscription.id,
            gatewayCustomerId: customer.id,
            gatewayPlanId: planConfig.planId,
            metadata: {
              currency,
              razorpaySubscription: {
                id: razorpaySubscription.id,
                status: razorpaySubscription.status,
                current_start: razorpaySubscription.current_start,
                current_end: razorpaySubscription.current_end,
              },
            } as any,
          },
        });

        await logEvent(
          'subscription.created',
          {
            planType: input.planType,
            subscriptionId: razorpaySubscription.id,
          },
          'subscription',
          updatedSubscription.id,
        );

        return {
          subscriptionId: razorpaySubscription.id,
          checkoutUrl: razorpaySubscription.short_url,
          status: razorpaySubscription.status,
        };
      } catch (error: any) {
        console.error('Error creating checkout session:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create checkout session',
        });
      }
    }),

  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: ctx.userId },
      });

      if (!subscription) {
        return { status: 'no_subscription' };
      }

      // If Razorpay subscription exists, fetch latest status
      if (
        subscription.gatewaySubscriptionId &&
        subscription.paymentGateway === 'razorpay'
      ) {
        try {
          const razorpaySub = await getSubscription(
            subscription.gatewaySubscriptionId,
          );
          return {
            status: razorpaySub.status,
            subscriptionId: subscription.id,
            planType: subscription.planType,
            currentPeriodEnd: subscription.currentPeriodEnd,
            razorpayStatus: razorpaySub.status,
          };
        } catch (error) {
          // If fetching fails, return our DB status
          return {
            status: subscription.status,
            subscriptionId: subscription.id,
            planType: subscription.planType,
            currentPeriodEnd: subscription.currentPeriodEnd,
          };
        }
      }

      return {
        status: subscription.status,
        subscriptionId: subscription.id,
        planType: subscription.planType,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return { status: 'error' };
    }
  }),

  cancelSubscription: protectedProcedure
    .input(
      z.object({
        cancelAtPeriodEnd: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const subscription = await prisma.subscription.findUnique({
          where: { userId: ctx.userId },
        });

        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No subscription found',
          });
        }

        if (
          !subscription.gatewaySubscriptionId ||
          subscription.paymentGateway !== 'razorpay'
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No active payment subscription to cancel',
          });
        }

        // Cancel Razorpay subscription
        await cancelRazorpaySubscription(
          subscription.gatewaySubscriptionId,
          input.cancelAtPeriodEnd,
        );

        // Update our subscription
        const updated = await prisma.subscription.update({
          where: { userId: ctx.userId },
          data: {
            status: input.cancelAtPeriodEnd ? 'active' : 'cancelled',
            canceledAt: input.cancelAtPeriodEnd ? null : new Date(),
            metadata: {
              ...((subscription.metadata as any) || {}),
              cancelled: true,
              cancelledAt: new Date().toISOString(),
              cancelAtPeriodEnd: input.cancelAtPeriodEnd,
            } as any,
          },
        });

        await logEvent(
          'subscription.cancelled',
          {
            cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          },
          'subscription',
          subscription.id,
        );

        return { ok: true, subscription: updated };
      } catch (error: any) {
        console.error('Error canceling subscription:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to cancel subscription',
        });
      }
    }),

  // AI Insights - aggregate data and generate suggestions
  getAggregatedInsights: aiProcedure
    .input(z.object({ shop: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const connections = await prisma.connection.findMany({
          where: { userId: ctx.userId },
          select: { id: true, shopDomain: true, type: true },
        });

        const connectionIds = connections.map((c) => c.id);

        if (connectionIds.length === 0) {
          return { shopifyMetrics: null, emailMetrics: null };
        }

        // Time ranges
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Shopify metrics
        let shopifyMetrics: any = null;
        const shopifyConn = connections.find((c) => c.type === 'SHOPIFY');

        if (shopifyConn) {
          const shopDomain = input?.shop || shopifyConn.shopDomain;

          // Current week orders
          const ordersThisWeek = await prisma.order.findMany({
            where: {
              connectionId: shopifyConn.id,
              createdAt: { gte: weekAgo },
            },
            select: { totalAmount: true, status: true },
          });

          // Previous week orders for comparison
          const ordersPrevWeek = await prisma.order.findMany({
            where: {
              connectionId: shopifyConn.id,
              createdAt: { gte: twoWeeksAgo, lt: weekAgo },
            },
            select: { totalAmount: true, status: true },
          });

          const revenueThisWeek = ordersThisWeek.reduce(
            (sum, o) => sum + o.totalAmount / 100,
            0,
          );
          const revenuePrevWeek = ordersPrevWeek.reduce(
            (sum, o) => sum + o.totalAmount / 100,
            0,
          );

          const revenueChange =
            revenuePrevWeek > 0
              ? ((revenueThisWeek - revenuePrevWeek) / revenuePrevWeek) * 100
              : 0;

          const ordersChange =
            ordersPrevWeek.length > 0
              ? ((ordersThisWeek.length - ordersPrevWeek.length) /
                  ordersPrevWeek.length) *
                100
              : 0;

          // Count refunds (assuming REFUNDED status)
          const refundsThisWeek = ordersThisWeek.filter((o) =>
            o.status?.toLowerCase().includes('refund'),
          ).length;
          const refundRate =
            ordersThisWeek.length > 0
              ? (refundsThisWeek / ordersThisWeek.length) * 100
              : 0;

          const avgOrderValue =
            ordersThisWeek.length > 0
              ? revenueThisWeek / ordersThisWeek.length
              : 0;

          shopifyMetrics = {
            totalRevenue: revenueThisWeek,
            totalOrders: ordersThisWeek.length,
            avgOrderValue,
            refundRate,
            fulfillmentTime: 2.5, // Placeholder - would need fulfillment data
            weekOverWeekChange: {
              revenue: revenueChange,
              orders: ordersChange,
              refunds: refundRate,
            },
          };
        }

        // Email metrics
        let emailMetrics: any = null;
        const emailConns = connections.filter((c) => c.type === 'CUSTOM_EMAIL');

        if (emailConns.length > 0) {
          // Current week emails
          const emailsThisWeek = await prisma.message.count({
            where: {
              direction: 'INBOUND',
              createdAt: { gte: weekAgo },
              thread: { connectionId: { in: connectionIds } },
            },
          });

          const emailsPrevWeek = await prisma.message.count({
            where: {
              direction: 'INBOUND',
              createdAt: { gte: twoWeeksAgo, lt: weekAgo },
              thread: { connectionId: { in: connectionIds } },
            },
          });

          const volumeChange =
            emailsPrevWeek > 0
              ? ((emailsThisWeek - emailsPrevWeek) / emailsPrevWeek) * 100
              : 0;

          // Get recent messages for sentiment/complaint analysis
          const recentMessages = await prisma.message.findMany({
            where: {
              direction: 'INBOUND',
              createdAt: { gte: weekAgo },
              thread: { connectionId: { in: connectionIds } },
            },
            select: { body: true },
            take: 50,
          });

          // Simple sentiment analysis based on keywords
          let negativeSentimentCount = 0;
          const complaintKeywords: { [key: string]: number } = {};

          for (const msg of recentMessages) {
            const body = msg.body?.toLowerCase() || '';

            // Negative sentiment keywords
            if (
              body.match(
                /\b(angry|disappointed|frustrated|terrible|worst|horrible|awful)\b/,
              )
            ) {
              negativeSentimentCount++;
            }

            // Track complaint topics
            if (body.includes('discount') || body.includes('coupon')) {
              complaintKeywords['discount issues'] =
                (complaintKeywords['discount issues'] || 0) + 1;
            }
            if (body.includes('shipping') || body.includes('delivery')) {
              complaintKeywords['shipping delays'] =
                (complaintKeywords['shipping delays'] || 0) + 1;
            }
            if (body.includes('refund') || body.includes('return')) {
              complaintKeywords['refund requests'] =
                (complaintKeywords['refund requests'] || 0) + 1;
            }
            if (
              body.includes('quality') ||
              body.includes('damaged') ||
              body.includes('defective')
            ) {
              complaintKeywords['product quality'] =
                (complaintKeywords['product quality'] || 0) + 1;
            }
          }

          const sentimentScore =
            recentMessages.length > 0
              ? (negativeSentimentCount / recentMessages.length) * -1
              : 0;

          const topComplaints = Object.entries(complaintKeywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([topic]) => topic);

          // Calculate avg response time
          const messagesWithResponses = await prisma.message.findMany({
            where: {
              direction: 'INBOUND',
              createdAt: { gte: weekAgo },
              thread: { connectionId: { in: connectionIds } },
              order: { actions: { some: {} } },
            },
            include: {
              order: {
                include: {
                  actions: { orderBy: { createdAt: 'asc' }, take: 1 },
                },
              },
            },
            take: 50,
          });

          let totalResponseMinutes = 0;
          let responseCount = 0;

          for (const msg of messagesWithResponses) {
            const firstAction = msg.order?.actions[0];
            if (firstAction) {
              const diffMs =
                firstAction.createdAt.getTime() - msg.createdAt.getTime();
              const diffMinutes = diffMs / (1000 * 60);
              if (diffMinutes >= 0 && diffMinutes < 10000) {
                totalResponseMinutes += diffMinutes;
                responseCount++;
              }
            }
          }

          const avgResponseTime =
            responseCount > 0 ? totalResponseMinutes / responseCount : 0;

          emailMetrics = {
            totalEmails: emailsThisWeek,
            avgResponseTime,
            sentimentScore,
            topComplaints,
            weekOverWeekChange: {
              volume: volumeChange,
              negativeSentiment:
                negativeSentimentCount > 0
                  ? (negativeSentimentCount / recentMessages.length) * 100
                  : 0,
            },
          };
        }

        return { shopifyMetrics, emailMetrics };
      } catch (error) {
        console.error('Error fetching aggregated insights:', error);
        return { shopifyMetrics: null, emailMetrics: null };
      }
    }),

  // Playbook Management
  getPlaybooks: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          seedDefaults: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        // Auto-seed default playbooks if user has none and seedDefaults is true
        if (input?.seedDefaults) {
          const existingCount = await prisma.playbook.count({
            where: { userId: ctx.userId },
          });

          if (existingCount === 0) {
            // Import and seed default playbooks
            const { seedDefaultPlaybooks } = await import('@ai-ecom/db');
            await seedDefaultPlaybooks(ctx.userId);
          }
        }

        const where: any = { userId: ctx.userId };
        if (input?.category) {
          where.category = input.category;
        }

        const playbooks = await prisma.playbook.findMany({
          where,
          orderBy: [
            { isDefault: 'desc' },
            { enabled: 'desc' },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            trigger: true,
            conditions: true,
            actions: true,
            confidenceThreshold: true,
            requiresApproval: true,
            enabled: true,
            isDefault: true,
            executionCount: true,
            lastExecutedAt: true,
            createdAt: true,
          },
        });

        return { playbooks };
      } catch (error) {
        console.error('Error fetching playbooks:', error);
        return { playbooks: [] };
      }
    }),

  createPlaybook: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        category: z.enum([
          'REFUND_RETURN',
          'MARKETING',
          'FULFILLMENT',
          'SUPPORT',
          'INVENTORY',
          'CUSTOM',
        ]),
        trigger: z.any(),
        conditions: z.any(),
        actions: z.any(),
        confidenceThreshold: z.number().min(0).max(1).default(0.8),
        requiresApproval: z.boolean().default(false),
        enabled: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const playbook = await prisma.playbook.create({
          data: {
            userId: ctx.userId,
            name: sanitizeLimited(input.name, 100),
            description: input.description
              ? sanitizeLimited(input.description, 500)
              : null,
            category: input.category,
            trigger: input.trigger,
            conditions: input.conditions,
            actions: input.actions,
            confidenceThreshold: input.confidenceThreshold,
            requiresApproval: input.requiresApproval,
            enabled: input.enabled,
          },
        });

        await logEvent(
          'playbook.created',
          { playbookId: playbook.id, category: input.category },
          'playbook',
          playbook.id,
        );

        return { playbook };
      } catch (error: any) {
        console.error('Error creating playbook:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create playbook',
        });
      }
    }),

  updatePlaybook: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        trigger: z.any().optional(),
        conditions: z.any().optional(),
        actions: z.any().optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        requiresApproval: z.boolean().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify ownership
        const existing = await prisma.playbook.findFirst({
          where: { id: input.id, userId: ctx.userId },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Playbook not found or access denied',
          });
        }

        // Don't allow editing default playbooks
        if (existing.isDefault) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Cannot edit default playbooks. Clone it to create your own version.',
          });
        }

        const updateData: any = {};
        if (input.name !== undefined)
          updateData.name = sanitizeLimited(input.name, 100);
        if (input.description !== undefined)
          updateData.description = input.description
            ? sanitizeLimited(input.description, 500)
            : null;
        if (input.trigger !== undefined) updateData.trigger = input.trigger;
        if (input.conditions !== undefined)
          updateData.conditions = input.conditions;
        if (input.actions !== undefined) updateData.actions = input.actions;
        if (input.confidenceThreshold !== undefined)
          updateData.confidenceThreshold = input.confidenceThreshold;
        if (input.requiresApproval !== undefined)
          updateData.requiresApproval = input.requiresApproval;
        if (input.enabled !== undefined) updateData.enabled = input.enabled;

        const playbook = await prisma.playbook.update({
          where: { id: input.id },
          data: updateData,
        });

        await logEvent(
          'playbook.updated',
          { playbookId: playbook.id },
          'playbook',
          playbook.id,
        );

        return { playbook };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating playbook:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update playbook',
        });
      }
    }),

  deletePlaybook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify ownership
        const existing = await prisma.playbook.findFirst({
          where: { id: input.id, userId: ctx.userId },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Playbook not found or access denied',
          });
        }

        // Don't allow deleting default playbooks
        if (existing.isDefault) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot delete default playbooks. Disable it instead.',
          });
        }

        await prisma.playbook.delete({
          where: { id: input.id },
        });

        await logEvent(
          'playbook.deleted',
          { playbookId: input.id },
          'playbook',
          input.id,
        );

        return { ok: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error deleting playbook:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete playbook',
        });
      }
    }),

  clonePlaybook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify access (can clone any playbook, including defaults)
        const existing = await prisma.playbook.findFirst({
          where: { id: input.id },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Playbook not found',
          });
        }

        const playbook = await prisma.playbook.create({
          data: {
            userId: ctx.userId,
            name: `${existing.name} (Copy)`,
            description: existing.description,
            category: existing.category,
            trigger: existing.trigger as any,
            conditions: existing.conditions as any,
            actions: existing.actions as any,
            confidenceThreshold: existing.confidenceThreshold,
            requiresApproval: existing.requiresApproval,
            enabled: false, // Cloned playbooks start disabled
            isDefault: false, // Clones are never defaults
          },
        });

        await logEvent(
          'playbook.cloned',
          { sourceId: input.id, newId: playbook.id },
          'playbook',
          playbook.id,
        );

        return { playbook };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error cloning playbook:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to clone playbook',
        });
      }
    }),

  getPlaybookExecutions: protectedProcedure
    .input(
      z.object({
        playbookId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const where: any = {};

        if (input.playbookId) {
          // Verify user owns the playbook
          const playbook = await prisma.playbook.findFirst({
            where: { id: input.playbookId, userId: ctx.userId },
          });

          if (!playbook) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Playbook not found or access denied',
            });
          }

          where.playbookId = input.playbookId;
        } else {
          // Get all playbooks owned by user
          const userPlaybooks = await prisma.playbook.findMany({
            where: { userId: ctx.userId },
            select: { id: true },
          });

          where.playbookId = {
            in: userPlaybooks.map((p: { id: string }) => p.id),
          };
        }

        const executions = await prisma.playbookExecution.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          include: {
            playbook: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        });

        return { executions };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error fetching playbook executions:', error);
        return { executions: [] };
      }
    }),
  // Meta Ads Integration
  connectMetaAds: protectedProcedure
    .input(
      z.object({
        accessToken: z.string().min(1, 'Access token is required'),
        adAccountId: z.string().min(1, 'Ad account ID is required'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify token by making a test API call
        const testResponse = await fetch(
          `https://graph.facebook.com/v18.0/${input.adAccountId}?fields=id,name,account_status&access_token=${input.accessToken}`,
        );
        if (!testResponse.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid access token or ad account ID',
          });
        }

        // Check if connection already exists
        const existing = await prisma.connection.findFirst({
          where: {
            userId: ctx.userId,
            type: 'META_ADS',
          } as any,
        });

        const encryptedToken = encryptSecure(input.accessToken);
        const metadata = {
          adAccountId: input.adAccountId,
          connectedAt: new Date().toISOString(),
        };

        if (existing) {
          // Update existing connection
          const updated = await prisma.connection.update({
            where: { id: existing.id },
            data: {
              accessToken: encryptedToken,
              metadata,
              updatedAt: new Date(),
            },
          });
          await logEvent(
            'ads.meta.connected',
            { adAccountId: input.adAccountId },
            'connection',
            ctx.userId,
          );
          return { connection: updated };
        } else {
          // Create new connection
          const created = await prisma.connection.create({
            data: {
              userId: ctx.userId,
              type: 'META_ADS' as any,
              accessToken: encryptedToken,
              metadata,
            },
          });
          await logEvent(
            'ads.meta.connected',
            { adAccountId: input.adAccountId },
            'connection',
            ctx.userId,
          );
          return { connection: created };
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error connecting Meta Ads:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to connect Meta Ads',
        });
      }
    }),
  // Google Ads Integration
  connectGoogleAds: protectedProcedure
    .input(
      z.object({
        clientId: z.string().min(1, 'Client ID is required'),
        clientSecret: z.string().min(1, 'Client secret is required'),
        refreshToken: z.string().min(1, 'Refresh token is required'),
        customerId: z.string().min(1, 'Customer ID is required'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify credentials by getting access token
        const tokenResponse = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: input.clientId,
              client_secret: input.clientSecret,
              refresh_token: input.refreshToken,
              grant_type: 'refresh_token',
            }),
          },
        );

        if (!tokenResponse.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid Google Ads credentials',
          });
        }

        const tokenData = (await tokenResponse.json()) as {
          access_token: string;
        };

        // Check if connection already exists
        const existing = await prisma.connection.findFirst({
          where: {
            userId: ctx.userId,
            type: 'GOOGLE_ADS',
          } as any,
        });

        const encryptedAccessToken = encryptSecure(tokenData.access_token);
        const encryptedRefreshToken = encryptSecure(input.refreshToken);
        const metadata = {
          clientId: input.clientId,
          customerId: input.customerId,
          connectedAt: new Date().toISOString(),
        };

        if (existing) {
          // Update existing connection
          const updated = await prisma.connection.update({
            where: { id: existing.id },
            data: {
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              metadata,
              updatedAt: new Date(),
            },
          });
          await logEvent(
            'ads.google.connected',
            { customerId: input.customerId },
            'connection',
            ctx.userId,
          );
          return { connection: updated };
        } else {
          // Create new connection
          const created = await prisma.connection.create({
            data: {
              userId: ctx.userId,
              type: 'GOOGLE_ADS' as any,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              metadata,
            },
          });
          await logEvent(
            'ads.google.connected',
            { customerId: input.customerId },
            'connection',
            ctx.userId,
          );
          return { connection: created };
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('Error connecting Google Ads:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to connect Google Ads',
        });
      }
    }),
  // Get Meta Ads Data
  getMetaAdsData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS',
        } as any,
      });

      if (!connection) {
        return { campaigns: [], adsets: [] };
      }

      const accessToken = decryptSecure(connection.accessToken);
      const metadata = (connection.metadata as Record<string, unknown>) || {};
      const adAccountId = (metadata.adAccountId as string) || '';

      if (!adAccountId) {
        return { campaigns: [], adsets: [] };
      }

      // Fetch campaigns
      const campaignsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status,objective,spend,impressions,clicks,ctr,cpc,cpm&limit=50&access_token=${accessToken}`,
      );

      let campaigns: any[] = [];
      if (campaignsResponse.ok) {
        const campaignsData = (await campaignsResponse.json()) as {
          data: any[];
        };
        campaigns = campaignsData.data || [];
      }

      // Fetch adsets
      const adsetsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/adsets?fields=id,name,status,campaign_id,spend,impressions,clicks,ctr,cpc,cpm&limit=50&access_token=${accessToken}`,
      );

      let adsets: any[] = [];
      if (adsetsResponse.ok) {
        const adsetsData = (await adsetsResponse.json()) as { data: any[] };
        adsets = adsetsData.data || [];
      }

      return { campaigns, adsets };
    } catch (error: any) {
      console.error('Error fetching Meta Ads data:', error);
      return { campaigns: [], adsets: [] };
    }
  }),
  // Get Google Ads Data
  getGoogleAdsData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'GOOGLE_ADS',
        } as any,
      });

      if (!connection) {
        return { campaigns: [] };
      }

      const accessToken = decryptSecure(connection.accessToken);
      const metadata = (connection.metadata as Record<string, unknown>) || {};
      const customerId = (metadata.customerId as string) || '';

      if (!customerId) {
        return { campaigns: [] };
      }

      // Fetch campaigns using Google Ads API
      // Note: This is a simplified version. Real implementation would use google-ads-api library
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros / 1000000.0 as cost
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY metrics.impressions DESC
        LIMIT 50
      `;

      // For now, return empty array. Real implementation would use Google Ads API client
      // This requires the google-ads-api npm package
      return { campaigns: [] };
    } catch (error: any) {
      console.error('Error fetching Google Ads data:', error);
      return { campaigns: [] };
    }
  }),
  // Disconnect Ads Connection
  disconnectAdsConnection: protectedProcedure
    .input(z.object({ type: z.enum(['META_ADS', 'GOOGLE_ADS']) }))
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: input.type,
        } as any,
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found',
        });
      }

      await prisma.connection.delete({
        where: { id: connection.id },
      });

      await logEvent(
        `ads.${input.type.toLowerCase()}.disconnected`,
        {},
        'connection',
        ctx.userId,
      );
      return { success: true };
    }),
  // Get Meta Ads Accounts
  getMetaAdsAccounts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS',
        } as any,
      });

      if (!connection) {
        return { accounts: [] };
      }

      // Pass encrypted tokens - listAdAccounts will handle decryption and refresh
      const accessToken = connection.accessToken; // Keep encrypted
      const refreshToken = connection.refreshToken; // Keep encrypted (exchange token)

      let accounts: MetaAdAccount[] = [];

      try {
        accounts = await listAdAccounts(accessToken, refreshToken);

        // If we got accounts but metadata doesn't have adAccountId, save the first one
        if (accounts.length > 0) {
          const metadata =
            (connection.metadata as Record<string, unknown>) || {};
          const metadataAdAccountId = metadata.adAccountId as
            | string
            | undefined;

          if (!metadataAdAccountId) {
            // Save first account to metadata for future use
            const firstAccount = accounts[0];
            await prisma.connection.update({
              where: { id: connection.id },
              data: {
                metadata: {
                  ...metadata,
                  adAccountId: firstAccount.adAccountId,
                  adAccountName: firstAccount.adAccountName,
                },
              },
            });
          }
        }
      } catch (listError: any) {
        console.error('[Meta Ads Accounts API] Error in listAdAccounts:', {
          error: listError.message,
          stack: listError.stack,
        });

        // If we have an adAccountId in metadata, return it as a fallback
        const metadata = (connection.metadata as Record<string, unknown>) || {};
        const metadataAdAccountId = metadata.adAccountId as string | undefined;
        const metadataAdAccountName = metadata.adAccountName as
          | string
          | undefined;

        if (metadataAdAccountId) {
          accounts = [
            {
              adAccountId: metadataAdAccountId,
              adAccountName: metadataAdAccountName || metadataAdAccountId,
              accountStatus: 1, // Assume active
            },
          ];
        }
      }

      return { accounts };
    } catch (error: any) {
      console.error('[Meta Ads Accounts API] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch Meta Ads accounts',
      });
    }
  }),
  // Get Meta Ads Insights
  getMetaAdsInsights: protectedProcedure
    .input(
      z.object({
        adAccountId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const connection = await prisma.connection.findFirst({
          where: {
            userId: ctx.userId,
            type: 'META_ADS',
          } as any,
        });

        if (!connection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Meta Ads not connected',
          });
        }

        const metadata = (connection.metadata as Record<string, unknown>) || {};
        const adAccountId =
          input.adAccountId || (metadata.adAccountId as string) || '';

        if (!adAccountId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'No ad account selected. Please select an ad account first.',
          });
        }

        // Default to last 7 days if not specified
        const endDate = input.endDate || new Date().toISOString().split('T')[0];
        const startDate =
          input.startDate ||
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        // Pass encrypted tokens - fetchMetaAdsInsights will handle decryption and refresh
        const accessToken = connection.accessToken; // Keep encrypted
        const refreshToken = connection.refreshToken; // Keep encrypted (exchange token)

        const insights = await fetchMetaAdsInsights(
          adAccountId,
          accessToken,
          refreshToken,
          startDate,
          endDate,
        );

        return insights;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error('[Meta Ads Insights API] Error:', error);

        // Handle specific error cases
        let errorCode:
          | 'UNAUTHORIZED'
          | 'TOO_MANY_REQUESTS'
          | 'BAD_REQUEST'
          | 'INTERNAL_SERVER_ERROR' = 'INTERNAL_SERVER_ERROR';
        let errorMessage = error.message || 'Failed to fetch Meta Ads insights';

        if (errorMessage.includes('expired') || errorMessage.includes('190')) {
          errorCode = 'UNAUTHORIZED';
          errorMessage =
            'Access token has expired. Please reconnect your Meta Ads account.';
        } else if (
          errorMessage.includes('rate limit') ||
          errorMessage.includes('10')
        ) {
          errorCode = 'TOO_MANY_REQUESTS';
          errorMessage =
            'Rate limit exceeded. Please try again in a few minutes.';
        } else if (
          errorMessage.includes('permission') ||
          errorMessage.includes('200')
        ) {
          errorCode = 'UNAUTHORIZED';
          errorMessage =
            'Invalid permissions. Please reconnect with proper permissions (ads_read required).';
        }

        throw new TRPCError({
          code: errorCode,
          message: errorMessage,
        });
      }
    }),
  // Update Meta Ads Account Selection
  updateMetaAdsAccount: protectedProcedure
    .input(
      z.object({
        adAccountId: z.string().min(1, 'Ad account ID is required'),
        adAccountName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS' as any,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meta Ads connection not found',
        });
      }

      const metadata = (connection.metadata as Record<string, unknown>) || {};
      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          metadata: {
            ...metadata,
            adAccountId: input.adAccountId,
            adAccountName: input.adAccountName || input.adAccountId,
          },
        },
      });

      return { success: true };
    }),
  // Disconnect Meta Ads
  disconnectMetaAds: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await prisma.connection.findFirst({
      where: {
        userId: ctx.userId,
        type: 'META_ADS',
      } as any,
    });

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Meta Ads connection not found',
      });
    }

    await prisma.connection.delete({
      where: { id: connection.id },
    });

    await logEvent('meta_ads.disconnected', {}, 'connection', ctx.userId);
    return { success: true };
  }),
  // Pause or activate a campaign
  pauseCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().min(1),
        status: z.enum(['PAUSED', 'ACTIVE']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS',
        } as any,
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meta Ads connection not found',
        });
      }

      const result = await updateCampaignStatus(
        input.campaignId,
        input.status,
        connection.accessToken,
        connection.refreshToken,
      );

      await logEvent(
        `meta_ads.campaign.${input.status.toLowerCase()}`,
        { campaignId: input.campaignId },
        'connection',
        connection.id,
      );

      return result;
    }),
  // Pause or activate an ad set
  pauseAdSet: protectedProcedure
    .input(
      z.object({
        adSetId: z.string().min(1),
        status: z.enum(['PAUSED', 'ACTIVE']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS',
        } as any,
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meta Ads connection not found',
        });
      }

      const result = await updateAdSetStatus(
        input.adSetId,
        input.status,
        connection.accessToken,
        connection.refreshToken,
      );

      await logEvent(
        `meta_ads.adset.${input.status.toLowerCase()}`,
        { adSetId: input.adSetId },
        'connection',
        connection.id,
      );

      return result;
    }),
  // Scale campaign budget
  scaleCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().min(1),
        dailyBudget: z.number().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS',
        } as any,
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meta Ads connection not found',
        });
      }

      const result = await updateCampaignBudget(
        input.campaignId,
        input.dailyBudget,
        connection.accessToken,
        connection.refreshToken,
      );

      await logEvent(
        'meta_ads.campaign.budget_updated',
        {
          campaignId: input.campaignId,
          dailyBudget: input.dailyBudget,
        },
        'connection',
        connection.id,
      );

      return result;
    }),
  // Create optimized ad set
  createOptimizedAdSet: protectedProcedure
    .input(
      z.object({
        adAccountId: z.string().min(1),
        campaignId: z.string().min(1),
        sourceAdSetId: z.string().min(1),
        name: z.string().min(1),
        dailyBudget: z.number().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'META_ADS',
        } as any,
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meta Ads connection not found',
        });
      }

      const result = await createOptimizedAdSet(
        input.adAccountId,
        input.campaignId,
        input.sourceAdSetId,
        input.name,
        input.dailyBudget,
        connection.accessToken,
        connection.refreshToken,
      );

      await logEvent(
        'meta_ads.adset.created',
        {
          adSetId: result.id,
          campaignId: input.campaignId,
          sourceAdSetId: input.sourceAdSetId,
        },
        'connection',
        connection.id,
      );

      return result;
    }),
  // Get Google Analytics Properties
  getGoogleAnalyticsProperties: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'GOOGLE_ANALYTICS',
        } as any,
      });

      if (!connection) {
        return { properties: [] };
      }

      // Pass encrypted tokens - listGA4Properties will handle decryption and refresh via getValidAccessToken
      const accessToken = connection.accessToken; // Keep encrypted
      const refreshToken = connection.refreshToken; // Keep encrypted

      let properties: GA4Property[] = [];

      try {
        // listGA4Properties will call getValidAccessToken which handles token refresh automatically
        properties = await listGA4Properties(accessToken, refreshToken);

        // If we got properties but metadata doesn't have propertyId, save the first one
        if (properties.length > 0) {
          const metadata =
            (connection.metadata as Record<string, unknown>) || {};
          const metadataPropertyId = metadata.propertyId as string | undefined;

          if (!metadataPropertyId) {
            // Save first property to metadata for future use
            const firstProperty = properties[0];
            await prisma.connection.update({
              where: { id: connection.id },
              data: {
                metadata: {
                  ...metadata,
                  propertyId: firstProperty.propertyId,
                  propertyName: firstProperty.propertyName,
                  accountId: firstProperty.accountId,
                },
              },
            });
          }
        }
      } catch (listError: any) {
        console.error('[GA Properties API] Error in listGA4Properties:', {
          error: listError.message,
          stack: listError.stack,
        });

        // If we have a propertyId in metadata, return it as a fallback
        const metadata = (connection.metadata as Record<string, unknown>) || {};
        const metadataPropertyId = metadata.propertyId as string | undefined;
        const metadataPropertyName = metadata.propertyName as
          | string
          | undefined;
        const metadataAccountId = metadata.accountId as string | undefined;

        if (metadataPropertyId) {
          properties = [
            {
              propertyId: metadataPropertyId,
              propertyName: metadataPropertyName || metadataPropertyId,
              accountId: metadataAccountId || '',
            },
          ];
        } else {
          // If we have accountId but no propertyId, try to fetch properties for that account
          if (metadataAccountId) {
            try {
              const accountProperties = await listGA4Properties(
                accessToken,
                refreshToken,
              );
              if (accountProperties.length > 0) {
                properties = accountProperties;
                // Save first property to metadata
                const firstProperty = properties[0];
                await prisma.connection.update({
                  where: { id: connection.id },
                  data: {
                    metadata: {
                      ...metadata,
                      propertyId: firstProperty.propertyId,
                      propertyName: firstProperty.propertyName,
                    },
                  },
                });
              }
            } catch (retryError: any) {
              console.error(
                '[GA Properties API] Retry also failed:',
                retryError.message,
              );
            }
          }

          // If still no properties, re-throw the original error
          if (properties.length === 0) {
            throw listError;
          }
        }
      }

      return { properties };
    } catch (error: any) {
      console.error('[GA Properties API] Error fetching GA4 properties:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Re-throw the error so the client can see it
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch Google Analytics properties',
        cause: error,
      });
    }
  }),
  // Get Google Analytics Data
  getGoogleAnalyticsData: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log('[GA API] Fetching analytics data:', {
          userId: ctx.userId,
          inputPropertyId: input.propertyId,
          hasStartDate: !!input.startDate,
          hasEndDate: !!input.endDate,
        });

        const connection = await prisma.connection.findFirst({
          where: {
            userId: ctx.userId,
            type: 'GOOGLE_ANALYTICS',
          } as any,
        });

        if (!connection) {
          console.error('[GA API] No connection found for user:', ctx.userId);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Google Analytics not connected',
          });
        }

        const metadata = (connection.metadata as Record<string, unknown>) || {};
        const propertyId =
          input.propertyId || (metadata.propertyId as string) || '';

        if (!propertyId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'No GA4 property ID specified. Please select a property from the dropdown.',
          });
        }

        // Clean property ID - remove 'properties/' prefix if present
        const cleanPropertyId = propertyId.replace(/^properties\//, '');

        // Default to last 7 days
        const endDate = input.endDate || new Date().toISOString().split('T')[0];
        const startDate =
          input.startDate ||
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        // Pass encrypted tokens - fetchGA4Analytics will handle decryption and refresh
        const accessToken = connection.accessToken; // Keep encrypted
        const refreshToken = connection.refreshToken; // Keep encrypted

        const analyticsData = await fetchGA4Analytics(
          cleanPropertyId,
          accessToken,
          refreshToken,
          startDate,
          endDate,
        );

        return analyticsData;
      } catch (error: any) {
        console.error('[GA API] Error fetching GA4 analytics:', error.message);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch Google Analytics data',
        });
      }
    }),
  // Update Google Analytics Property Selection
  updateGoogleAnalyticsProperty: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        propertyName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId,
          type: 'GOOGLE_ANALYTICS' as any,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Google Analytics not connected',
        });
      }

      const metadata = (connection.metadata as Record<string, unknown>) || {};
      const updatedMetadata = {
        ...metadata,
        propertyId: input.propertyId,
        propertyName:
          input.propertyName ||
          (typeof metadata.propertyName === 'string'
            ? metadata.propertyName
            : undefined),
      };

      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          metadata: updatedMetadata,
        },
      });

      return { success: true };
    }),
  // Disconnect Google Analytics
  disconnectGoogleAnalytics: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await prisma.connection.findFirst({
      where: {
        userId: ctx.userId,
        type: 'GOOGLE_ANALYTICS',
      } as any,
    });

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Google Analytics connection not found',
      });
    }

    // Revoke OAuth tokens from Google before deleting the connection
    if (connection.refreshToken) {
      try {
        const decryptedRefreshToken = decryptSecure(connection.refreshToken);

        // Revoke the refresh token (this also invalidates the access token)
        const revokeRes = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: decryptedRefreshToken,
          }),
        });

        if (!revokeRes.ok) {
          const errorText = await revokeRes.text();
          console.warn(
            '[GA Disconnect] Failed to revoke tokens from Google:',
            errorText,
          );
          // Continue with deletion even if revocation fails (token might already be invalid)
        }
      } catch (error: any) {
        console.warn('[GA Disconnect] Error revoking tokens:', error.message);
        // Continue with deletion even if revocation fails
      }
    }

    // Delete the connection from database
    await prisma.connection.delete({
      where: { id: connection.id },
    });

    await logEvent(
      'google_analytics.disconnected',
      {},
      'connection',
      ctx.userId,
    );
    return { success: true };
  }),
});

export type AppRouter = typeof appRouter;
