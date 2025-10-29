import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { prisma, logEvent } from '@ai-ecom/db';

const t = initTRPC.create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  echo: t.procedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => ({ text: input.text })),
  ordersCount: t.procedure.query(async () => {
    try {
      const count = await prisma.order.count();
      return { count };
    } catch {
      return { count: 0 };
    }
  }),
  threadsList: t.procedure
    .input(
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input }) => {
      try {
        const take = input?.take ?? 20;
        const threads = await prisma.thread.findMany({
          take,
          orderBy: { createdAt: 'desc' },
        });
        return { threads };
      } catch {
        return { threads: [] };
      }
    }),
  threadMessages: t.procedure
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
  connections: t.procedure.query(async () => {
    try {
      const cons = await prisma.connection.findMany({
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
  rotateAlias: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.connection.findUnique({
        where: { id: input.id },
      });
      if (!existing || (existing.type as any) !== 'CUSTOM_EMAIL') {
        return { ok: false } as any;
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
  setAliasStatus: t.procedure
    .input(z.object({ id: z.string(), disabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.connection.findUnique({
        where: { id: input.id },
      });
      if (!existing || (existing.type as any) !== 'CUSTOM_EMAIL') {
        return { ok: false } as any;
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
  emailHealth: t.procedure.query(async () => {
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
  createEmailAlias: t.procedure
    .input(
      z.object({
        userEmail: z.string().email(),
        domain: z.string().min(3), // app inbound domain e.g., mail.example.com
        shop: z.string().min(3), // shop domain to scope alias, e.g., dev-yourshop.myshopify.com
      }),
    )
    .mutation(async ({ input }) => {
      // Create or ensure user exists
      const owner = await prisma.user.upsert({
        where: { email: input.userEmail },
        create: { email: input.userEmail },
        update: {},
      });

      // If an alias already exists for this shop, return it
      const existing = await prisma.connection.findFirst({
        where: {
          userId: owner.id,
          type: 'CUSTOM_EMAIL' as any,
          AND: [
            { metadata: { path: ['shopDomain'], equals: input.shop } } as any,
          ],
        },
      });
      if (existing) {
        return { id: existing.id, alias: (existing.metadata as any)?.alias };
      }

      const short = Math.random().toString(36).slice(2, 6);
      const shopSlug = input.shop
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8)
        .toLowerCase();
      const alias = `in+${shopSlug}-${short}@${input.domain}`;
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
            domain: input.domain,
            verifiedAt: null,
            shopDomain: input.shop,
          } as any,
        },
        select: { id: true },
      });

      await logEvent('email.alias.created', { alias }, 'connection', conn.id);
      return { id: conn.id, alias };
    }),
  ordersListDb: t.procedure
    .input(
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input }) => {
      try {
        const take = input?.take ?? 20;
        const orders = await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take,
        });
        return { orders };
      } catch {
        return { orders: [] };
      }
    }),
  orderGet: t.procedure
    .input(z.object({ shop: z.string(), orderId: z.string() }))
    .query(async ({ input }) => {
      try {
        const conn = await prisma.connection.findFirst({
          where: { type: 'SHOPIFY', shopDomain: input.shop },
        });
        if (!conn) return { order: null };
        const resp = await fetch(
          `https://${input.shop}/admin/api/2024-07/orders/${input.orderId}.json`,
          { headers: { 'X-Shopify-Access-Token': conn.accessToken } },
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
  aiSuggestReply: t.procedure
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
      const apiKey = process.env.OPENAI_API_KEY;

      // Enhanced fallback with personalization
      const customerName = input.customerEmail
        ? input.customerEmail
            .split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())
        : 'there';

      const greeting = input.tone === 'professional' ? 'Hello' : 'Hi';

      if (!apiKey) {
        // Enhanced fallback response
        let body = `${greeting} ${customerName},\n\n`;
        body += `Thank you for reaching out to us! `;

        if (input.orderSummary) {
          body += `I can see your order details (${input.orderSummary}) and I'm here to help you with any questions or concerns you may have.\n\n`;
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
      const orderContext = input.orderSummary
        ? `Order Details: ${input.orderSummary}`
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
              { role: 'user', content: prompt },
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

        if (input.orderSummary) {
          body += `I can see your order details (${input.orderSummary}) and I'm here to help you with any questions or concerns you may have.\n\n`;
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
  actionCreate: t.procedure
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
    .mutation(async ({ input }) => {
      // Ensure an Order row exists for this external order id
      const order = await prisma.order.upsert({
        where: { shopifyId: input.shopifyOrderId },
        create: {
          shopifyId: input.shopifyOrderId,
          status: 'PENDING',
          email: input.email ?? null,
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
            shop: input.shop,
            note: input.note,
            draft: input.draft,
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
  actionApproveAndSend: t.procedure
    .input(
      z.object({
        actionId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Send email via Mailgun
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        const fromEmail = process.env.MAILGUN_FROM_EMAIL || `support@${domain}`;

        if (apiKey && domain) {
          const formData = new FormData();
          formData.append('from', fromEmail);
          formData.append('to', input.to);
          formData.append('subject', input.subject);
          formData.append('text', input.body);

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
            { to: input.to, subject: input.subject, messageId: result.id },
            'action',
            input.actionId,
          );

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
  sendUnassignedReply: t.procedure
    .input(
      z.object({
        messageId: z.string(),
        replyBody: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Get the original message
        const message = await prisma.message.findUnique({
          where: { id: input.messageId },
          include: { thread: true },
        });

        if (!message) {
          return { ok: false, error: 'Message not found' };
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
          formData.append('text', input.replyBody);

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
              body: input.replyBody,
              direction: 'OUTBOUND',
            },
          });

          await logEvent(
            'email.sent.unassigned',
            { to: message.from, messageId: result.id },
            'message',
            input.messageId,
          );

          return { ok: true, messageId: result.id };
        } else {
          await logEvent(
            'email.sent.stub',
            { to: message.from, reason: 'mailgun_not_configured' },
            'message',
            input.messageId,
          );

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
  messagesByOrder: t.procedure
    .input(z.object({ shopifyOrderId: z.string() }))
    .query(async ({ input }) => {
      try {
        const order = await prisma.order.findUnique({
          where: { shopifyId: input.shopifyOrderId },
        });
        if (!order) return { messages: [] };
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
  unassignedInbound: t.procedure
    .input(
      z.object({ take: z.number().min(1).max(100).default(20) }).optional(),
    )
    .query(async ({ input }) => {
      try {
        const take = input?.take ?? 20;
        const msgs = await prisma.message.findMany({
          where: { orderId: null, direction: 'INBOUND' as any },
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
  assignMessageToOrder: t.procedure
    .input(z.object({ messageId: z.string(), shopifyOrderId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const order = await prisma.order.findUnique({
          where: { shopifyId: input.shopifyOrderId },
          select: { id: true },
        });
        if (!order) return { ok: false } as any;
        await prisma.message.update({
          where: { id: input.messageId },
          data: { orderId: order.id },
        });
        return { ok: true } as any;
      } catch {
        return { ok: false } as any;
      }
    }),
  refreshOrderFromShopify: t.procedure
    .input(z.object({ shop: z.string(), orderId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const conn = await prisma.connection.findFirst({
          where: { type: 'SHOPIFY', shopDomain: input.shop },
        });
        if (!conn) return { ok: false, error: 'No Shopify connection found' };

        const url = `https://${input.shop}/admin/api/2024-07/orders/${input.orderId}.json`;
        const resp = await fetch(url, {
          headers: { 'X-Shopify-Access-Token': conn.accessToken },
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
            ...orderData,
          },
          update: orderData,
        });

        return { ok: true };
      } catch (error: any) {
        return { ok: false, error: error.message || 'Unknown error' };
      }
    }),
  ordersRecent: t.procedure
    .input(
      z.object({
        shop: z.string(),
        limit: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const limit = input.limit ?? 10;
        const conn = await prisma.connection.findFirst({
          where: { type: 'SHOPIFY', shopDomain: input.shop },
        });
        if (!conn) return { orders: [] };
        const url = `https://${input.shop}/admin/api/2024-07/orders.json?status=any&limit=${limit}&order=created_at%20desc`;
        const resp = await fetch(url, {
          headers: { 'X-Shopify-Access-Token': conn.accessToken },
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
  getAnalytics: t.procedure.query(async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Total emails
      const totalEmails = await prisma.message.count({
        where: { direction: 'INBOUND' },
      });

      // Emails this week
      const emailsThisWeek = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          createdAt: { gte: weekAgo },
        },
      });

      // Mapped vs unmapped
      const mappedEmails = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          orderId: { not: null },
        },
      });

      const unmappedEmails = await prisma.message.count({
        where: {
          direction: 'INBOUND',
          orderId: null,
        },
      });

      // Total orders
      const totalOrders = await prisma.order.count();

      // Actions taken
      const actionsTaken = await prisma.action.count();

      // AI suggestions with actions taken
      const aiSuggestions = await prisma.aISuggestion.count();
      const aiSuggestionAccuracy =
        aiSuggestions > 0 ? actionsTaken / aiSuggestions : 0;

      // Average response time (simplified - time from first inbound to first outbound)
      const avgResponseTime = 0; // TODO: Calculate based on thread timestamps

      return {
        totalEmails,
        emailsThisWeek,
        mappedEmails,
        unmappedEmails,
        totalOrders,
        actionsTaken,
        aiSuggestionAccuracy,
        averageResponseTime: avgResponseTime,
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return {
        totalEmails: 0,
        emailsThisWeek: 0,
        mappedEmails: 0,
        unmappedEmails: 0,
        totalOrders: 0,
        actionsTaken: 0,
        aiSuggestionAccuracy: 0,
        averageResponseTime: 0,
      };
    }
  }),
});

export type AppRouter = typeof appRouter;
