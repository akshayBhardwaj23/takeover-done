# Security Fixes Required Before Production

## Critical Security Issues

### 1. ❌ NO CSRF Protection on tRPC (CRITICAL)

**Current Problem:**

- tRPC endpoints have no authentication context
- Any authenticated user can access any other user's data
- No CSRF token validation

**Fix Required:**

#### Step 1: Add Authentication Context to tRPC

Update `apps/web/app/api/trpc/[trpc]/route.ts`:

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@ai-ecom/api';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

const handler = async (request: Request) => {
  const session = await getServerSession(authOptions);

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => ({
      session,
      userId: session?.user?.email, // Use as tenant identifier
    }),
  });
};

export { handler as GET, handler as POST };
```

#### Step 2: Update tRPC Router to Require Authentication

Update `packages/api/src/index.ts`:

```typescript
import { initTRPC, TRPCError } from '@trpc/server';

type Context = {
  session: any;
  userId?: string;
};

const t = initTRPC.context<Context>().create();

// Protected procedure middleware
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

// Public procedure (no auth required)
const publicProcedure = t.procedure;

// Protected procedure (auth required)
const protectedProcedure = t.procedure.use(isAuthenticated);

// Use protectedProcedure for all sensitive endpoints
export const appRouter = t.router({
  // Public
  health: publicProcedure.query(() => ({ ok: true })),

  // Protected - require authentication
  connections: protectedProcedure.query(async ({ ctx }) => {
    // ctx.userId is guaranteed to exist here
    const connections = await prisma.connection.findMany({
      where: { userId: ctx.userId }, // Scope by user!
    });
    return { connections };
  }),

  // All other procedures should use protectedProcedure
});
```

#### Step 3: Add Multi-Tenant Scoping to ALL Queries

**Critical:** Every database query must filter by `userId`:

```typescript
// BAD - No tenant scoping (security vulnerability)
const orders = await prisma.order.findMany({
  where: { shopDomain: input.shop },
});

// GOOD - Properly scoped to user's connections
const connection = await prisma.connection.findFirst({
  where: {
    shopDomain: input.shop,
    userId: ctx.userId, // REQUIRED!
  },
});
if (!connection) throw new TRPCError({ code: 'FORBIDDEN' });

const orders = await prisma.order.findMany({
  where: {
    shopDomain: input.shop,
    connectionId: connection.id, // Ensures user owns this connection
  },
});
```

---

### 2. ❌ NO Rate Limiting (CRITICAL)

**Current State:**

- Email webhook has basic rate limit (10 emails/minute per alias)
- tRPC endpoints have **NO rate limiting**
- Shopify webhooks have **NO rate limiting**
- AI endpoints have **NO rate limiting** (costly!)

**Problem:**

- User can spam AI suggestions → expensive OpenAI bills
- User can spam email sends → expensive Mailgun bills
- Attacker can DDoS webhooks
- No protection against brute force

**Impact:** 🔴 **CRITICAL** - Financial loss + service disruption

**Solution:**

#### Option 1: Use Upstash Rate Limit (Recommended)

```bash
npm install @upstash/ratelimit @upstash/redis
```

Create `apps/web/lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limits for different endpoints
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
});

export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 AI requests per minute
  analytics: true,
});

export const emailLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 emails per minute
  analytics: true,
});

export const webhookLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 webhooks per minute
  analytics: true,
});
```

Usage in tRPC:

```typescript
import { apiLimiter, aiLimiter } from '../../lib/rate-limit';

const protectedProcedure = t.procedure
  .use(isAuthenticated)
  .use(async ({ ctx, next }) => {
    // Rate limit by user
    const { success } = await apiLimiter.limit(ctx.userId!);
    if (!success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    return next();
  });

// Special limiter for AI endpoints
const aiProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { success } = await aiLimiter.limit(ctx.userId!);
  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'AI rate limit exceeded. Please wait before generating more suggestions.'
    });
  }
  return next();
});

export const appRouter = t.router({
  aiSuggestReply: aiProcedure.input(...).mutation(...),
  // ... other endpoints
});
```

#### Option 2: Simple In-Memory Rate Limit (Quick Fix)

If you can't set up Redis immediately:

```typescript
// apps/web/lib/simple-rate-limit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, {
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

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Every minute
```

---

### 3. ❌ Missing Input Validation

**Current State:**

- Some tRPC endpoints use Zod validation
- Email webhook has basic checks
- No sanitization of user inputs
- No validation of email addresses, domains, etc.

**Problem:**

- SQL injection risk (Prisma helps, but not complete)
- XSS if displaying unsanitized content
- Command injection if processing email content
- SSRF if following links from emails

**Impact:** 🟠 **HIGH** - Data breach, XSS attacks

**Solution:**

```typescript
// packages/api/src/index.ts
import { z } from 'zod';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

const emailSchema = z
  .string()
  .email()
  .transform((val) => val.toLowerCase());
const shopDomainSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/);
const orderIdSchema = z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/);

