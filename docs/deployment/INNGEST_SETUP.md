# Inngest Setup Guide

## Overview

This guide covers setting up Inngest for background job processing, replacing the Redis-based BullMQ worker with event-driven, serverless functions.

**Benefits:**
- ✅ **Zero idle polling** - Event-driven, no Redis commands when idle
- ✅ **Free tier: 50K events/month** - Plenty for staging
- ✅ **Built-in retries** - Automatic retry logic (3 attempts with exponential backoff)
- ✅ **Vercel integration** - Works seamlessly with serverless functions
- ✅ **No Redis needed for workers** - Eliminates worker polling entirely

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

## Quick Setup (Skip Dev Server for Vercel)

If you're deploying to Vercel and don't need local dev server:

1. **Skip onboarding** - On Inngest dashboard, click "I already have an Inngest app" or navigate to **Settings** → **Keys**
2. **Get Event Key** - Copy the Event Key (starts with `signkey-`)
3. **Add to Vercel** - Environment Variables → `INNGEST_EVENT_KEY`
4. **Deploy** - `git push` (code is already set up)
5. **Sync** - After deployment, Inngest Dashboard → Apps → Sync

**You don't need the Dev Server for Vercel deployment!**

## Migration from BullMQ

### Why Migrate?

**Before (BullMQ):**
- Worker polling: ~259K commands/month
- Webhook idempotency: ~1-2K commands/month
- **Total: ~260K commands/month** (exceeds free tier in 2 days)

**After (Inngest):**
- Worker polling: **0 commands** (event-driven)
- Webhook idempotency: ~1-2K commands/month (optional)
- **Total: ~1-2K commands/month**
- **Savings: 99% reduction in Redis usage**

### Migration Steps

1. **Install dependencies** (already done):
   ```bash
   cd apps/web
   pnpm install  # Installs inngest package
   ```

2. **Create Inngest account** and get Event Key (see Quick Setup above)

3. **Add environment variable** to Vercel:
   - `INNGEST_EVENT_KEY` = your Event Key

4. **Deploy code** (already migrated):
   - Email webhook now triggers Inngest events instead of BullMQ queues
   - Functions are in `apps/web/inngest/functions.ts`

5. **Sync functions** after deployment:
   - Inngest Dashboard → Apps → Sync
   - Functions auto-discovered at `https://your-domain.com/api/inngest`

## Redis Usage After Migration

### Option 1: Keep Redis for Webhook Idempotency (Recommended)
- Keep current Redis idempotency (1 command per webhook)
- Use Inngest for all background jobs
- **Result:** ~1-2K Redis commands/month ✅

### Option 2: Use Inngest Deduplication (Zero Redis)
- Remove Redis idempotency from webhooks
- Use Inngest's built-in deduplication
- **Result:** 0 Redis commands/month ✅

## Migration Checklist

- ✅ Inngest code created (functions, client, API route)
- ✅ Email webhook updated to use Inngest
- ✅ Package.json updated with Inngest dependency
- ⬜ Create Inngest account & get Event Key
- ⬜ Add `INNGEST_EVENT_KEY` to Vercel environment variables
- ⬜ Deploy to Vercel
- ⬜ Sync functions in Inngest dashboard
- ⬜ Test with a real email
- ⬜ Verify functions run in Inngest dashboard

## Testing

See [INNGEST_TESTING_GUIDE.md](./INNGEST_TESTING_GUIDE.md) for detailed testing procedures.

**Quick Test:**
1. Send a test email to your Mailgun alias
2. Check Vercel logs for: `[Email Webhook] Triggered Inngest event`
3. Check Inngest dashboard → **Runs** to see function execution
4. Verify AI suggestion appears in your dashboard

## Troubleshooting

**Inngest not receiving events?**
- Check `INNGEST_EVENT_KEY` is set in Vercel
- Verify Inngest app is synced (dashboard → Apps → Sync)
- Check Vercel logs for errors
- Verify endpoint URL: `https://your-domain.com/api/inngest`

**Functions not running?**
- Check Inngest dashboard → Runs
- Verify function is registered (dashboard → Functions)
- Check function logs in Inngest dashboard
- Verify `INNGEST_EVENT_KEY` matches in both Vercel and Inngest dashboard

**Getting 401 errors?**
- Verify Event Key is correct (no extra spaces)
- Check Event Key environment is set for correct Vercel environment (Preview/Production)
- Regenerate Event Key if needed

## Cost Comparison

**Upstash Redis Free Tier:**
- 500K commands/month
- **Status:** Exceeded ❌

**Inngest Free Tier:**
- 50K events/month
- 50K function invocations/month
- **Status:** Plenty for staging ✅

