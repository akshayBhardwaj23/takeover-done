# Staging + Production Deployment Setup

## 🎯 Your Requirements

- **Staging Environment** - For testing before production
- **Production Environment** - For live users
- **Cost Efficient** - Minimize costs for MVP
- **Both need:**
  - Web app (Next.js)
  - Worker process (background jobs)

---

## 🏆 Best Option: **Railway** (Most Cost-Efficient)

### Why Railway for Staging + Production?

✅ **Branch-based deployments** - Automatic staging from `staging` branch  
✅ **Preview deployments** - Every PR gets preview (free)  
✅ **Shared or separate databases** - Flexible  
✅ **Environment variables per service** - Easy management  
✅ **Single platform** - Manage everything in one place  
✅ **Cost-effective** - Only pay for production, staging can be cheaper/free  

### Architecture:

```
GitHub Repo
├── main branch → Production (Railway Production Service)
├── staging branch → Staging (Railway Staging Service)
└── PR branches → Preview (Free, auto-destroy)

Railway Services:
├── Production Web App ($)
├── Production Worker ($)
├── Staging Web App ($$ - but can pause when not in use)
└── Staging Worker ($$ - but can pause when not in use)
```

---

## 💰 Railway Cost Strategy

### Option A: Always-On Staging (Recommended for Active Development)

```
Production Web:  $5-10/month
Production Worker: $5-10/month
Staging Web: $5-10/month
Staging Worker: $5-10/month
────────────────────────────
Total: $20-40/month
```

**Pros:**
- ✅ Staging always available for testing
- ✅ Easy to test deployments
- ✅ No waiting for cold starts

**Cons:**
- ⚠️ Costs more (~$40/month)

### Option B: Sleep-Aware Staging (Most Cost-Efficient)

```
Production Web:  $5-10/month
Production Worker: $5-10/month
Staging Web: $5/month (sleeps when inactive)
Staging Worker: $5/month (wakes on demand)
────────────────────────────
Total: $20-30/month
```

**How it works:**
- Staging services sleep after 5 minutes of inactivity
- Wake up automatically when accessed
- Slight delay on first request (~10-30 seconds)

**Pros:**
- ✅ Saves ~$10-15/month
- ✅ Still available when needed
- ✅ Good for MVP budget

**Cons:**
- ⚠️ Cold start delay (10-30 seconds)

### Option C: Single Worker Strategy (Even More Efficient)

```
Production Web: $5-10/month
Production Worker: $5-10/month
Staging Web: $5/month (sleeps)
Staging Worker: $0 (share production worker with environment check)
────────────────────────────
Total: $15-25/month
```

**How it works:**
- Production and staging share same worker
- Worker checks `NODE_ENV` or `ENVIRONMENT` variable
- Processes jobs from both environments (queue-based)

**Pros:**
- ✅ Most cost-efficient ($15-25/month)
- ✅ Still fully functional
- ✅ Good for MVP

**Cons:**
- ⚠️ Slightly more complex setup
- ⚠️ Both environments share worker resources

---

## 🚀 Recommended Setup: Railway with Sleep-Aware Staging

### Architecture:

```
Production:
├── Web App (railway.app/production)
└── Worker (always running)

Staging:
├── Web App (staging.railway.app - sleeps when inactive)
└── Worker (can sleep, or share with production)
```

### Cost: ~$20-30/month total

---

## 📋 Railway Setup Guide

### Step 1: Production Environment

1. **Create Production Services:**
   - Go to Railway → New Project → "Deploy from GitHub"
   - Connect your repo
   - Select `main` branch
   - Create service: **Production Web**
     - Root: repo root
     - Build: `pnpm install && pnpm build --filter @ai-ecom/web`
     - Start: `cd apps/web && pnpm start`
   - Create service: **Production Worker**
     - Build: `pnpm install && pnpm build --filter @ai-ecom/worker`
     - Start: `cd apps/worker && pnpm start`

2. **Set Environment Variables (Production):**
   ```
   NODE_ENV=production
   ENVIRONMENT=production
   DATABASE_URL=postgresql://... (production DB)
   REDIS_URL=rediss://... (production Redis - or reuse Upstash)
   NEXTAUTH_URL=https://your-app.com
   # ... all other production vars
   ```

3. **Custom Domain:**
   - Railway → Settings → Domains
   - Add: `your-app.com`
   - Update DNS → Railway auto-handles SSL

### Step 2: Staging Environment

1. **Create Staging Services:**
   - Railway → New Project → "Deploy from GitHub"
   - Connect same repo
   - Select `staging` branch (or create one)
   - Create service: **Staging Web**
     - Build: `pnpm install && pnpm build --filter @ai-ecom/web`
     - Start: `cd apps/web && pnpm start`
   - Create service: **Staging Worker** (optional if sharing)
     - Same build/start as production

