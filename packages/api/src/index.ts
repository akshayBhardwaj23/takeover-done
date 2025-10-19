import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '@ai-ecom/db';

const t = initTRPC.create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  echo: t.procedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => ({ text: input.text })),
  ordersCount: t.procedure
    .input(z.object({ shop: z.string().optional() }).optional())
    .query(async ({ input }) => {
      try {
        const where = input?.shop ? { shopDomain: input.shop } : undefined;
        const count = await prisma.order.count({ where });
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
  connections: t.procedure.query(async () => {
    try {
      const cons = await prisma.connection.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, shopDomain: true, createdAt: true },
      });
      return { connections: cons };
    } catch {
      return { connections: [] };
    }
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
      }),
    )
    .mutation(async ({ input }) => {
      // Stubbed suggestion for MVP. Replace with OpenAI later.
      const greeting = input.tone === 'professional' ? 'Hello' : 'Hi';
      const body = input.orderSummary
        ? `${greeting},\n\nThanks for reaching out. I looked up your order (${input.orderSummary}). ` +
          `Here’s what I can do next: \n- Provide an update or help with your request.\n\n` +
          `Reply back if you’d like me to proceed.\n\nBest regards,\nSupport`
        : `${greeting},\n\nThanks for contacting us. I’m here to help. ` +
          `Let me know the order number or any extra details, and I’ll take care of it.\n\nBest,\nSupport`;
      return { suggestion: body };
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
          shopDomain: input.shop,
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

      await prisma.event.create({
        data: {
          type: 'action.created',
          entity: 'action',
          entityId: action.id,
          payload: {
            actionId: action.id,
            orderId: order.id,
            type: input.type,
          } as any,
        },
      });

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
      // For MVP, mark approved and log an email event (no real send)
      const updated = await prisma.action.update({
        where: { id: input.actionId },
        data: { status: 'APPROVED' },
      });

      await prisma.event.create({
        data: {
          type: 'email.sent.stub',
          entity: 'action',
          entityId: input.actionId,
          payload: { to: input.to, subject: input.subject } as any,
        },
      });

      return { ok: true, status: updated.status };
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
});

export type AppRouter = typeof appRouter;
