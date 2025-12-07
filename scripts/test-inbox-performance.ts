#!/usr/bin/env tsx
/**
 * Performance testing script for inbox API endpoints
 * Measures query execution times and identifies bottlenecks
 */

import 'dotenv/config';
import { prisma } from '@ai-ecom/db';

// Enable Prisma query logging
const queryTimings: Array<{
  query: string;
  duration: number;
  params?: any;
}> = [];

// Monkey-patch Prisma to log queries
const originalQuery = (prisma as any).$queryRawUnsafe;
(prisma as any).$queryRawUnsafe = function (...args: any[]) {
  const start = Date.now();
  const result = originalQuery.apply(this, args);
  if (result && typeof result.then === 'function') {
    return result.then((data: any) => {
      const duration = Date.now() - start;
      queryTimings.push({
        query: args[0]?.substring(0, 200) || 'Unknown',
        duration,
        params: args.slice(1),
      });
      return data;
    });
  }
  return result;
};

async function testInboxBootstrap(userId: string) {
  console.log('\n=== Testing inboxBootstrap ===\n');

  const ordersTake = 25;
  const unassignedTake = 40;

  const start = Date.now();

  // Fetch connections
  const connectionsStart = Date.now();
  const connections = await prisma.connection.findMany({
    where: { userId },
    select: { id: true, type: true, shopDomain: true, metadata: true },
  });
  const connectionsTime = Date.now() - connectionsStart;
  console.log(`✓ Connections query: ${connectionsTime}ms (${connections.length} connections)`);

  if (connections.length === 0) {
    console.log('No connections found for user');
    return;
  }

  const orderConnectionIds = connections.map((c) => c.id);
  const unassignedConnectionIds = connections
    .filter((c) => c.type === ('CUSTOM_EMAIL' as any))
    .map((c) => c.id);

  // Fetch orders, messages, and email limit in parallel
  const parallelStart = Date.now();
  const [orders, unassignedMessages, emailLimit] = await Promise.all([
    (async () => {
      const start = Date.now();
      const result = await prisma.order.findMany({
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
        },
      });
      console.log(`  - Orders query: ${Date.now() - start}ms (${result.length} orders)`);
      return result;
    })(),
    (async () => {
      if (unassignedConnectionIds.length === 0) {
        return [];
      }
      const start = Date.now();
      const result = await prisma.message.findMany({
        where: {
          connectionId: { in: unassignedConnectionIds },
        },
        orderBy: { createdAt: 'desc' },
        take: unassignedTake,
        select: {
          id: true,
          threadId: true,
          from: true,
          to: true,
          body: true,
          createdAt: true,
          orderId: true,
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
      });
      console.log(`  - Unassigned messages query: ${Date.now() - start}ms (${result.length} messages)`);
      return result;
    })(),
    (async () => {
      // Simplified email limit check
      const start = Date.now();
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { planType: true },
      });
      console.log(`  - Email limit query: ${Date.now() - start}ms`);
      return { allowed: true, current: 0, limit: 1000, percentage: 0 };
    })(),
  ]);
  const parallelTime = Date.now() - parallelStart;
  console.log(`✓ Parallel queries: ${parallelTime}ms`);

  // Calculate pending email counts - THIS IS THE BOTTLENECK
  const pendingStart = Date.now();
  const orderIds = orders.map((o) => o.id);
  
  // Count messages per order
  let allMessagesCount = 0;
  const messagesQueryStart = Date.now();
  if (orderIds.length > 0) {
    const allMessages = await prisma.message.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: 'desc' },
      select: { orderId: true, direction: true },
    });
    allMessagesCount = allMessages.length;
    console.log(`  - Pending count query: ${Date.now() - messagesQueryStart}ms (${allMessages.length} messages fetched)`);

    // Group and calculate
    const calcStart = Date.now();
    const messagesByOrder = new Map<string, Array<{ direction: string }>>();
    for (const msg of allMessages) {
      if (msg.orderId) {
        if (!messagesByOrder.has(msg.orderId)) {
          messagesByOrder.set(msg.orderId, []);
        }
        messagesByOrder.get(msg.orderId)!.push({ direction: msg.direction });
      }
    }

    const pendingCountsMap = new Map<string, number>();
    for (const orderId of orderIds) {
      const messages = messagesByOrder.get(orderId) ?? [];
      let pendingCount = 0;
      for (const msg of messages) {
        if (msg.direction === 'OUTBOUND') {
          break;
        } else if (msg.direction === 'INBOUND') {
          pendingCount++;
        }
      }
      pendingCountsMap.set(orderId, pendingCount);
    }
    console.log(`  - Pending count calculation: ${Date.now() - calcStart}ms`);
  }
  const pendingTime = Date.now() - pendingStart;
  console.log(`✓ Pending count total: ${pendingTime}ms (fetched ${allMessagesCount} messages)`);

  const totalTime = Date.now() - start;
  console.log(`\n📊 Total inboxBootstrap time: ${totalTime}ms`);

  return {
    totalTime,
    connectionsTime,
    parallelTime,
    pendingTime,
    ordersCount: orders.length,
    messagesCount: allMessagesCount,
    unassignedMessagesCount: unassignedMessages.length,
  };
}

