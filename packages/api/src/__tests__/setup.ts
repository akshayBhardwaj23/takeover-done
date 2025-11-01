import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var testPrisma: PrismaClient | undefined;
}

export const testPrisma =
  global.testPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') global.testPrisma = testPrisma;

beforeAll(async () => {
  // Ensure database is ready
  try {
    await testPrisma.$connect();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
  }
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  try {
    // Delete in reverse order of foreign keys
    await testPrisma.event.deleteMany();
    await testPrisma.action.deleteMany();
    await testPrisma.aISuggestion.deleteMany();
    await testPrisma.message.deleteMany();
    await testPrisma.thread.deleteMany();
    await testPrisma.order.deleteMany();
    await testPrisma.usageRecord.deleteMany();
    await testPrisma.subscription.deleteMany();
    await testPrisma.connection.deleteMany();
    await testPrisma.user.deleteMany();
  } catch (error) {
    // Ignore errors during cleanup
  }
});

