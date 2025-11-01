import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  prisma,
  logEvent,
  getUsageSummary,
  getUsageHistory,
  canSendEmail,
  PLAN_LIMITS,
  ensureSubscription,
  incrementEmailSent,
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
import { decryptSecure } from './crypto';
import {
  sanitizeLimited,
  safeEmail,
  safeShopDomain,
  clampNumber,
} from './validation';

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

export { encryptSecure, decryptSecure } from './crypto';

export const appRouter = t.router({
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
  threadsList: protectedProcedure
    .input(
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input }) => {
      try {
        const take = clampNumber(input?.take ?? 20, 1, 100);
        const threads = await prisma.thread.findMany({
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
    .query(async ({ input }) => {
      try {
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
      } catch {
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
      const short = Math.random().toString(36).slice(2, 8);
      const alias = `in+${existing.userId.slice(0, 6)}-${short}@${domain}`;
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
  emailHealth: protectedProcedure.query(async () => {
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
  createEmailAlias: protectedProcedure
    .input(
      z.object({
        userEmail: z.string().email(),
        domain: z.string().min(3),
        shop: z.string().min(3),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const cleanEmail = safeEmail(input.userEmail);
      const cleanShop = safeShopDomain(input.shop);
      const domain = sanitizeLimited(input.domain, 255);
      if (!cleanEmail || !cleanShop) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid email or shop domain',
        });
      }
      // Verify user owns the shop connection
      const shopConnection = await prisma.connection.findFirst({
        where: {
          shopDomain: cleanShop,
          userId: ctx.userId,
          type: 'SHOPIFY',
        },
      });

      if (!shopConnection) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Shop access denied',
        });
      }

      // Create or ensure user exists
      const owner = await prisma.user.upsert({
        where: { email: cleanEmail },
        create: { email: cleanEmail },
        update: {},
      });

      // If an alias already exists for this shop, return it
      const existing = await prisma.connection.findFirst({
        where: {
          userId: ctx.userId, // Multi-tenant scoping
          type: 'CUSTOM_EMAIL' as any,
          AND: [
            { metadata: { path: ['shopDomain'], equals: cleanShop } } as any,
          ],
        },
      });
      if (existing) {
        return { id: existing.id, alias: (existing.metadata as any)?.alias };
      }

      const short = Math.random().toString(36).slice(2, 6);
      const shopSlug = cleanShop
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8)
        .toLowerCase();
      const alias = `in+${shopSlug}-${short}@${domain}`;
      const webhookSecret =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);

      const conn = await prisma.connection.create({
        data: {
          type: 'CUSTOM_EMAIL' as any,
          accessToken: webhookSecret, // store secret in accessToken for simplicity
          userId: owner.id,
          metadata: {
            alias,
            provider: 'CUSTOM',
            domain,
            verifiedAt: null,
            shopDomain: cleanShop,
          } as any,
        },
        select: { id: true },
      });

      await logEvent('email.alias.created', { alias }, 'connection', conn.id);
      return { id: conn.id, alias };
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
        const connectionIds = connections.map((c) => c.id);

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
        const resp = await fetch(
          `https://${cleanShop}/admin/api/2024-07/orders/${input.orderId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': decryptSecure(conn.accessToken),
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
    .mutation(async ({ input }) => {
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

      if (!apiKey) {
        // Enhanced fallback response
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
        body += `Best regards,\nCustomer Support Team`;

        return { suggestion: body };
      }

      // Enhanced OpenAI prompt for better replies
      const orderContext = orderSummary
        ? `Order Details: ${orderSummary}`
        : 'No specific order referenced - customer may need to provide order number';

      const prompt = `You are a professional customer support representative for an e-commerce store. Write a personalized, empathetic, and helpful reply to the customer's message.

Guidelines:
- Be ${input.tone} and professional
- Acknowledge their specific concern
- Use their name if available (${customerName})
- Reference their order details if available
- Provide clear next steps
- Show understanding and empathy
- Keep it conversational but professional
- Address their specific request directly
- Offer specific solutions

${orderContext}

Customer Message: ${input.customerMessage}

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

Write responses that sound like they come from a real human support agent who genuinely cares about helping the customer.`,
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
        const suggestion =
          json.choices?.[0]?.message?.content ??
          `Hi ${customerName},\n\nThank you for reaching out! I'm here to help you with your inquiry. I'll review your message and get back to you with a detailed response shortly.\n\nBest regards,\nCustomer Support Team`;

        return { suggestion };
      } catch (error) {
        console.error('OpenAI API error:', error);

        // Fallback response
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
        body += `Best regards,\nCustomer Support Team`;

        return { suggestion: body };
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
        const body = sanitizeLimited(input.body, 20000);
        // Verify user owns the action (via order -> connection)
        const action = await prisma.action.findUnique({
          where: { id: input.actionId },
          include: { order: { include: { connection: true } } },
        });

        if (!action || action.order.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Action access denied',
          });
        }

        // Check usage limits before sending
        const limitCheck = await canSendEmail(ctx.userId);
        if (!limitCheck.allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Email limit reached (${limitCheck.current}/${limitCheck.limit}). Please upgrade your plan to send more emails.`,
          });
        }

        // Send email via Mailgun
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        const fromEmail = process.env.MAILGUN_FROM_EMAIL || `support@${domain}`;

        if (apiKey && domain) {
          const formData = new FormData();
          formData.append('from', fromEmail);
          formData.append('to', toEmail);
          formData.append('subject', subject);
          formData.append('text', body);

          const response = await fetch(
            `https://api.mailgun.net/v3/${domain}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
              },
              body: formData,
            },
          );

          if (!response.ok) {
            throw new Error(`Mailgun API error: ${response.status}`);
          }

          const result = await response.json();

          // Mark action as executed
          const updated = await prisma.action.update({
            where: { id: input.actionId },
            data: { status: 'EXECUTED', executedAt: new Date() },
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
        } else {
          // Fallback to stub if Mailgun not configured
          const updated = await prisma.action.update({
            where: { id: input.actionId },
            data: { status: 'APPROVED' },
          });

          await logEvent(
            'email.sent.stub',
            {
              to: input.to,
              subject: input.subject,
              reason: 'mailgun_not_configured',
            },
            'action',
            input.actionId,
          );

          // Increment usage tracking even for stubs (they still count)
          await incrementEmailSent(ctx.userId).catch((err) => {
            console.error('Failed to increment email usage:', err);
          });

          return { ok: true, status: updated.status, stub: true };
        }
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
          include: { thread: { include: { connection: true } } },
        });

        if (!message || message.thread.connection.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Message access denied',
          });
        }

        // Check usage limits before sending
        const limitCheck = await canSendEmail(ctx.userId);
        if (!limitCheck.allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Email limit reached (${limitCheck.current}/${limitCheck.limit}). Please upgrade your plan to send more emails.`,
          });
        }

        // Send email via Mailgun
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        const fromEmail = process.env.MAILGUN_FROM_EMAIL || `support@${domain}`;

        if (apiKey && domain) {
          const formData = new FormData();
          formData.append('from', fromEmail);
          formData.append('to', message.from);
          formData.append(
            'subject',
            `Re: ${message.thread.subject || 'Your inquiry'}`,
          );
          formData.append('text', safeBody);

          const response = await fetch(
            `https://api.mailgun.net/v3/${domain}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
              },
              body: formData,
            },
          );

          if (!response.ok) {
            throw new Error(`Mailgun API error: ${response.status}`);
          }

          const result = await response.json();

          // Create outbound message record
          await prisma.message.create({
            data: {
              threadId: message.threadId,
              from: fromEmail,
              to: message.from,
              body: safeBody,
              direction: 'OUTBOUND',
            },
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
        } else {
          await logEvent(
            'email.sent.stub',
            { to: message.from, reason: 'mailgun_not_configured' },
            'message',
            input.messageId,
          );

          // Increment usage tracking even for stubs (they still count)
          await incrementEmailSent(ctx.userId).catch((err) => {
            console.error('Failed to increment email usage:', err);
          });

          return { ok: true, stub: true };
        }
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
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        const take = input?.take ?? 20;
        // Get user's connections to filter messages
        const connections = await prisma.connection.findMany({
          where: { userId: ctx.userId, type: 'CUSTOM_EMAIL' },
          select: { id: true },
        });
        const connectionIds = connections.map((c) => c.id);

        if (connectionIds.length === 0) {
          return { messages: [] };
        }

        const msgs = await prisma.message.findMany({
          where: {
            orderId: null,
            direction: 'INBOUND' as any,
            thread: { connectionId: { in: connectionIds } }, // Multi-tenant scoping
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            threadId: true,
            from: true,
            to: true,
            body: true,
            createdAt: true,
            aiSuggestion: {
              select: { reply: true, proposedAction: true, confidence: true },
            },
          },
        });
        return { messages: msgs };
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

        const url = `https://${input.shop}/admin/api/2024-07/orders/${input.orderId}.json`;
        const resp = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': decryptSecure(conn.accessToken),
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
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user's connections for scoping
      const connections = await prisma.connection.findMany({
        where: { userId: ctx.userId },
        select: { id: true },
      });
      const connectionIds = connections.map((c) => c.id);

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
          (o) =>
            o.status.toLowerCase().includes('fulfilled') ||
            o.status === 'completed',
        ).length;
        const pending = ordersGrouped.filter(
          (o) =>
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
});

export type AppRouter = typeof appRouter;
