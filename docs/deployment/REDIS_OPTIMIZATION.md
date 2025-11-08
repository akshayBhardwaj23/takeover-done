# Redis Usage Optimization

## Problem

Upstash Redis free tier has a **500K commands/month** limit. In staging, this was exceeded in just 2 days (514K commands).

## Root Causes

### 1. Webhook Idempotency (2 commands per webhook)
- **Shopify webhooks:** `GET` + `SET` = 2 commands per webhook
- **Email webhooks:** `GET` + `SET` = 2 commands per webhook
- If you're testing with many webhooks, this adds up quickly

### 2. BullMQ Worker (High command usage)
- **Worker polling:** Multiple commands every few seconds to check for jobs
- **Job enqueue:** Multiple commands per job
- **Job processing:** Multiple commands per job lifecycle
- **Estimated:** 50-100+ commands per minute when worker is running

BullMQ is the **main culprit** - it uses Redis for job queues, polling, and job management, which generates many commands.

## Solutions Implemented

### ✅ Solution 1: Disable Redis for Staging Webhooks

**Changed:**
- Shopify webhooks: Redis disabled in staging (only enabled in production)
- Email webhooks: Redis disabled in staging (only enabled in production)

**Impact:**
- Saves ~2 commands per webhook
- Idempotency not critical for staging (duplicates are acceptable during testing)

**Code Changes:**
- `apps/web/app/api/webhooks/shopify/route.ts`
- `apps/web/app/api/webhooks/email/custom/route.ts`

### 🔧 Solution 2: Disable Worker in Staging (Recommended)

**Option A: Disable Worker Entirely in Staging**
- Set `REDIS_URL` to empty/undefined in staging
- Worker will log a warning and skip queue operations

**Option B: Use Separate Redis Instance**
- Create a separate Upstash Redis instance for worker queues
- Use different Redis for webhooks vs worker

**Option C: Use Database-Based Queues (Future)**
- Replace BullMQ with a database-backed queue (e.g., `pg-boss`)
- No Redis needed for queues

## Current Status

✅ **Webhook Redis disabled for staging** - Deployed

⏳ **Worker still using Redis** - This is the main source of commands

## Monitoring

Check Upstash dashboard:
- **Commands:** Should see dramatic reduction after webhook optimization
- **Worker:** If still running, will continue to generate commands

## Recommendations

### For Staging:
1. **Disable worker** - Set `REDIS_URL` to empty in Vercel staging environment
2. **Keep webhooks Redis-free** - Already done ✅
3. **Monitor usage** - Check Upstash dashboard weekly

### For Production:
1. **Keep Redis enabled** - Idempotency is important for production
2. **Monitor usage** - Set up alerts before hitting limits
3. **Consider upgrading** - If approaching limits, upgrade Upstash plan

## Quick Fix: Disable Worker in Staging

In Vercel → Environment Variables → Preview:
- Remove or set `REDIS_URL` to empty string
- Worker will gracefully skip Redis operations

## Alternative: Database-Based Idempotency

For staging, you could use Prisma to check for duplicate webhooks:

```typescript
// Check if webhook was already processed
const existing = await prisma.event.findFirst({
  where: {
    type: 'shopify.webhook',
    metadata: { path: ['webhookId'], equals: webhookId },
  },
});
```

This would use database queries instead of Redis, but duplicates are acceptable in staging.

## Cost Comparison

**Current (with worker):**
- ~500K commands in 2 days
- Worker: ~100 commands/min × 2880 min = ~288K commands
- Webhooks: ~212K commands (estimated)

**After optimization:**
- Webhooks: 0 commands (disabled)
- Worker: Still ~288K commands (if running)
- **Total savings:** ~212K commands (42% reduction)

**With worker disabled:**
- Total: ~0 commands ✅
- **100% reduction**