export const appRouter = t.router({
  actionCreate: protectedProcedure
    .input(
      z.object({
        shop: shopDomainSchema,
        shopifyOrderId: orderIdSchema,
        email: emailSchema.optional(),
        type: z.enum([
          'REFUND',
          'CANCEL',
          'REPLACE_ITEM',
          'ADDRESS_CHANGE',
          'INFO_REQUEST',
        ]),
        note: z.string().max(1000).optional(),
        draft: z
          .string()
          .max(10000)
          .optional()
          .transform((val) =>
            val ? DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }) : val,
          ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // input is now validated and sanitized
    }),
});
```

---

### 4. ❌ Webhook Security Issues

**Current State:**

- Shopify HMAC verification: ✅ Implemented
- Mailgun signature verification: ✅ Implemented
- Email webhook has size limit (25MB): ✅
- Email webhook has basic rate limit: ⚠️ Partial (only 10/min)
- No webhook replay attack prevention
- No webhook retry handling

**Problem:**

- Attacker could replay old webhooks
- No idempotency checks
- Could process same order multiple times
- No monitoring of webhook failures

**Impact:** 🟡 **MEDIUM** - Data inconsistency, duplicate processing

**Solution:**

```typescript
// Add webhook idempotency tracking
// apps/web/app/api/webhooks/shopify/route.ts

const processedWebhooks = new Set<string>();

export async function POST(req: NextRequest) {
  // Get webhook ID from headers
  const webhookId = req.headers.get('x-shopify-webhook-id');

  // Check if already processed (idempotency)
  if (webhookId && processedWebhooks.has(webhookId)) {
    return NextResponse.json({ ok: true, message: 'already processed' });
  }

  // Verify HMAC...

  // Process webhook...

  // Mark as processed
  if (webhookId) {
    processedWebhooks.add(webhookId);
    // Store in Redis/DB for persistence across restarts
    await redis.set(`webhook:${webhookId}`, '1', { ex: 86400 }); // 24h TTL
  }

  return NextResponse.json({ ok: true });
}
```

---

### 5. ❌ No API Key Rotation

**Current State:**

- Shopify access tokens stored in plain text in DB
- Mailgun API key in environment variable
- No token rotation mechanism
- No token expiration handling

**Problem:**

- If DB is compromised, all tokens are exposed
- No way to revoke/rotate tokens
- Tokens never expire

**Impact:** 🟡 **MEDIUM** - Token leakage consequences

**Solution:**

```typescript
// Use encryption for stored tokens
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// When saving Shopify token
const encryptedToken = encrypt(accessToken);
await prisma.connection.create({
  data: {
    accessToken: encryptedToken,
    // ...
  }
});

// When using token
const connection = await prisma.connection.findFirst(...);
const decryptedToken = decrypt(connection.accessToken);
```

---

### 6. ❌ No Request Size Limits on tRPC

**Current State:**

- Email webhook has 25MB limit: ✅
- tRPC endpoints have **NO size limits**

**Problem:**

- User could send massive payloads
- Memory exhaustion attack possible
- No protection against zip bombs

**Impact:** 🟡 **MEDIUM** - DoS attack

**Solution:**

```typescript
// apps/web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Limit request body size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    // 1MB limit for API
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/trpc/:path*',
};
```

---

## ⚠️ **MEDIUM PRIORITY ISSUES**

### 7. No Content Security Policy (CSP)

Add CSP headers to prevent XSS:

```typescript
// next.config.mjs
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.mailgun.net;",
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 8. No Audit Logging

Add comprehensive audit logs for:

- User actions (create, update, delete)
- Authentication events
- API key usage
- Webhook processing
- Failed authentication attempts

### 9. No Secrets Scanning

- Add `.env.local` to `.gitignore` ✅ (hopefully already done)
- Use GitHub secret scanning
- Use tools like `git-secrets` or `truffleHog`

---

## 📋 **Priority Order for Fixes**

1. **🔴 CRITICAL - Do First:**
   - [ ] Add authentication context to tRPC
   - [ ] Add multi-tenant scoping to ALL queries
   - [ ] Implement rate limiting (at least simple in-memory)

2. **🟠 HIGH - Do Before Launch:**
   - [ ] Add comprehensive input validation
   - [ ] Implement request size limits
   - [ ] Add webhook idempotency
   - [ ] Encrypt stored tokens

3. **🟡 MEDIUM - Do After Launch:**
   - [ ] Add CSP headers
   - [ ] Implement audit logging
   - [ ] Set up secrets scanning
   - [ ] Add monitoring/alerting

---

## 🛠️ **Quick Win: Immediate Actions**

Run these commands now:

```bash
# Install security dependencies
pnpm add @upstash/ratelimit @upstash/redis validator isomorphic-dompurify

# Add to .gitignore (if not already)
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore

# Generate encryption key for token storage
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add result to .env.local as ENCRYPTION_KEY=...
```

---

## 📚 **Additional Resources**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#exposing-environment-variables-to-the-browser)
- [tRPC Authentication Guide](https://trpc.io/docs/server/context)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)

