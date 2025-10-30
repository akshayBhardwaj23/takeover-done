# Security Fixes - Implementation Progress

## ✅ COMPLETED

### 1. ✅ Authentication Context Added to tRPC

**File**: `apps/web/app/api/trpc/[trpc]/route.ts`

- ✅ Added NextAuth session retrieval
- ✅ Created context with `session` and `userId`
- ✅ All tRPC procedures now have access to authenticated user info

### 2. ✅ Protected Procedures Implemented

**File**: `packages/api/src/index.ts`

- ✅ Created `Context` type with `session` and `userId`
- ✅ Created `isAuthenticated` middleware
- ✅ Separated `publicProcedure` (health, echo) from `protectedProcedure`
- ✅ Updated ALL 19 procedures to use `protectedProcedure`
- ✅ All endpoints now require authentication

### 3. ✅ Multi-Tenant Scoping (Partial)

**File**: `packages/api/src/index.ts`

- ✅ `connections` query - scoped by `userId`
- ✅ `rotateAlias` mutation - scoped by `userId`
- ✅ `setAliasStatus` mutation - scoped by `userId`

### 4. ✅ Dependencies Installed

- ✅ `@upstash/ratelimit` - for rate limiting
- ✅ `@upstash/redis` - for rate limit storage
- ✅ `validator` - for input validation
- ✅ `isomorphic-dompurify` - for HTML sanitization

---

## 🚧 IN PROGRESS / TODO

### 5. ⚠️ Multi-Tenant Scoping - NEEDS COMPLETION

**Critical**: The following procedures still need multi-tenant scoping added:

#### High Priority (User can access other users' data):

- [ ] `ordersListDb` - needs to filter orders by user's connections
- [ ] `orderGet` - needs to verify user owns the shop connection
- [ ] `ordersRecent` - needs to verify user owns the shop connection
- [ ] `messagesByOrder` - needs to verify order belongs to user
- [ ] `unassignedInbound` - needs to filter by user's connections
- [ ] `assignMessageToOrder` - needs to verify user owns both message and order
- [ ] `refreshOrderFromShopify` - needs to verify user owns the shop
- [ ] `getAnalytics` - should only show user's own analytics
- [ ] `getShopifyAnalytics` - needs to verify user owns the shop

#### Medium Priority:

- [ ] `createEmailAlias` - needs to verify user owns the shop
- [ ] `aiSuggestReply` - needs context validation (though less critical)
- [ ] `actionCreate` - needs to verify user owns the shop/order
- [ ] `actionApproveAndSend` - needs to verify user owns the action
- [ ] `sendUnassignedReply` - needs to verify user owns the message

**Example Fix Pattern**:

```typescript
// BEFORE (vulnerable)
const orders = await prisma.order.findMany({
  where: { shopDomain: input.shop },
});

// AFTER (secure)
const connection = await prisma.connection.findFirst({
  where: {
    shopDomain: input.shop,
    userId: ctx.userId, // REQUIRED!
  },
});
if (!connection) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
}
const orders = await prisma.order.findMany({
  where: { connectionId: connection.id }, // Use connection ID
});
```

### 6. 🔴 Rate Limiting - NOT STARTED

**Files to Create**:

- `apps/web/lib/rate-limit.ts` - Rate limit utilities

**Environment Variables Needed**:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Rate Limits to Implement**:

- API calls: 100 req/min per user
- AI suggestions: 10 req/min per user
- Email sends: 20 req/min per user
- Webhooks: 60 req/min per IP

### 7. 🔴 Input Validation - NOT STARTED

**Needs Validation**:

- Email addresses (use `validator.isEmail()`)
- Shopify domains (regex pattern)
- Order IDs (Shopify GID format)
- Text inputs (max length, sanitize HTML)

### 8. 🔴 Webhook Idempotency - NOT STARTED

**Files to Update**:

- `apps/web/app/api/webhooks/shopify/route.ts`
- `apps/web/app/api/webhooks/email/custom/route.ts`

**What to Add**:

- Track processed webhook IDs
- Return early if already processed
- Store in Redis with 24h TTL

### 9. 🔴 Request Size Limits - NOT STARTED

**File to Create**:

- `apps/web/middleware.ts`

**What to Add**:

- 1MB limit for tRPC endpoints
- Content-Length header check
- Return 413 for oversized requests

### 10. 🔴 CSP Headers - NOT STARTED

**File to Update**:

- `apps/web/next.config.mjs`

**Headers to Add**:

- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy

### 11. 🔴 Token Encryption - NOT STARTED

**What to Do**:

- Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Add to `.env.local`: `ENCRYPTION_KEY=...`
- Create encryption/decryption helpers
- Update token storage/retrieval

---

## 🎯 NEXT STEPS (Priority Order)

### Immediate (Do Today):

1. **Complete Multi-Tenant Scoping** for all procedures (2-3 hours)
   - This is CRITICAL - users can currently access each other's data
   - Follow the pattern shown above for each procedure

2. **Test Authentication** (30 mins)
   - Try accessing tRPC endpoints without being logged in
   - Should get "UNAUTHORIZED" error
   - Try accessing another user's data
   - Should get "FORBIDDEN" or not find data

### Before Launch (This Week):

3. **Implement Rate Limiting** (2 hours)
   - Sign up for Upstash Redis (free tier)
   - Create rate limit utilities
   - Add to procedures

4. **Add Input Validation** (2 hours)
   - Add Zod schemas for all inputs
   - Sanitize text content
   - Validate email/domain formats

5. **Webhook Idempotency** (1 hour)
   - Track processed webhooks
   - Prevent duplicate processing

### After Launch:

6. **Request Size Limits** (30 mins)
7. **CSP Headers** (30 mins)
8. **Token Encryption** (1 hour)

---

## 📋 Quick Commands

### To Set Up Upstash Redis (for rate limiting):

1. Sign up at https://upstash.com/ (free tier)
2. Create a Redis database
3. Copy REST URL and token
4. Add to `apps/web/.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx
```

### To Generate Encryption Key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add result to `apps/web/.env.local`:

```bash
ENCRYPTION_KEY=your-64-char-hex-string
```

### To Test Current Security:

```bash
# Start dev server
pnpm dev

# Try accessing inbox without login
# Should be redirected or blocked

# Try accessing tRPC endpoint
curl http://localhost:3000/api/trpc/connections
# Should return authentication error
```

---

## 📝 Notes

- **Breaking Change**: All tRPC endpoints now require authentication
- **Database Schema**: No changes needed for current fixes
- **Frontend**: Should handle authentication errors gracefully
- **Testing**: Need to test multi-tenant isolation thoroughly

---

## 🆘 If You Need Help

The most critical task is **completing multi-tenant scoping**. Each procedure that accesses `Connection`, `Order`, `Message`, etc. needs to:

1. First verify the user owns the related `Connection`
2. Only query data related to that user's connections
3. Throw `TRPCError({ code: 'FORBIDDEN' })` if access denied

Let me know if you want me to complete any specific procedure's scoping!

