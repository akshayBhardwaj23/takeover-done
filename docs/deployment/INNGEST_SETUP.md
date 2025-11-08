# Inngest Setup Guide - Replace Redis Worker

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd apps/web
pnpm install
```

### 2. Create Inngest Account & Get Event Key

1. Go to https://www.inngest.com
2. Sign up (free tier: 50K events/month)
3. Create a new app
4. Go to **Settings** → **Keys**
5. Copy the **Event Key** (starts with `signkey-`)

### 3. Add Environment Variable

In **Vercel** → Your Project → **Settings** → **Environment Variables**:

- **Key:** `INNGEST_EVENT_KEY`
- **Value:** Your Event Key from Inngest dashboard
- **Environment:** Preview (and Production when ready)

### 4. Deploy

The code is already set up! Just deploy to Vercel.

### 5. Sync Inngest Functions

After deploying, Inngest will automatically discover your functions at:
- `https://www.zyyp.ai/api/inngest`

Go to Inngest dashboard → **Apps** → Click "Sync" to register functions.

## What Changed

### ✅ Replaced BullMQ Worker with Inngest
- **Before:** BullMQ worker polling Redis every 10s = ~259K commands/month
- **After:** Inngest event-driven = **0 idle commands** ✅

### ✅ Updated Email Webhook
- **Before:** `enqueueInboxJob()` → BullMQ queue → Redis polling
- **After:** `inngest.send()` → Inngest event → Zero polling

### ✅ Same Functionality
- AI suggestion generation works exactly the same
- Built-in retries (3 attempts)
- Automatic error handling

## Redis Usage After Migration

**Before:**
- Worker polling: ~259K commands/month
- Webhook idempotency: ~1-2K commands/month
- **Total: ~260K commands/month** ❌

**After:**
- Worker polling: **0 commands** (event-driven!)
- Webhook idempotency: ~1-2K commands/month (optional)
- **Total: ~1-2K commands/month** ✅

**Savings: ~99% reduction in Redis usage!**

## Testing

1. Send a test email to your Mailgun alias
2. Check Vercel logs for: `[Email Webhook] Triggered Inngest event`
3. Check Inngest dashboard → **Runs** to see function execution
4. Verify AI suggestion appears in your dashboard

## Next Steps

### Option 1: Keep Redis for Webhook Idempotency (Recommended)
- Keep current Redis idempotency (1 command per webhook)
- Use Inngest for all background jobs
- **Result:** ~1-2K Redis commands/month

### Option 2: Use Inngest Deduplication (Zero Redis)
- Remove Redis idempotency from webhooks
- Use Inngest's built-in deduplication
- **Result:** 0 Redis commands/month

## Troubleshooting

**Inngest not receiving events?**
- Check `INNGEST_EVENT_KEY` is set in Vercel
- Verify Inngest app is synced (dashboard → Apps → Sync)
- Check Vercel logs for errors

**Functions not running?**
- Check Inngest dashboard → Runs
- Verify function is registered (dashboard → Functions)
- Check function logs in Inngest dashboard

## Cost Comparison

**Upstash Redis Free Tier:**
- 500K commands/month
- **Status:** Exceeded ❌

**Inngest Free Tier:**
- 50K events/month
- 50K function invocations/month
- **Status:** Plenty for staging ✅

