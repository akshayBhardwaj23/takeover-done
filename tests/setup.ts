import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Global test database client
let testPrisma: PrismaClient;

beforeAll(async () => {
  // Initialize test database
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });

  // Run migrations on test database
  try {
    await execPromise('pnpm --filter @ai-ecom/db run prisma:generate');
    await execPromise(
      `DATABASE_URL=${process.env.TEST_DATABASE_URL || process.env.DATABASE_URL} pnpm --filter @ai-ecom/db run prisma:migrate deploy`,
    );
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
});

afterAll(async () => {
  // Cleanup test database and close connection
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test (optional - can be commented for integration tests)
  // This ensures tests don't depend on each other
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
    console.error('Failed to clean database:', error);
  }
});

// Export test utilities
export { testPrisma };

