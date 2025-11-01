import { describe, it, expect, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { appRouter } from '../index';
import { testPrisma } from './setup';

// Helper to create test context
function createTestContext(userId: string | null = null) {
  return {
    session: userId ? { user: { id: userId } } : null,
    userId,
  };
}

describe('tRPC API', () => {
  let testUserId: string;
  let authContext: ReturnType<typeof createTestContext>;

  beforeEach(async () => {
    const user = await testPrisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    testUserId = user.id;
    authContext = createTestContext(testUserId);
  });

  describe('Public endpoints', () => {
    it('health should return ok', async () => {
      const caller = appRouter.createCaller(createTestContext());
      const result = await caller.health();
      expect(result).toEqual({ status: 'ok' });
    });

    it('echo should return input', async () => {
      const caller = appRouter.createCaller(createTestContext());
      const result = await caller.echo({ text: 'hello' });
      expect(result).toEqual({ text: 'hello' });
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const caller = appRouter.createCaller(createTestContext(null));

      // Try to access protected endpoint without auth
      await expect(caller.ordersCount()).rejects.toThrow(TRPCError);
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      const caller = appRouter.createCaller(authContext);
      const result = await caller.ordersCount();
      expect(result).toHaveProperty('count');
    });

    // Note: Rate limiting tests are hard to test in unit tests
    // They're better tested in integration/e2e tests
  });

  describe('ordersCount', () => {
    it('should return order count', async () => {
      // Create some test orders
      const connection = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'test-token',
          userId: testUserId,
          shopDomain: 'test.myshopify.com',
        },
      });

      await testPrisma.order.createMany({
        data: [
          {
            shopifyId: '1001',
            connectionId: connection.id,
            status: 'PENDING',
            totalAmount: 10000,
          },
          {
            shopifyId: '1002',
            connectionId: connection.id,
            status: 'COMPLETED',
            totalAmount: 20000,
          },
        ],
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.ordersCount();
      expect(result.count).toBe(2);
    });

    it('should return 0 for no orders', async () => {
      const caller = appRouter.createCaller(authContext);
      const result = await caller.ordersCount();
      expect(result.count).toBe(0);
    });
  });

  describe('threadsList', () => {
    it('should return threads list', async () => {
      const connection = await testPrisma.connection.create({
        data: {
          type: 'CUSTOM_EMAIL',
          accessToken: 'test-token',
          userId: testUserId,
        },
      });

      const thread = await testPrisma.thread.create({
        data: {
          customerEmail: 'customer@example.com',
          connectionId: connection.id,
          subject: 'Test Thread',
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.threadsList();
      expect(result.threads).toHaveLength(1);
      expect(result.threads[0].id).toBe(thread.id);
    });

    it('should respect take parameter', async () => {
      const connection = await testPrisma.connection.create({
        data: {
          type: 'CUSTOM_EMAIL',
          accessToken: 'test-token',
          userId: testUserId,
        },
      });

      // Create multiple threads
      await Promise.all(
        Array.from({ length: 15 }).map((_, i) =>
          testPrisma.thread.create({
            data: {
              customerEmail: `customer${i}@example.com`,
              connectionId: connection.id,
              subject: `Thread ${i}`,
            },
          }),
        ),
      );

      const caller = appRouter.createCaller(authContext);
      const result = await caller.threadsList({ take: 10 });
      expect(result.threads).toHaveLength(10);
    });
  });

  describe('connections', () => {
    it('should return user connections', async () => {
      const shopifyConn = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token1',
          userId: testUserId,
          shopDomain: 'shop1.myshopify.com',
        },
      });

      const emailConn = await testPrisma.connection.create({
        data: {
          type: 'CUSTOM_EMAIL',
          accessToken: 'token2',
          userId: testUserId,
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.connections();
      expect(result.connections).toHaveLength(2);
      expect(result.connections.map((c) => c.id)).toContain(shopifyConn.id);
      expect(result.connections.map((c) => c.id)).toContain(emailConn.id);
    });

    it('should only return connections for authenticated user', async () => {
      // Create another user
      const otherUser = await testPrisma.user.create({
        data: { email: 'other@example.com' },
      });

      await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token',
          userId: otherUser.id,
          shopDomain: 'other.myshopify.com',
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.connections();
      expect(result.connections).toHaveLength(0);
    });
  });

  describe('ordersListDb', () => {
    it('should return user orders', async () => {
      const connection = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token',
          userId: testUserId,
          shopDomain: 'test.myshopify.com',
        },
      });

      const order = await testPrisma.order.create({
        data: {
          shopifyId: '12345',
          connectionId: connection.id,
          status: 'PENDING',
          totalAmount: 50000,
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.ordersListDb();
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe(order.id);
    });
  });

  describe('aiSuggestReply', () => {
    it('should generate AI suggestion', async () => {
      const caller = appRouter.createCaller(authContext);
      const result = await caller.aiSuggestReply({
        customerMessage: 'I need help with my order',
        tone: 'friendly',
      });

      expect(result).toHaveProperty('suggestion');
      expect(result.suggestion).toBeTruthy();
      expect(typeof result.suggestion).toBe('string');
    });

    it('should include order context in suggestion', async () => {
      const caller = appRouter.createCaller(authContext);
      const result = await caller.aiSuggestReply({
        customerMessage: 'Where is my order?',
        orderSummary: 'Order #12345 - $500',
        customerEmail: 'customer@example.com',
      });

      expect(result.suggestion).toContain('Order #12345');
    });

    it('should handle different tones', async () => {
      const caller = appRouter.createCaller(authContext);

      const friendly = await caller.aiSuggestReply({
        customerMessage: 'Hello',
        tone: 'friendly',
      });

      const professional = await caller.aiSuggestReply({
        customerMessage: 'Hello',
        tone: 'professional',
      });

      expect(friendly.suggestion).not.toBe(professional.suggestion);
    });
  });

  describe('actionCreate', () => {
    it('should create action', async () => {
      const connection = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token',
          userId: testUserId,
          shopDomain: 'test.myshopify.com',
        },
      });

      const order = await testPrisma.order.create({
        data: {
          shopifyId: '12345',
          connectionId: connection.id,
          status: 'PENDING',
          totalAmount: 10000,
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.actionCreate({
        shop: 'test.myshopify.com',
        shopifyOrderId: '12345',
        type: 'REFUND',
        note: 'Customer requested refund',
      });

      expect(result).toHaveProperty('actionId');

      const action = await testPrisma.action.findUnique({
        where: { id: result.actionId },
      });

      expect(action).toBeDefined();
      expect(action?.type).toBe('REFUND');
      expect(action?.status).toBe('PENDING');
    });

    it('should reject action for unauthorized shop', async () => {
      // Create shop for different user
      const otherUser = await testPrisma.user.create({
        data: { email: 'other@example.com' },
      });

      const connection = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token',
          userId: otherUser.id,
          shopDomain: 'other.myshopify.com',
        },
      });

      await testPrisma.order.create({
        data: {
          shopifyId: '12345',
          connectionId: connection.id,
          status: 'PENDING',
          totalAmount: 10000,
        },
      });

      const caller = appRouter.createCaller(authContext);
      await expect(
        caller.actionCreate({
          shop: 'other.myshopify.com',
          shopifyOrderId: '12345',
          type: 'REFUND',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid shop domain', async () => {
      const caller = appRouter.createCaller(authContext);
      await expect(
        caller.actionCreate({
          shop: 'invalid-domain.com',
          shopifyOrderId: '12345',
          type: 'REFUND',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const connection = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token',
          userId: testUserId,
          shopDomain: 'test.myshopify.com',
        },
      });

      const order = await testPrisma.order.create({
        data: {
          shopifyId: '12345',
          connectionId: connection.id,
          status: 'COMPLETED',
          totalAmount: 10000,
        },
      });

      const thread = await testPrisma.thread.create({
        data: {
          customerEmail: 'customer@example.com',
          connectionId: connection.id,
        },
      });

      await testPrisma.message.create({
        data: {
          threadId: thread.id,
          orderId: order.id,
          from: 'customer@example.com',
          to: 'support@example.com',
          body: 'Hello',
          direction: 'INBOUND',
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.getAnalytics();

      expect(result).toHaveProperty('totalEmails');
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('actionsTaken');
      expect(result.totalEmails).toBeGreaterThan(0);
      expect(result.totalOrders).toBeGreaterThan(0);
    });
  });

  describe('getUsageSummary', () => {
    it('should return usage summary for user', async () => {
      const caller = appRouter.createCaller(authContext);
      const result = await caller.getUsageSummary();

      expect(result).toHaveProperty('planType');
      expect(result).toHaveProperty('emailsSent');
      expect(result).toHaveProperty('emailLimit');
      expect(result.planType).toBe('TRIAL');
    });

    it('should support currency parameter', async () => {
      const caller = appRouter.createCaller(authContext);

      const inrResult = await caller.getUsageSummary({ currency: 'INR' });
      const usdResult = await caller.getUsageSummary({ currency: 'USD' });

      expect(inrResult.currency).toBe('INR');
      expect(usdResult.currency).toBe('USD');
    });
  });

  describe('createEmailAlias', () => {
    it('should create email alias', async () => {
      const shopConnection = await testPrisma.connection.create({
        data: {
          type: 'SHOPIFY',
          accessToken: 'token',
          userId: testUserId,
          shopDomain: 'test.myshopify.com',
        },
      });

      const caller = appRouter.createCaller(authContext);
      const result = await caller.createEmailAlias({
        userEmail: 'support@example.com',
        domain: 'example.com',
        shop: 'test.myshopify.com',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('alias');
      expect(result.alias).toContain('@example.com');
    });

    it('should reject for unauthorized shop', async () => {
      const caller = appRouter.createCaller(authContext);
      await expect(
        caller.createEmailAlias({
          userEmail: 'support@example.com',
          domain: 'example.com',
          shop: 'unauthorized.myshopify.com',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
