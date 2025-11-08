# Complete Deployment Guide: Vercel + Railway (Staging & Production)

**Last Updated:** Current Date  
**Approach:** Vercel (Web Apps) + Railway (Workers)  
**Timeline:** 2-3 days for complete setup

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Overview](#infrastructure-overview)
3. [Database Setup (PostgreSQL)](#database-setup-postgresql)
4. [Redis Setup (Upstash)](#redis-setup-upstash)
5. [Vercel Setup (Web Apps)](#vercel-setup-web-apps)
6. [Railway Setup (Workers)](#railway-setup-workers)
7. [Environment Variables Configuration](#environment-variables-configuration)
8. [Shopify App Configuration](#shopify-app-configuration)
9. [Mailgun Configuration](#mailgun-configuration)
10. [Domain & DNS Setup](#domain--dns-setup)
11. [Testing & Verification](#testing--verification)
12. [Monitoring & Observability](#monitoring--observability)
13. [Going Live Checklist](#going-live-checklist)
14. [Troubleshooting](#troubleshooting)

---

## 🎯 Pre-Deployment Checklist

Before starting deployment, ensure you have:

### Required Accounts
- [ ] GitHub repository (public or private with deployment access)
- [ ] Vercel account (Pro plan recommended - $20/month)
- [ ] Railway account (Free tier works, $5-10/month for workers)
- [ ] Supabase account (or PostgreSQL provider) for database
- [ ] Upstash account for Redis (free tier available)
- [ ] Shopify Partners account
- [ ] Mailgun account
- [ ] Domain name (for production)
- [ ] Sentry account (already configured)

### Code Preparation
- [ ] All code pushed to GitHub
- [ ] `main` branch is production-ready
- [ ] `staging` branch exists (or create it)
- [ ] All environment variables documented
- [ ] Database migrations are ready
- [ ] Build passes locally (`pnpm build`)

### Documentation
- [ ] Environment variable template ready
- [ ] API keys and secrets secured (password manager)
- [ ] Deployment checklist printed/accessible

---

## 🏗️ Infrastructure Overview

### Architecture

```
Production:
├── Web App: Vercel (main branch) → https://your-app.com
├── Worker: Railway (main branch) → Background jobs
├── Database: Supabase PostgreSQL
├── Redis: Upstash
└── External: Shopify, Mailgun, OpenAI

Staging:
├── Web App: Vercel Preview (staging branch) → https://staging-your-app.vercel.app
├── Worker: Railway (staging branch, optional) → Background jobs
├── Database: Separate Supabase database OR same DB with different schema
├── Redis: Same Upstash (with different queue prefixes)
└── External: Shopify Test App, Mailgun Test Domain, OpenAI (same key)
```

### Cost Breakdown (Monthly)

```
Vercel Pro Plan:            $20/month
Railway Production Worker:  $5-10/month
Railway Staging Worker:     $5/month (optional, can share with production)
Supabase:                   Free tier (up to 500MB) or $25/month for Pro
Upstash Redis:              Free tier (500K commands/month) or $10/month
────────────────────────────────────────────
Total:                      $30-55/month (depending on database plan)
```

---

## 🗄️ Database Setup (PostgreSQL)

### Option A: Supabase (Recommended)

#### 1. Create Production Database

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project:
   - **Name:** `ai-ecom-production`
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to your users
   - Click **Create new project**
   - Wait 2-3 minutes for setup

3. Get connection string:
   - Go to **Settings** → **Database**
   - Under **Connection string**, select **URI**
   - Copy the connection string (looks like):
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - **Important:** Replace `[YOUR-PASSWORD]` with your actual password
   - This is your `DATABASE_URL` for production

4. **Enable Connection Pooling** (for serverless):
   - Use the **Connection Pooler** URL instead:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - Port 6543 is the pooler port (better for Vercel serverless)
   - Add `?pgbouncer=true&connection_limit=1` for Prisma compatibility

#### 2. Create Staging Database

**Option 1: Separate Database (Recommended)**
- Create another Supabase project: `ai-ecom-staging`
- Get connection string same way
- This gives complete isolation

**Option 2: Same Database (Cost-Efficient)**
- Use same production database
- Use different table prefixes or schemas
- Less isolation but saves $25/month

#### 3. Run Migrations

**For Production:**
```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Run migrations
pnpm db:migrate

# Verify schema
cd packages/db
pnpm prisma studio
# Opens Prisma Studio to view tables
```

**For Staging:**
```bash
# Set staging DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[STAGING-REF].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Run migrations
pnpm db:migrate
```

#### 4. Database Settings

In Supabase dashboard:
- **Settings** → **Database** → Enable **SSL mode** (already enabled)
- **Settings** → **API** → Note your `project_ref` (needed for connection)
- **Authentication** → Set up Row Level Security if needed (for multi-tenant)

### Option B: Railway PostgreSQL

1. Create Railway account
2. **New Project** → **Add PostgreSQL**
3. Copy connection string from **Variables** tab
4. Same process for staging (separate service)

---

## 🔴 Redis Setup (Upstash)

### 1. Create Upstash Redis Instance

1. Go to [Upstash Console](https://console.upstash.com/)
2. Click **Create Database**
3. Configure:
   - **Name:** `ai-ecom-redis` (or `ai-ecom-redis-production`)
   - **Type:** Regional (closest to your users)
   - **Region:** Choose closest region
   - Click **Create**

4. Get connection details:
   - **REST URL:** `https://[endpoint].upstash.io`
   - **REST Token:** `AXxxxxxxxxxxxxx`
   - **Redis URL:** `rediss://default:[token]@[endpoint].upstash.io:6379`
   - Copy all three values

### 2. For Staging

**Option 1: Same Redis (Recommended)**
- Use same Upstash instance
- Use different queue prefixes in code:
  ```typescript
  const queuePrefix = process.env.ENVIRONMENT === 'production' ? 'prod' : 'staging';
  const queue = new Queue(`${queuePrefix}:inbox`, { connection });
  ```

**Option 2: Separate Redis**
- Create another Upstash database: `ai-ecom-redis-staging`
- Complete isolation

### 3. Verify Connection

```bash
# Test connection using Redis CLI
redis-cli -u "rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379" ping
# Should return: PONG
```

---

## ☁️ Vercel Setup (Web Apps)

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && pnpm install && pnpm build --filter @ai-ecom/web`
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `cd ../.. && pnpm install`

### Step 2: Production Configuration

1. In project settings, set **Production Branch:** `main`
2. **Environment Variables** (Production):
   - Click **Settings** → **Environment Variables**
   - Add all production variables (see [Environment Variables](#environment-variables-configuration) section)
   - Make sure **Environment** is set to **Production**

3. **Custom Domain:**
   - Go to **Settings** → **Domains**
   - Add your domain: `your-app.com`
   - Follow DNS instructions (we'll cover this later)
   - Vercel auto-provisions SSL certificate

4. **Deploy Settings:**
   - **Build Command:** `cd ../.. && pnpm install && pnpm build --filter @ai-ecom/web`
   - **Output Directory:** `apps/web/.next`
   - **Install Command:** `cd ../.. && pnpm install`

### Step 3: Staging Configuration

1. **Create Staging Branch:**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. **Configure Preview Deployments:**
   - Vercel automatically creates preview deployments for each branch
   - Go to **Settings** → **Git**
   - Enable **Preview Deployments**
   - Production branch: `main`
   - All other branches: `staging` → Preview

3. **Staging Environment Variables:**
   - In **Environment Variables**, add same variables
   - Set **Environment** to **Preview**
   - Use staging values (different database, different Shopify app, etc.)

4. **Staging URL:**
   - Preview URL: `staging-your-app.vercel.app` (auto-generated)
   - Or add custom domain: `staging.your-app.com`

### Step 4: Build Configuration

Update `apps/web/next.config.mjs` if needed:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ai-ecom/api', '@ai-ecom/db'],
  // ... rest of config
};

export default nextConfig;
```

Vercel will auto-detect Next.js and use these settings.

### Step 5: First Deploy

1. Push to `main` branch → Production deploys automatically
2. Push to `staging` branch → Preview deploys automatically
3. Check **Deployments** tab for build logs
4. Verify deployment succeeded

---

## 🚂 Railway Setup (Workers)

### Step 1: Create Production Worker

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. **Add Service** → **Empty Service**
5. Configure:
   - **Name:** `production-worker`
   - **Source:** GitHub repo, `main` branch
   - **Root Directory:** `apps/worker`
   - **Build Command:** `cd ../.. && pnpm install && pnpm build --filter @ai-ecom/worker`
   - **Start Command:** `node dist/index.js`

6. **Environment Variables:**
   - Click service → **Variables** tab
   - Add all worker environment variables (see [Environment Variables](#environment-variables-configuration))
   - Set `ENVIRONMENT=production`
   - Set `NODE_ENV=production`

7. **Deploy:**
   - Railway auto-detects changes and redeploys
   - Check **Deployments** tab for logs
   - Verify worker starts successfully

### Step 2: Create Staging Worker (Optional)

**Option 1: Separate Service (Recommended)**
1. In same Railway project, **Add Service** again
2. **Name:** `staging-worker`
3. **Source:** Same repo, but `staging` branch
4. Same build/start commands
5. Different environment variables:
   - `ENVIRONMENT=staging`
   - `DATABASE_URL` → staging database
   - Different queue prefixes (if sharing Redis)

**Option 2: Share Worker (Cost-Efficient)**
- Use same production worker
- Add environment check in code:
  ```typescript
  const environment = process.env.ENVIRONMENT || 'production';
  const queuePrefix = environment === 'production' ? 'prod' : 'staging';
  ```
- Queue jobs with environment-specific prefixes
- More complex but saves $5/month

### Step 3: Worker Configuration

Create `railway.json` in `apps/worker/`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && pnpm install && pnpm build --filter @ai-ecom/worker"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 4: Verify Worker Running

1. Check Railway **Logs** tab
2. Should see: `Worker started successfully`
3. Should see: `Connected to Redis`
4. Test by queuing a job from web app

---

## 🔐 Environment Variables Configuration

### Production (Vercel)

**Settings → Environment Variables → Production**

```bash
# ============================================
# Environment
# ============================================
NODE_ENV=production
ENVIRONMENT=production
NEXTAUTH_URL=https://your-app.com

# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# ============================================
# Redis (Upstash)
# ============================================
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# ============================================
# Auth
# ============================================
NEXTAUTH_SECRET=[GENERATE_NEW_SECRET_FOR_PRODUCTION]
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]

# ============================================
# Shopify (Production App)
# ============================================
SHOPIFY_API_KEY=[PRODUCTION_SHOPIFY_APP_API_KEY]
SHOPIFY_API_SECRET=[PRODUCTION_SHOPIFY_APP_SECRET]
SHOPIFY_APP_URL=https://your-app.com
SHOPIFY_SCOPES=read_orders,write_orders,read_products
SHOPIFY_WEBHOOK_SECRET=[GENERATE_NEW_SECRET]

# ============================================
# Mailgun (Production)
# ============================================
MAILGUN_API_KEY=[PRODUCTION_MAILGUN_KEY]
MAILGUN_DOMAIN=[YOUR_VERIFIED_DOMAIN]
MAILGUN_FROM_EMAIL=support@your-domain.com
MAILGUN_SIGNING_KEY=[MAILGUN_WEBHOOK_SIGNING_KEY]

# ============================================
# OpenAI
# ============================================
OPENAI_API_KEY=sk-proj-[YOUR_KEY]

# ============================================
# Sentry
# ============================================
SENTRY_DSN=[YOUR_SENTRY_DSN]
SENTRY_AUTH_TOKEN=[YOUR_SENTRY_AUTH_TOKEN]

# ============================================
# Feature Flags
# ============================================
PROTECTED_WEBHOOKS=true
MOCK_WEBHOOKS=false
```

### Staging (Vercel Preview)

**Settings → Environment Variables → Preview**

Same structure, but use staging values:
- `ENVIRONMENT=staging`
- `NEXTAUTH_URL=https://staging-your-app.vercel.app`
- `DATABASE_URL` → staging database
- `SHOPIFY_API_KEY` → staging/test Shopify app
- `SHOPIFY_APP_URL=https://staging-your-app.vercel.app`
- Use same `REDIS_URL` but different queue prefixes

### Production Worker (Railway)

**Service → Variables Tab**

```bash
# ============================================
# Environment
# ============================================
NODE_ENV=production
ENVIRONMENT=production

# ============================================
# Database
# ============================================
DATABASE_URL=[SAME_AS_PRODUCTION_WEB]

# ============================================
# Redis
# ============================================
REDIS_URL=[SAME_AS_PRODUCTION_WEB]
UPSTASH_REDIS_REST_URL=[SAME_AS_PRODUCTION_WEB]
UPSTASH_REDIS_REST_TOKEN=[SAME_AS_PRODUCTION_WEB]

# ============================================
# OpenAI
# ============================================
OPENAI_API_KEY=[SAME_AS_PRODUCTION_WEB]

# ============================================
# Optional: Feature Flags
# ============================================
PROTECTED_WEBHOOKS=true
```

### Staging Worker (Railway)

Same as production worker, but:
- `ENVIRONMENT=staging`
- `DATABASE_URL` → staging database
- Same Redis (with different queue prefixes)

---

## 🛍️ Shopify App Configuration

### Step 1: Create Production Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. **Apps** → **Create app**
3. Choose **Custom app**
4. **App name:** Your App Name (Production)
5. **App URL:** `https://your-app.com`
6. **Allowed redirection URL(s):**
   ```
   https://your-app.com/api/shopify/callback
   ```

7. **API Credentials:**
   - Note your **Client ID** → `SHOPIFY_API_KEY`
   - Note your **Client secret** → `SHOPIFY_API_SECRET`
   - These go in Vercel environment variables

8. **Scopes (API scopes):**
   - `read_orders`
   - `write_orders`
   - `read_products`
   - `write_products` (if needed)
   - `read_customers`
   - `read_inventory` (if needed)

9. **Webhooks:**
   - Click **Webhooks** tab
   - Add webhooks (or let app register them automatically):
     - `orders/create` → `https://your-app.com/api/webhooks/shopify`
     - `orders/fulfilled` → `https://your-app.com/api/webhooks/shopify`
     - `refunds/create` → `https://your-app.com/api/webhooks/shopify`
     - `app/uninstalled` → `https://your-app.com/api/webhooks/shopify`

10. **Webhook Secret:**
    - Generate a secret: `openssl rand -hex 32`
    - Use as `SHOPIFY_WEBHOOK_SECRET`
    - Add to Vercel environment variables

### Step 2: Create Staging Shopify App

1. Create **another app** in Partners Dashboard
2. **App name:** Your App Name (Staging)
3. **App URL:** `https://staging-your-app.vercel.app`
4. **Redirect URL:** `https://staging-your-app.vercel.app/api/shopify/callback`
5. Same scopes
6. Different webhook URLs pointing to staging
7. Different `SHOPIFY_WEBHOOK_SECRET`

### Step 3: Test Installation

**For Production:**
1. Go to `https://your-app.com/integrations`
2. Click "Connect Shopify"
3. Enter test shop domain: `your-test-shop.myshopify.com`
4. Complete OAuth flow
5. Verify connection saved in database
6. Verify webhooks registered

**For Staging:**
1. Use staging URL: `https://staging-your-app.vercel.app/integrations`
2. Use different test shop or same shop
3. Test OAuth flow

### Step 4: Shopify App Store Listing (Production Only)

1. In Partners Dashboard → Your App → **Overview**
2. Complete app listing:
   - App description
   - Screenshots
   - Privacy policy URL
   - Terms of service URL
3. Submit for review (if going public)
4. For private/development apps, you can skip review

---

## 📧 Mailgun Configuration

### Step 1: Production Domain Setup

1. Go to [Mailgun Dashboard](https://app.mailgun.com/)
2. **Sending** → **Domains**
3. **Add New Domain** → Enter your domain: `your-domain.com`
4. Follow DNS setup instructions:
   - Add MX records
   - Add TXT records (SPF, DKIM)
   - Add CNAME records
   - Verify domain (takes 24-48 hours)

5. **API Keys:**
   - **Settings** → **API Keys**
   - Copy **Private API key** → `MAILGUN_API_KEY`

6. **Webhook Signing Key:**
   - **Settings** → **API Security**
   - Copy **HTTP webhook signing key** → `MAILGUN_SIGNING_KEY`

7. **From Email:**
   - Use any address from verified domain: `support@your-domain.com`
   - Set as `MAILGUN_FROM_EMAIL`

### Step 2: Staging Domain Setup

**Option 1: Separate Domain**
- Create subdomain: `staging.your-domain.com`
- Verify in Mailgun
- Use for staging

**Option 2: Same Domain**
- Use same production domain
- Different webhook URLs
- Less isolation but simpler

### Step 3: Email Routing (Mailgun Routes)

1. **Receiving** → **Routes**
2. Create route:
   - **Route expression:** `match_recipient("support@your-domain.com")`
   - **Action:** Forward to webhook
   - **Webhook URL:** `https://your-app.com/api/webhooks/email/custom`
   - **Secret:** Generate secret, add as header `x-email-webhook-secret`

3. **For Staging:**
   - Different route expression
   - Different webhook URL: `https://staging-your-app.vercel.app/api/webhooks/email/custom`

### Step 4: Add Environment Variables

Add to Vercel (both production and staging):
```bash
MAILGUN_API_KEY=[YOUR_KEY]
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=support@your-domain.com
MAILGUN_SIGNING_KEY=[YOUR_SIGNING_KEY]
```

---

## 🌐 Domain & DNS Setup

### Step 1: Purchase Domain (If Needed)

- Use any registrar (Namecheap, GoDaddy, Google Domains, etc.)
- Point nameservers to Vercel (or use DNS provider)

### Step 2: Configure DNS for Production

1. In Vercel → **Settings** → **Domains** → Add domain
2. Vercel will show DNS records to add:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. Add these records in your DNS provider
4. Wait for DNS propagation (5 minutes to 48 hours)
5. Vercel auto-provisions SSL certificate

### Step 3: Configure DNS for Staging (Optional)

1. Add subdomain: `staging.your-app.com`
2. In Vercel → Add domain: `staging.your-app.com`
3. Add CNAME record:
   ```
   Type: CNAME
   Name: staging
   Value: cname.vercel-dns.com
   ```

### Step 4: Verify SSL

- Vercel automatically provisions SSL
- Check in browser: `https://your-app.com` should show padlock
- For staging: `https://staging-your-app.vercel.app` (Vercel-provided) or custom domain

---

## ✅ Testing & Verification

### Step 1: Production Testing

**1. Database Connection:**
```bash
# Test from local machine
export DATABASE_URL="[PRODUCTION_URL]"
cd packages/db
pnpm prisma studio
# Should open Prisma Studio connected to production
```

**2. Web App:**
- Visit `https://your-app.com`
- Should load without errors
- Check browser console for errors
- Test authentication flow

**3. Shopify OAuth:**
- Go to `https://your-app.com/integrations`
- Click "Connect Shopify"
- Complete OAuth flow
- Verify redirect works
- Check database for connection record

**4. Webhooks:**
- Create test order in Shopify
- Check Vercel logs for webhook received
- Check database for order record
- Verify worker processed job

**5. Email Webhook:**
- Send test email to `support@your-domain.com`
- Check Mailgun logs for delivery
- Check Vercel logs for webhook received
- Check database for thread/message

**6. Worker:**
- Check Railway logs for worker running
- Verify Redis connection
- Queue test job from web app
- Verify worker processes job

### Step 2: Staging Testing

Repeat all production tests using staging URLs and credentials.

### Step 3: End-to-End Test

**Full Flow:**
1. Install Shopify app (production)
2. Create test order in Shopify
3. Send email to support email mentioning order number
4. Wait for webhook to process
5. Wait for worker to generate AI suggestion
6. Check inbox: `https://your-app.com/inbox`
7. Verify order matched correctly
8. Approve AI suggestion
9. Verify email sent via Mailgun
10. Check Mailgun logs for delivery

---

## 📊 Monitoring & Observability

### Step 1: Sentry Setup (Already Configured)

1. Verify Sentry DSN in environment variables
2. Test error tracking:
   - Trigger test error in production
   - Check Sentry dashboard
   - Verify error appears

3. Set up alerts:
   - **Settings** → **Alerts** → Create alert
   - Notify on errors, crashes, performance issues

### Step 2: Vercel Analytics

1. **Analytics** tab in Vercel dashboard
2. Monitor:
   - Page views
   - Response times
   - Error rates
   - Function invocations

### Step 3: Railway Monitoring

1. **Metrics** tab in Railway dashboard
2. Monitor:
   - CPU usage
   - Memory usage
   - Network traffic
   - Logs

### Step 4: Database Monitoring

1. Supabase dashboard → **Database** → **Usage**
2. Monitor:
   - Database size
   - Connection count
   - Query performance

### Step 5: Redis Monitoring

1. Upstash dashboard → **Monitoring**
2. Monitor:
   - Command count
   - Memory usage
   - Latency

### Step 6: Uptime Monitoring (Optional)

Set up external monitoring:
- **UptimeRobot** (free): Monitor `https://your-app.com`
- **Pingdom**: Monitor webhooks, API endpoints
- Alerts via email/Slack when down

---

## 🚀 Going Live Checklist

### Pre-Launch (1 Week Before)

- [ ] All environment variables set correctly
- [ ] Database migrations run in production
- [ ] Worker running and processing jobs
- [ ] Shopify app configured and tested
- [ ] Mailgun domain verified and tested
- [ ] Custom domain configured with SSL
- [ ] Sentry error tracking verified
- [ ] End-to-end test passed

### Launch Day

- [ ] Production web app deployed (`main` branch)
- [ ] Production worker running in Railway
- [ ] Database backups enabled (Supabase auto-backups)
- [ ] Monitoring alerts configured
- [ ] Team notified of launch
- [ ] Support channels ready (email, Slack, etc.)

### Post-Launch (First Week)

- [ ] Monitor error rates (Sentry)
- [ ] Monitor worker job success/failure rates
- [ ] Monitor database performance
- [ ] Monitor API usage (OpenAI, Mailgun)
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Document any issues

### First Month

- [ ] Review usage metrics
- [ ] Optimize database queries if needed
- [ ] Scale worker if needed
- [ ] Review costs (Vercel, Railway, Supabase, Upstash)
- [ ] Plan improvements based on feedback

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures in Vercel

**Problem:** Build fails with "Cannot find module"
**Solution:**
- Check `package.json` has all dependencies
- Verify `transpilePackages` in `next.config.mjs` includes `@ai-ecom/api` and `@ai-ecom/db`
- Check build logs in Vercel dashboard

#### 2. Database Connection Errors

**Problem:** "Can't reach database server"
**Solution:**
- Verify `DATABASE_URL` is correct
- Check if using connection pooler (port 6543)
- Verify Supabase project is active
- Check IP allowlist (if enabled)

#### 3. Worker Not Processing Jobs

**Problem:** Jobs queue but never process
**Solution:**
- Check Railway logs for errors
- Verify `REDIS_URL` is correct in Railway
- Verify worker connects to Redis (check logs)
- Test Redis connection: `redis-cli -u "[REDIS_URL]" ping`

#### 4. Shopify Webhooks Not Received

**Problem:** Webhooks registered but not received
**Solution:**
- Verify webhook URL is correct in Shopify dashboard
- Check `SHOPIFY_APP_URL` matches production URL
- Verify HMAC verification works (check logs)
- Test webhook manually using Shopify CLI or Postman

#### 5. Email Webhooks Not Working

**Problem:** Emails sent but not received in app
**Solution:**
- Verify Mailgun route is configured
- Check webhook URL in Mailgun route
- Verify `MAILGUN_SIGNING_KEY` matches
- Check Mailgun logs for webhook delivery
- Verify `x-email-webhook-secret` header matches

#### 6. Environment Variables Not Loading

**Problem:** App uses wrong environment variables
**Solution:**
- Verify variables set in correct environment (Production/Preview)
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables
- Check Vercel logs for variable values (be careful with secrets)

### Getting Help

1. **Vercel Support:** [vercel.com/support](https://vercel.com/support)
2. **Railway Support:** [railway.app/support](https://railway.app/support)
3. **Supabase Support:** [supabase.com/support](https://supabase.com/support)
4. **Upstash Support:** [upstash.com/support](https://upstash.com/support)

---

## 📝 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Documentation](https://docs.upstash.com/)
- [Shopify App Development](https://shopify.dev/docs/apps)
- [Mailgun Documentation](https://documentation.mailgun.com/)

---

## 🎉 Success Criteria

You're ready for production when:

✅ All services deployed and running  
✅ Database migrations complete  
✅ Worker processing jobs successfully  
✅ Shopify OAuth flow works end-to-end  
✅ Email webhooks receiving and processing  
✅ Monitoring configured and alerting  
✅ End-to-end test passes  
✅ SSL certificates valid  
✅ No critical errors in logs  

**Congratulations! Your app is ready for production! 🚀**

---

**Next Steps:**
1. Complete staging deployment and testing
2. Move to production when confident
3. Monitor closely for first week
4. Iterate based on user feedback

Good luck with your launch! 🎊

