import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Optimize Prisma for serverless (Vercel) environments
// Connection pooling is critical for performance on free tier
// Note: Connection pooling is handled by DATABASE_URL (use pooler URL in production)
export const prisma: PrismaClient =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? (['error', 'warn'] as const)
        : (['error'] as const),
  });
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
export { logEvent } from './logger.js';
export * from './usage.js';
export { seedDefaultPlaybooks } from './seedPlaybooks.js';
