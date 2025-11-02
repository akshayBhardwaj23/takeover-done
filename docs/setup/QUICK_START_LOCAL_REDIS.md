# Quick Start: Local Redis for Development

## 🎯 Goal

Use **local Redis** for development (free, no quotas) and **Upstash** only for staging/production.

**Result:** Save your Upstash free tier (500K commands/month) for real users! ✅

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Install Local Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**Or use the setup script:**
```bash
./scripts/setup-local-redis.sh
```

**Verify:**
```bash
redis-cli ping
# Should return: PONG
```

### Step 2: Update Environment Variables

**`apps/web/.env.local`:**
```bash
# Local Redis (development)
REDIS_URL=redis://localhost:6379

# Remove or comment out these (not needed in dev):
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
```

**`apps/worker/.env`:**
```bash
# Local Redis (development)
REDIS_URL=redis://localhost:6379
```

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

---

## ✅ Verification

**Check logs when starting:**

**Expected in Development:**
```
[Redis] Connected successfully  # Local Redis
Rate limiting using in-memory fallback  # If Upstash vars not set
```

**Upstash Dashboard:**
- Commands should **stop increasing** in development ✅
- Only staging/production will use Upstash

---

## 🎯 What Changed?

### Code Updates:

1. **Rate Limiting** (`apps/web/lib/rate-limit.ts`)
   - Only uses Upstash in `NODE_ENV=production` or `ENVIRONMENT=staging`
   - Development: Falls back to in-memory rate limiting

2. **Webhooks** (email & Shopify)
   - Only use Upstash for idempotency in staging/production
   - Development: Continues without idempotency (safe for testing)

3. **Worker** (`apps/worker/src/index.ts`)
   - Uses `REDIS_URL` (local Redis in dev, Upstash in prod)

---

## 📊 Usage Breakdown

### Development:
- **Local Redis**: Unlimited commands ✅
- **Upstash**: 0 commands ✅

### Staging:
- **Upstash**: ~50K commands/month

### Production (20 customers):
- **Upstash**: ~200K commands/month

### Total:
- **~250K/month** → Well within 500K free tier! ✅

---

## 🚨 Troubleshooting

### "Redis connection refused"
```bash
# Check if Redis is running
redis-cli ping

# If not, start it:
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis
```

### "Worker: REDIS_URL not set"
- Make sure `apps/worker/.env` has `REDIS_URL=redis://localhost:6379`
- Restart the worker

### Still seeing Upstash commands in dev?
- Check that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are **not set** in `.env.local`
- Make sure `NODE_ENV=development` (or not set)

---

## 📝 Environment Summary

| Environment | Redis Type | REDIS_URL | UPSTASH vars | Commands to Upstash |
|-------------|-----------|-----------|--------------|---------------------|
| **Development** | Local | `redis://localhost:6379` | ❌ Not set | 0 ✅ |
| **Staging** | Upstash | `rediss://...upstash.io:6379` | ✅ Set | ~50K/month |
| **Production** | Upstash | `rediss://...upstash.io:6379` | ✅ Set | ~200K/month |

---

## ✅ Done!

Your development environment now uses **local Redis** (free, unlimited) and **Upstash** is reserved for staging/production.

**You've saved ~119K commands/month** that were being wasted on local development! 🎉