2. **Set Environment Variables (Staging):**
   ```
   NODE_ENV=development  # or staging
   ENVIRONMENT=staging
   DATABASE_URL=postgresql://... (staging DB - can use same Supabase with different schema)
   REDIS_URL=rediss://... (staging Redis - can reuse same Upstash)
   NEXTAUTH_URL=https://staging.your-app.com
   # Use test API keys for staging:
   SHOPIFY_CLIENT_ID=... (test app)
   MAILGUN_API_KEY=... (test domain)
   ```

3. **Staging Domain:**
   - Add: `staging.your-app.com`
   - Or use Railway's auto-generated: `your-app-staging.up.railway.app`

### Step 3: Configure Sleep Behavior (Optional)

Railway doesn't sleep by default, but you can:
- **Use Render for staging** (has sleep feature)
- **Or manually pause staging** when not needed
- **Or accept the cost** (~$10/month for staging)

---

## 🥈 Alternative: Vercel (Web) + Railway (Worker)

### Architecture:

```
Web Apps:
├── Production: Vercel (main branch) - $20/month Pro
├── Staging: Vercel Preview (staging branch) - FREE!
└── Previews: Vercel (every PR) - FREE!

Workers:
├── Production Worker: Railway - $5-10/month
└── Staging Worker: Railway - $5/month (sleeps or shared)
────────────────────────────
Total: $25-35/month (staging web is FREE!)
```

### Why This Works Well:

✅ **Vercel Previews are FREE** - Perfect for staging  
✅ **Railway workers** - Cost-effective for background jobs  
✅ **Best of both worlds** - Vercel for Next.js, Railway for workers  

### Setup:

**Vercel (Web Apps):**
1. Connect repo to Vercel
2. Production: Deploy from `main` branch
3. Staging: Auto-deploy from `staging` branch (FREE preview)
4. Every PR: Gets free preview deployment

**Railway (Workers):**
1. Production Worker: Always running
2. Staging Worker: Can sleep or share with production

### Cost Breakdown:
```
Vercel Production: $20/month (Pro plan)
Vercel Staging: FREE (preview deployments)
Railway Production Worker: $5-10/month
Railway Staging Worker: $5/month (optional, can share)
────────────────────────────
Total: $25-35/month
```

---

## 🥉 Alternative: Render (Both Environments)

### Architecture:

```
Production:
├── Web Service - $7/month (no sleep)
└── Worker Service - $7/month (no sleep)

Staging:
├── Web Service - $7/month (can sleep)
└── Worker Service - $7/month (can sleep)
────────────────────────────
Total: $28/month (or $14/month if staging sleeps)
```

### Setup:
- Create 4 services in Render dashboard
- Each points to different branch or repo path
- Configure sleep for staging services

### Pros:
- ✅ Simple setup
- ✅ Built-in sleep feature (saves money)
- ✅ Staging sleeps automatically

### Cons:
- ⚠️ Slightly more expensive than Railway
- ⚠️ Cold start delay on staging (when sleeping)

---

## 💡 Recommended Strategy for Maximum Savings

### **Hybrid Approach (Best Cost/Performance):**

```
Web Apps:
├── Production: Vercel Pro ($20/month)
└── Staging: Vercel Preview (FREE!)

Workers:
├── Production: Railway ($5-10/month)
└── Staging: Share production worker OR separate ($0-5/month)
────────────────────────────
Total: $25-35/month
```

**Why this is best:**
- ✅ Staging web is FREE (Vercel previews)
- ✅ Production web optimized (Vercel for Next.js)
- ✅ Workers cost-effective (Railway)
- ✅ Can share staging worker or make it sleep
- ✅ Total cost: $25-35/month

---

## 📊 Cost Comparison

| Approach | Production | Staging | Total/Month |
|----------|------------|---------|-------------|
| **Railway Both** | $10-20 | $10-20 | $20-40 |
| **Railway Sleep-Aware** | $10-20 | $5-10 | $15-30 |
| **Vercel + Railway** | $25-30 | FREE | $25-35 |
| **Render Both** | $14 | $14 | $28 |
| **Render Sleep-Aware** | $14 | $0-7 | $14-21 |

### 🏆 Winner: **Vercel + Railway (Sleep-Aware)**

- **Cost:** $25-35/month
- **Staging:** FREE (Vercel preview)
- **Production:** Optimized
- **Best value** for your needs

---

## 🔧 Recommended Setup: Vercel + Railway

### Production Setup:

**Vercel (Production Web):**
```bash
# Production deploys from main branch
# Custom domain: your-app.com
# Pro plan: $20/month (needed for custom domains + analytics)
```

**Railway (Production Worker):**
```bash
# Always running
# Connects to production Redis
# Processes production jobs only
```

### Staging Setup:

**Vercel (Staging Web):**
```bash
# Auto-deploys from staging branch
# Preview URL: staging-your-app.vercel.app
# FREE! (included in Pro plan)
```

**Railway (Staging Worker):**
```bash
# Option 1: Separate service ($5/month, can sleep manually)
# Option 2: Share with production (check ENVIRONMENT variable)
# Option 3: Use production worker with staging queue (advanced)
```

---

## 📋 Step-by-Step: Vercel + Railway Setup