async function testUnassignedInbound(userId: string) {
  console.log('\n=== Testing unassignedInbound ===\n');

  const take = 50;
  const start = Date.now();

  // Fetch connections
  const connectionsStart = Date.now();
  const connections = await prisma.connection.findMany({
    where: { userId, type: 'CUSTOM_EMAIL' },
    select: { id: true },
  });
  const connectionsTime = Date.now() - connectionsStart;
  console.log(`✓ Connections query: ${connectionsTime}ms (${connections.length} connections)`);

  if (connections.length === 0) {
    console.log('No CUSTOM_EMAIL connections found');
    return;
  }

  const connectionIds = connections.map((c: { id: string }) => c.id);

  // Fetch messages with thread relation
  const messagesStart = Date.now();
  const msgs = await prisma.message.findMany({
    where: {
      thread: { connectionId: { in: connectionIds } },
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
      orderId: true,
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
  });
  const messagesTime = Date.now() - messagesStart;
  console.log(`✓ Messages query: ${messagesTime}ms (${msgs.length} messages)`);

  const totalTime = Date.now() - start;
  console.log(`\n📊 Total unassignedInbound time: ${totalTime}ms`);

  return {
    totalTime,
    connectionsTime,
    messagesTime,
    messagesCount: msgs.length,
  };
}

async function runPerformanceTests() {
  console.log('🚀 Starting Inbox API Performance Tests\n');
  
  // Show environment info
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Mask password in output
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`📊 Database: ${maskedUrl}`);
  } else {
    console.warn('⚠️  DATABASE_URL not set, using default from packages/db/.env');
  }
  console.log('');

  // Get a test user ID (use first user in database or provide via env)
  const testUserId = process.env.TEST_USER_ID;
  if (!testUserId) {
    console.error('❌ TEST_USER_ID environment variable not set');
    console.log('\nUsage:');
    console.log('  TEST_USER_ID=<userId> DATABASE_URL=<db-url> pnpm test:inbox-performance');
    console.log('\nOr set environment variables:');
    console.log('  export TEST_USER_ID="your-user-id"');
    console.log('  export DATABASE_URL="postgresql://..."');
    console.log('  pnpm test:inbox-performance');
    console.log('\nTo get a user ID, query the database:');
    console.log('  SELECT id, email FROM "User" LIMIT 5;');
    process.exit(1);
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: testUserId },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`❌ User ${testUserId} not found`);
    process.exit(1);
  }

  console.log(`Testing with user: ${user.email} (${testUserId})\n`);

  try {
    const bootstrapResults = await testInboxBootstrap(testUserId);
    const unassignedResults = await testUnassignedInbound(testUserId);

    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    console.log('\nInboxBootstrap:');
    if (bootstrapResults) {
      console.log(`  Total: ${bootstrapResults.totalTime}ms`);
      console.log(`  - Connections: ${bootstrapResults.connectionsTime}ms`);
      console.log(`  - Parallel queries: ${bootstrapResults.parallelTime}ms`);
      console.log(`  - Pending count: ${bootstrapResults.pendingTime}ms (${bootstrapResults.messagesCount} messages)`);
      console.log(`  - Orders: ${bootstrapResults.ordersCount}`);
      console.log(`  - Unassigned messages: ${bootstrapResults.unassignedMessagesCount}`);
    }

    console.log('\nUnassignedInbound:');
    if (unassignedResults) {
      console.log(`  Total: ${unassignedResults.totalTime}ms`);
      console.log(`  - Connections: ${unassignedResults.connectionsTime}ms`);
      console.log(`  - Messages: ${unassignedResults.messagesTime}ms`);
      console.log(`  - Messages count: ${unassignedResults.messagesCount}`);
    }

    // Show slow queries
    const slowQueries = queryTimings.filter((q) => q.duration > 100);
    if (slowQueries.length > 0) {
      console.log('\n⚠️  Slow Queries (>100ms):');
      slowQueries.forEach((q) => {
        console.log(`  - ${q.duration}ms: ${q.query.substring(0, 100)}...`);
      });
    }

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('❌ Error during performance test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runPerformanceTests().catch(console.error);

