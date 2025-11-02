# Local Redis Setup for Development

## Why You're Seeing 119K Commands on Upstash

Your local development environment is connecting to your **production Upstash Redis** instance, which is why you're seeing command usage even when running locally.

### What's Using Redis in Your Local App:

1. **Rate Limiting** (`apps/web/lib/rate-limit.ts`)
   - Every API request checks rate limits → **2-3 commands per request**
   - AI suggestions, email sending, webhooks all use rate limiters
   - Example: 100 API calls = ~200-300 Redis commands

2. **Webhook Idempotency** (`apps/web/app/api/webhooks/email/custom/route.ts`)
   - Every email webhook checks for duplicates → **2 commands per webhook**
   - GET to check if processed
   - SET to mark as processed
   - Example: 100 webhooks = ~200 Redis commands

3. **Background Jobs (BullMQ)** (`apps/worker/src/index.ts`)
   - Every job enqueued/processed uses Redis → **10-20 commands per job**
   - Queue operations, job status, retries all hit Redis
   - Example: 50 AI processing jobs = ~500-1,000 Redis commands

4. **Daily Development Activity**
   - Running `pnpm dev` → constant connections
   - Testing features → many API calls
   - Hot reloads → reconnections
   - Worker restarts → queue reconnections

**119K commands over time = normal for active local development!**

---

## ✅ Solution: Use Local Redis for Development

Use a **local Redis instance** for development and **keep Upstash only for production**.

### Benefits:

- ✅ **Save Upstash quota** for production use
- ✅ **Faster** (no network latency)
- ✅ **Free** (local Redis is free)
- ✅ **No usage limits**
- ✅ **Better testing** (isolated from production)

---

## 🚀 Setup Local Redis

### Option 1: Install Redis Locally (Recommended)

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL (Windows Subsystem for Linux)

**Verify it's running:**
```bash
redis-cli ping
# Should return: PONG
```

### Option 2: Use Docker (Alternative)

```bash
docker run -d -p 6379:6379 --name redis-dev redis:7-alpine
```

**Stop it when done:**
```bash
docker stop redis-dev
docker rm redis-dev
```

---

## 🔧 Configure Environment Variables

### For Local Development:

**Create `apps/web/.env.local` (or update existing):**
```bash
# Local Redis (for development)
REDIS_URL=redis://localhost:6379

# Keep Upstash variables commented out or remove them
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
```

**Create `apps/worker/.env` (or update existing):**
```bash
# Local Redis (for development)
REDIS_URL=redis://localhost:6379

# Database and API keys stay the same
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
```

### For Production:

**Keep Upstash in production environment variables:**
```bash
# Production Redis (Upstash)
REDIS_URL=rediss://default:...@factual-osprey-17727.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 📝 Environment Strategy

### Recommended Approach:

1. **Local Development:**
   - Use `redis://localhost:6379`
   - Store in `apps/web/.env.local` and `apps/worker/.env`
   - Add to `.gitignore` (already done)

2. **Production:**
   - Use Upstash Redis (`rediss://...`)
   - Set in Railway/Vercel environment variables
   - Never commit production credentials

3. **Staging:**
   - Can use Upstash or separate local Redis
   - Or share production Redis (with different queue prefixes)

---

## 🧪 Testing Your Setup

### 1. Start Local Redis:
```bash
redis-cli ping
# Should return: PONG
```

### 2. Update Environment Variables:
- Set `REDIS_URL=redis://localhost:6379` in your `.env.local` files
- Remove or comment out Upstash variables

### 3. Restart Your Dev Server:
```bash
# Stop current server (Ctrl+C)
pnpm dev
```

### 4. Check Connection:
```bash
# In another terminal
redis-cli
> KEYS *
# Should see rate limit keys, queue keys, etc. when you use the app
```

### 5. Verify Upstash Usage:
- Check Upstash dashboard
- Commands should stop increasing (or increase very slowly)
- Your 119K commands will reset at end of month (500K limit)

---

## ⚠️ Important Notes

### BullMQ with Local Redis:

Local Redis works perfectly with BullMQ! The worker will:
- Connect to `redis://localhost:6379`
- Create queues locally
- Process jobs normally
- No TLS needed (localhost is secure)

### Rate Limiting:

The `@upstash/ratelimit` package requires Upstash REST API, but:
- Your code has **fallback to in-memory** rate limiting
- If `UPSTASH_REDIS_REST_URL` is not set, it uses in-memory
- Local Redis (`ioredis`) is used by BullMQ worker
- Rate limiting for web/app uses in-memory fallback (which is fine for local dev)

### Mixed Setup (Optional):

You can use:
- **Local Redis** for BullMQ worker (via `REDIS_URL`)
- **In-memory** for rate limiting (when Upstash REST vars not set)

This works perfectly for local development!

---

## 🔄 Switching Between Local and Upstash

### Quick Switch Script:

**For Local Development:**
```bash
# apps/web/.env.local
REDIS_URL=redis://localhost:6379
# Comment out Upstash REST vars for local
```

**For Production Testing:**
```bash
# apps/web/.env.local
REDIS_URL=rediss://default:...@factual-osprey-17727.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 📊 Command Usage Estimate

With local Redis for development:

**Local Development (per day):**
- Rate limiting: ~1,000-5,000 commands/day (in-memory fallback)
- BullMQ: ~500-2,000 commands/day (local Redis, doesn't count toward Upstash)
- **Upstash usage: ~0 commands/day** ✅

**Production (per day):**
- Rate limiting: ~10,000-50,000 commands/day (if 100 customers)
- BullMQ: ~5,000-20,000 commands/day
- **Upstash usage: ~15,000-70,000 commands/day**

**Monthly Production:**
- ~450K-2.1M commands/month
- Free tier: 500K/month (might need upgrade at ~200 customers)

---

## ✅ Next Steps

1. **Install local Redis:**
   ```bash
   brew install redis && brew services start redis
   ```

2. **Update environment variables:**
   - Set `REDIS_URL=redis://localhost:6379` in local `.env` files
   - Remove Upstash REST vars from local config

3. **Restart dev server:**
   ```bash
   pnpm dev
   ```

4. **Verify:**
   - Check Upstash dashboard (should stop increasing)
   - Test locally (should work fine)
   - Worker should connect to local Redis

---

## 💡 Pro Tip

You can keep **both** Redis instances:
- **Local Redis** → for BullMQ worker and local testing
- **Upstash** → commented out locally, active in production

This way:
- Development is fast and free
- Production uses managed Redis (Upstash)
- No conflicts, best of both worlds!

---

## 🎯 Summary

**Why you have 119K commands:**
- Local dev is using remote Upstash Redis
- Every API call, webhook, and job uses Redis
- 119K commands = normal for active development

**Solution:**
- Use `redis://localhost:6379` for local development
- Keep Upstash only for production
- Save your 500K/month quota for real users!

**Cost Impact:**
- Local Redis: FREE ✅
- Upstash usage: 0 commands/day (instead of ~4,000/day)
- Production: Still uses Upstash (as intended)

