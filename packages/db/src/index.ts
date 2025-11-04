import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configure Prisma Client for Vercel serverless environment
const prismaClientOptions: any = {};
if (process.env.VERCEL) {
  // In Vercel, ensure the query engine binary is found
  // The binary should be in node_modules after prisma generate
  prismaClientOptions.log = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];
}

export const prisma: PrismaClient = global.prisma ?? new PrismaClient(prismaClientOptions);
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
export { logEvent } from './logger.js';
export * from './usage.js';
