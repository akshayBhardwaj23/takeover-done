# Inngest Migration Guide

## Why Inngest?

- ✅ **Zero idle polling** - Event-driven, no Redis commands when idle
- ✅ **Free tier: 50K events/month** - Plenty for staging
- ✅ **Built-in retries** - Automatic retry logic
- ✅ **Vercel integration** - Works seamlessly
- ✅ **No Redis needed** - Eliminates worker polling entirely

## Migration Steps

### 1. Install Inngest

```bash
cd apps/web
pnpm add inngest @inngest/react
```

### 2. Create Inngest Functions

Replace BullMQ worker with Inngest functions that:
- Process inbound emails (AI suggestions)
- Handle background jobs
- No polling needed!

### 3. Update Webhooks

Change webhooks to trigger Inngest events instead of BullMQ queues.

### 4. Remove Redis Dependency

- Keep Redis only for webhook idempotency (1 command per webhook)
- Remove Redis for worker queues entirely

## Expected Impact

**Before (BullMQ):**
- Worker polling: ~259K commands/month
- Webhook idempotency: ~1-2K commands/month
- **Total: ~260K+ commands/month** ❌

**After (Inngest):**
- Worker polling: 0 commands (event-driven)
- Webhook idempotency: ~1-2K commands/month (optional, can use Inngest dedupe)
- **Total: ~0-2K commands/month** ✅

## Cost Comparison

**Upstash Redis Free Tier:**
- 500K commands/month
- Exceeded in 2 days ❌

**Inngest Free Tier:**
- 50K events/month
- 50K function invocations/month
- More than enough for staging ✅