### Part 1: Vercel Setup (Web Apps)

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Import repository** from GitHub
3. **Configure Production:**
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && pnpm install && pnpm build --filter @ai-ecom/web`
   - Output Directory: `apps/web/.next`
   - Install Command: `cd ../.. && pnpm install`
   - Production Branch: `main`

4. **Configure Staging:**
   - Vercel automatically creates preview deployments
   - Go to Settings → Git
   - Enable "Preview Deployments"
   - Staging branch: `staging` (auto-deploys as preview)
   - Custom preview URL: `staging-your-app.vercel.app`

5. **Environment Variables:**
   - Production: Settings → Environment Variables → Production
   - Staging: Settings → Environment Variables → Preview
   - Can set different values per environment!

6. **Custom Domains:**
   - Production: Add `your-app.com` (requires Pro plan)
   - Staging: Preview URL is free (or add `staging.your-app.com`)

### Part 2: Railway Setup (Workers)

1. **Production Worker:**
   - New Project → GitHub Repo
   - Root: repo root
   - Build: `pnpm install && pnpm build --filter @ai-ecom/worker`
   - Start: `cd apps/worker && pnpm start`
   - Branch: `main`
   - Environment: `NODE_ENV=production`

2. **Staging Worker (Optional):**
   - Duplicate production worker
   - Change branch to `staging`
   - Environment: `NODE_ENV=staging`
   - OR: Share production worker with environment check

---

## 🔄 Sharing Worker Between Environments

### Option: Single Worker for Both

If you want to save $5/month, you can share the worker:

```typescript
// In apps/worker/src/index.ts
const environment = process.env.ENVIRONMENT || 'production';
const queuePrefix = environment === 'production' ? 'prod' : 'staging';

// Use different queue names
inboxQueue = new Queue(`${queuePrefix}:inbox`, { connection });
actionsQueue = new Queue(`${queuePrefix}:actions`, { connection });
```

**Webhook changes:**
```typescript
// In webhook, specify environment
await enqueueInboxJob('inbound-email-process', {
  messageId: msg.id,
}, {
  // Use environment-specific queue
});
```

**Pros:**
- ✅ Save $5/month
- ✅ One worker handles both

**Cons:**
- ⚠️ More complex setup
- ⚠️ Can't scale environments independently

---

## ✅ Final Recommendation

### **Vercel (Web) + Railway (Workers) - Sleep-Aware Staging**

**Setup:**
```
Production:
├── Web: Vercel Pro ($20/month)
└── Worker: Railway ($5-10/month)

Staging:
├── Web: Vercel Preview (FREE!)
└── Worker: Railway ($5/month - can manually pause when not testing)
────────────────────────────
Total: $25-35/month
```

**Why this is best:**
1. ✅ **Staging web is FREE** (Vercel previews)
2. ✅ **Production optimized** (Vercel for Next.js)
3. ✅ **Cost-effective** ($25-35/month total)
4. ✅ **Easy to manage** (two platforms, but simple)
5. ✅ **Scalable** (can add more workers as needed)

**Monthly Cost: ~$30/month**

---

## 📝 Environment Variables Strategy

### Production (Vercel):
```
NODE_ENV=production
ENVIRONMENT=production
NEXTAUTH_URL=https://your-app.com
DATABASE_URL=... (production Supabase)
# Production API keys
```

### Staging (Vercel Preview):
```
NODE_ENV=development
ENVIRONMENT=staging
NEXTAUTH_URL=https://staging-your-app.vercel.app
DATABASE_URL=... (can use same Supabase with test data)
# Test/Staging API keys
```

### Workers (Railway):
```
Production Worker:
  ENVIRONMENT=production
  REDIS_URL=... (production)
  DATABASE_URL=... (production)

Staging Worker (optional):
  ENVIRONMENT=staging
  REDIS_URL=... (can share same Upstash)
  DATABASE_URL=... (staging)
```

---

## 🎯 Quick Decision Matrix

**Choose Railway if:**
- ✅ Want everything in one place
- ✅ Simpler management
- ✅ Don't mind paying ~$30-40/month for both environments

**Choose Vercel + Railway if:**
- ✅ Want best Next.js performance
- ✅ Want FREE staging web
- ✅ Don't mind managing two platforms
- ✅ Want most cost-efficient option

---

## 💡 My Final Recommendation

### **Vercel + Railway (Hybrid)**

**Cost: ~$25-35/month**

**Setup:**
- Production Web → Vercel Pro ($20/month)
- Staging Web → Vercel Preview (FREE)
- Production Worker → Railway ($5-10/month)
- Staging Worker → Railway ($5/month, pause when not testing) OR share with production

**Benefits:**
- Staging web: FREE
- Production: Optimized (Vercel)
- Workers: Cost-effective
- Total: ~$30/month

This gives you the **best balance of cost, performance, and simplicity**.

---

## 🚀 Next Steps

1. **Set up Vercel** for web apps (30 min)
2. **Set up Railway** for workers (20 min)
3. **Configure environment variables** per environment
4. **Test staging deployment**
5. **Launch production**

Want me to create a detailed step-by-step guide for either platform?

