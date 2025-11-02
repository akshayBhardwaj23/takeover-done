# Redis Setup Guide

## Overview

Your project uses **two different Redis setups** for different purposes:

1. **Upstash Redis** (REST API) - For rate limiting and webhook idempotency
2. **Traditional Redis** (connection string) - For background job processing (BullMQ worker)

## What Redis is Used For

### 1. Rate Limiting (Upstash Redis)
- **API rate limiting**: 100 requests/minute per user
- **AI rate limiting**: 10 requests/minute per user (expensive operations)
- **Email rate limiting**: 20 emails/minute per user
- **Webhook rate limiting**: 60 requests/minute per IP

### 2. Webhook Idempotency (Upstash Redis)
- Prevents processing duplicate webhooks from Shopify, Mailgun, etc.
- Stores processed webhook IDs with 24-hour TTL

### 3. Background Jobs (Traditional Redis)
- BullMQ worker queues for async processing
- Email processing jobs
- AI suggestion generation
- Action jobs

## Is Redis Required?

### For Rate Limiting & Webhooks
- **Optional** - The code has fallback to in-memory rate limiting
- **Recommended for production** - In-memory limits don't persist across restarts or scale horizontally
- If not set, you'll see warnings but the app will work

### For Background Workers
- **Required** - If you want to use the `apps/worker` for async job processing
- **Optional for development** - If you're not using background jobs yet, you can skip this

## Setup Options

### Option 1: Upstash Redis (Recommended - Cloud, Free Tier Available)

#### Why Upstash?
- ✅ Free tier available (10,000 commands/day)
- ✅ Serverless/cloud-based (no setup needed)
- ✅ REST API works in serverless environments (Vercel, etc.)
- ✅ Perfect for rate limiting and idempotency
- ✅ No infrastructure to manage

#### Setup Steps:

1. **Create Account & Database**
   - Go to [Upstash.com](https://upstash.com) and sign up (free)
   - Click "Create Database"
   - Choose a region close to your servers
   - Select "REST API" (for rate limiting) or "Redis" (if you also want to use it for BullMQ)
   - Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **For Rate Limiting Only** (REST API):
   ```bash
   # Add to apps/web/.env.local
   UPSTASH_REDIS_REST_URL="https://your-db-name.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token-here"
   ```

3. **For BullMQ Worker Too** (If using Redis connection):
   ```bash
   # Get the Redis connection URL from Upstash dashboard
   # Format: rediss://default:token@host:port
   REDIS_URL="rediss://default:your-token@your-host:port"
   ```

#### Free Tier Limits:
- **10,000 commands/day** (plenty for development and small production)
- **256 MB storage**
- Perfect for starting out!

#### Pricing (if you exceed free tier):
- Pay-as-you-go: ~$0.20 per 100K commands
- Very affordable for most applications

---

### Option 2: Local Redis (Free, Good for Development)

#### macOS:
```bash
# Install Redis
brew install redis

# Start Redis server
brew services start redis
# Or run manually: redis-server

# Redis will run on localhost:6379 by default
```

#### Linux (Ubuntu/Debian):
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows:
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL and follow Linux instructions

#### Configuration:
```bash
# For BullMQ worker (apps/worker)
REDIS_URL="redis://localhost:6379"

# Note: Upstash REST API requires cloud Redis, so you'd still need Upstash for rate limiting
# OR you can skip Upstash REST API and only use local Redis for BullMQ worker
```

---

### Option 3: Hybrid Setup (Recommended for Production)

- **Upstash (REST API)** - For rate limiting and idempotency (works in serverless)
- **Upstash (Redis)** or **Managed Redis** (Redis Cloud, AWS ElastiCache) - For BullMQ worker

This gives you:
- ✅ Rate limiting that works in serverless environments
- ✅ Persistent job queues
- ✅ Horizontal scaling for workers

---

## Environment Variables

### For Rate Limiting (Upstash REST API)
```bash
# apps/web/.env.local
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### For Background Workers (Redis Connection)
```bash
# For local Redis
REDIS_URL="redis://localhost:6379"

# For Upstash Redis (with connection string)
REDIS_URL="rediss://default:token@host:port"

# For other cloud Redis services
REDIS_URL="rediss://username:password@host:port"
```

## Local vs Production Setup

### Local Development
**Recommended**: Use Upstash free tier for simplicity
- No local installation needed
- Same setup as production
- Free tier is sufficient

**Alternative**: Install local Redis if you prefer
- Good for offline development
- Need to set up Upstash separately for rate limiting (or skip it)

### Production
**Required**: Use cloud Redis (Upstash or other managed service)
- Must be accessible from your production servers
- Should use Upstash REST API for rate limiting (works in serverless)
- Can use same Upstash instance or separate Redis for BullMQ worker

## Verification

### Test Rate Limiting Setup
```bash
# Start your web app
cd apps/web
pnpm dev

# Check console - you should NOT see Redis warnings if configured correctly
# If you see "Redis idempotency check failed" warnings, Redis isn't configured
```

### Test Worker Setup
```bash
# Start worker
cd apps/worker
pnpm dev

# If REDIS_URL is set correctly, you should see:
# Worker: Queues initialized successfully

# If not set, you'll see:
# Worker: REDIS_URL not set. Queues/workers are disabled.
```

## Troubleshooting

### "Upstash Redis client was passed an invalid URL"
- Make sure `UPSTASH_REDIS_REST_URL` starts with `https://`
- Don't include placeholder text (like `"https://..."`)
- Get the actual URL from Upstash dashboard

### "Worker: REDIS_URL not set"
- This is just a warning if you're not using background workers yet
- Can be safely ignored if you don't need async job processing
- If you do need it, set `REDIS_URL` environment variable

### Rate Limiting Not Working
- Check that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Verify the tokens are correct in Upstash dashboard
- Check Upstash dashboard for usage/quota limits

## Summary

| Use Case | Required? | Best Option | Cost |
|----------|-----------|-------------|------|
| Rate Limiting | Optional (has fallback) | Upstash REST API | Free tier available |
| Webhook Idempotency | Optional (has fallback) | Upstash REST API | Free tier available |
| Background Workers | Only if using worker | Upstash or Local Redis | Free tier / Free (local) |

### Quick Start Recommendation:
1. **Sign up for Upstash free tier** (2 minutes)
2. **Add REST API credentials** to `apps/web/.env.local`
3. **That's it!** - Rate limiting and idempotency will work
4. **Skip BullMQ setup** until you actually need background jobs

The app works fine without Redis, but you'll get better reliability and scalability with it!

