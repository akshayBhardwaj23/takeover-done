# Environment Variables Setup Guide

## 🎯 Strategy: Local Redis (Dev) + Upstash (Staging/Production)

This guide helps you configure Redis correctly for each environment:

- **Development**: Local Redis (free, fast, no quotas)
- **Staging**: Upstash Redis (shared with production or separate)
- **Production**: Upstash Redis (managed, reliable)

---

## 📁 File Locations

### Development (Local):

- `apps/web/.env.local` - Web app environment variables
- `apps/worker/.env` - Worker environment variables

### Production/Staging:

- Set in deployment platform (Vercel, Railway, etc.)
- Never commit these files!

---

## 🔧 Development Setup (Local Redis)

### Step 1: Install Local Redis

**macOS:**

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

**Verify:**

```bash
redis-cli ping
# Should return: PONG
```

### Step 2: Configure Web App (`apps/web/.env.local`)

```bash
# ============================================
# DEVELOPMENT: Local Redis (NO Upstash)
# ============================================

# Local Redis (for BullMQ worker and rate limiting fallback)
REDIS_URL=redis://localhost:6379

# Remove or comment out Upstash variables in development
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

# Node environment
NODE_ENV=development

# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://...

# ============================================
# Auth
# ============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# ============================================
# OpenAI
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# Other services
# ============================================
SHOPIFY_API_KEY=...
SHOPIFY_CLIENT_SECRET=...
MAILGUN_API_KEY=...

# ============================================
# Google Analytics
# ============================================
# Get these from Google Cloud Console:
# 1. Create OAuth 2.0 Client ID (or use separate client for GA)
# 2. Add authorized redirect URIs:
#    - Development: http://localhost:3000/api/google-analytics/callback
#    - Staging: https://staging.zyyp.ai/api/google-analytics/callback
#    - Production: https://www.zyyp.ai/api/google-analytics/callback
# 3. Enable Google Analytics Admin API and Google Analytics Data API
# 4. Note: You can use a different Google account for GA than the one used for login
GOOGLE_ANALYTICS_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_ANALYTICS_CLIENT_SECRET=your-client-secret
# Note: Redirect URI is automatically constructed, no need to set GOOGLE_ANALYTICS_REDIRECT_URI

# ============================================
# Meta Ads
# ============================================
# Get these from Meta for Developers:
# 1. Create a new app at https://developers.facebook.com/apps/
# 2. Add "Marketing API" product to your app
# 3. Configure OAuth redirect URIs:
#    - Development: http://localhost:3000/api/meta-ads/callback
#    - Staging: https://staging.zyyp.ai/api/meta-ads/callback
#    - Production: https://www.zyyp.ai/api/meta-ads/callback
# 4. Add app permissions: ads_read (required), ads_management (optional)
# 5. For production, app must go through App Review
# Note: Redirect URI is automatically constructed, no need to set META_ADS_REDIRECT_URI
META_ADS_APP_ID=your-meta-app-id
META_ADS_APP_SECRET=your-meta-app-secret
```

### Step 3: Configure Worker (`apps/worker/.env`)

```bash
# ============================================
# DEVELOPMENT: Local Redis
# ============================================

# Local Redis for BullMQ queues
REDIS_URL=redis://localhost:6379

# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://...

# ============================================
# OpenAI (for AI suggestions)
# ============================================
OPENAI_API_KEY=sk-proj-...
```

---

## 🚀 Staging Setup (Upstash Redis)

### Step 1: Create/Use Upstash Redis Instance

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create or use existing Redis database
3. Copy connection details:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `REDIS_URL` (TCP connection string)

### Step 2: Set Environment Variables (Vercel/Railway)

**In Vercel (Staging/Preview):**

```bash
# Environment: Preview (staging)

# Upstash Redis
REDIS_URL=rediss://default:...@factual-osprey-17727.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://factual-osprey-17727.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Environment
NODE_ENV=production  # or staging
ENVIRONMENT=staging

# Database
DATABASE_URL=postgresql://...

# ... other vars
```

**In Railway (Staging Worker):**

```bash
# Environment: Staging

# Upstash Redis
REDIS_URL=rediss://default:...@factual-osprey-17727.upstash.io:6379

# Environment
NODE_ENV=production  # or staging
ENVIRONMENT=staging

# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-proj-...
```

---

## 🎯 Production Setup (Upstash Redis)

### Step 1: Use Same Upstash Instance (or Separate)

**Option A: Same Upstash for Staging + Production**

- Use different queue prefixes to avoid conflicts
- More cost-effective

**Option B: Separate Upstash Instance**

- Better isolation
- Easier to debug

### Step 2: Set Environment Variables

**In Vercel (Production):**

```bash
# Environment: Production

# Upstash Redis
REDIS_URL=rediss://default:...@factual-osprey-17727.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://factual-osprey-17727.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Environment
NODE_ENV=production
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://...

# ... other vars
```

**In Railway (Production Worker):**

```bash
# Environment: Production

# Upstash Redis
REDIS_URL=rediss://default:...@factual-osprey-17727.upstash.io:6379

# Environment
NODE_ENV=production
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-proj-...
```

---

## ✅ Verification

### Check Which Redis You're Using:

**In Development (should see):**

```bash
# Terminal output when starting app:
[Redis] Connected successfully  # Local Redis
# OR
Rate limiting using in-memory fallback  # If Upstash vars not set
```

**In Production/Staging (should see):**

```bash
[Redis] Connected successfully  # Upstash Redis
Rate limiting using Upstash Ratelimit  # Analytics enabled
```

---

## 🔍 Environment Detection Logic

The app automatically detects environment:

```typescript
// In apps/web/lib/rate-limit.ts
const isProduction = process.env.NODE_ENV === 'production';
const isStaging =
  process.env.ENVIRONMENT === 'staging' ||
  process.env.NODE_ENV === 'production';

// Only use Upstash in production/staging
const useUpstash = isProduction || isStaging;

const redis =
  useUpstash &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;
```

---

## 📝 Quick Reference

| Environment     | Redis   | REDIS_URL                     | UPSTASH vars | Rate Limiting                 |
| --------------- | ------- | ----------------------------- | ------------ | ----------------------------- |
| **Development** | Local   | `redis://localhost:6379`      | ❌ Not set   | In-memory fallback            |
| **Staging**     | Upstash | `rediss://...upstash.io:6379` | ✅ Set       | Upstash Ratelimit             |
| **Production**  | Upstash | `rediss://...upstash.io:6379` | ✅ Set       | Upstash Ratelimit (analytics) |

---

## 🚨 Important Notes

1. **Never commit `.env.local` or `.env` files** - They're in `.gitignore`
2. **Development**: Local Redis = **0 commands** to Upstash ✅
3. **Staging/Production**: Upstash = **shared quota** (500K/month free tier)
4. **Worker always uses `REDIS_URL`** - Make sure it points to correct Redis
5. **Rate limiting** uses Upstash REST API only in production/staging

---

## 🎯 Summary

- ✅ **Dev**: Local Redis → 0 Upstash commands
- ✅ **Staging**: Upstash → ~50K commands/month
- ✅ **Production**: Upstash → ~200K commands/month
- ✅ **Total**: ~250K/month → **Well within 500K free tier!** 🎉
