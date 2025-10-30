import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (only if credentials are provided)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// General API rate limiter: 100 requests per minute per user
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

// AI operations rate limiter: 10 requests per minute per user
// This is more restrictive because AI calls are expensive
export const aiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

// Email sending rate limiter: 20 emails per minute per user
export const emailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'ratelimit:email',
    })
  : null;

// Webhook rate limiter: 60 requests per minute per IP
export const webhookLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:webhook',
    })
  : null;

// Fallback in-memory rate limiter for when Redis is not configured
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export function checkInMemoryRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const record = inMemoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    inMemoryStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Cleanup old in-memory entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
      if (now > record.resetAt) {
        inMemoryStore.delete(key);
      }
    }
  }, 60000);
}

// Helper to check rate limit with fallback
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  fallbackMax: number,
  fallbackWindowMs: number,
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}> {
  if (limiter) {
    // Use Upstash rate limiter
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } else {
    // Fallback to in-memory
    const success = checkInMemoryRateLimit(
      identifier,
      fallbackMax,
      fallbackWindowMs,
    );
    return { success };
  }
}

