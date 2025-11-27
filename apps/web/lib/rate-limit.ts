// In-memory rate limiter (no external dependencies)
// Rate limits reset when the application restarts
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

// Helper to check rate limit (now always uses in-memory implementation)
export async function checkRateLimit(
  _limiter: null, // Kept for API compatibility but unused
  identifier: string,
  fallbackMax: number,
  fallbackWindowMs: number,
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}> {
  const success = checkInMemoryRateLimit(
    identifier,
    fallbackMax,
    fallbackWindowMs,
  );
  return { success };
}

// Exported for backward compatibility (all are null now)
export const apiLimiter = null;
export const aiLimiter = null;
export const emailLimiter = null;
export const webhookLimiter = null;
