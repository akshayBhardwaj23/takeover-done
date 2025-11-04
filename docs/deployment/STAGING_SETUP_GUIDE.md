# Staging Environment Setup Guide (Vercel Free + Railway)

**Goal:** Set up a complete staging environment for testing before production  
**Timeline:** 2-3 hours  
**Cost:** ~$5-10/month (Railway worker only, Vercel is free for staging)

---

## 🎯 Overview

**What we're setting up:**

- ✅ Staging web app on Vercel (FREE - preview deployment)
- ✅ Staging worker on Railway (~$5/month)
- ✅ Staging database on Supabase (free tier available)
- ✅ Redis on Upstash (free tier available)
- ✅ Staging Shopify test app
- ✅ Staging Mailgun configuration

## 🌳 Branch Strategy (IMPORTANT!)

**Recommended: Two Branches**

- ✅ **`main` branch** → Production (live for users)
  - Auto-deploys to production URL
  - Uses Production environment variables
- ✅ **`staging` branch** → Staging (for testing)
  - Auto-deploys to preview URL
  - Uses Preview environment variables

**How it works:**

1. Vercel connects to your repo and uses `main` as Production Branch
2. You create a `staging` branch
3. When you push to `main` → Production deployment
4. When you push to `staging` → Preview deployment (staging)
5. Environment variables are set separately for Production vs Preview

**Why this is better:**

- ✅ Same codebase, different environments
- ✅ Test changes in staging before merging to `main`
- ✅ Production stays stable while you test
- ✅ Automatic deployments for both

**Alternative (Not Recommended):** Using `main` for both staging and production would require:

- Two separate Vercel projects (complex)
- Manual switching between environments (error-prone)
- No easy way to test before production

---

## 📋 Pre-Flight Checklist

Before starting, make sure you have:

- [ ] GitHub repository with code pushed
- [ ] A `staging` branch created (or we'll create it)
- [ ] All required accounts ready:
  - [ ] Vercel account (free tier works!)
  - [ ] Railway account
  - [ ] Supabase account
  - [ ] Upstash account
  - [ ] Shopify Partners account
  - [ ] Mailgun account
- [ ] Password manager ready to store credentials

---

## Step 1: Create Staging Branch

**Why separate branches?**

- `main` branch → Production deployments (live for users)
- `staging` branch → Preview deployments (for testing)
- Vercel automatically handles this with branch-based deployments

**Create staging branch:**

```bash
# In your project root
git checkout -b staging
git push origin staging
```

**Verify:**

- Check GitHub - you should see a `staging` branch
- This branch will auto-deploy on Vercel as a Preview deployment

---

zyypstagingdb

## Step 2: Set Up Staging Database (Supabase)

### 2.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **New Project**
3. Fill in:
   - **Name:** `ai-ecom-staging`
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to you
   - Click **Create new project**
   - Wait 2-3 minutes for setup

### 2.2 Get Connection String

1. Once project is ready, go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual password
6. For Vercel serverless, use the **Connection Pooler** instead:
   - Select **Connection pooling** tab
   - Choose **Session mode**
   - Copy the connection string (port 6543):
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
   - Or use URI format:
     ```
     postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
     ```

**Save this connection string!** You'll need it as `DATABASE_URL` for staging.

### 2.3 Run Migrations

**⚠️ Run these commands in your Terminal/Command Line on your local development machine** (not in the guide file!)

**Step-by-step:**

1. **Open Terminal** on your Mac (or Command Prompt/PowerShell on Windows)

2. **Copy your staging database connection string** from Step 2.2 (the one that looks like `postgresql://postgres:...`)

3. **Temporarily update your `.env` file** (Prisma reads from this file):

   ⚠️ **Important:** Your `.env` file likely has your **local development** database URL. You need to temporarily change it to staging, run migrations, then change it back.

   **Option A: Edit the file directly** (Recommended)
   - Open `packages/db/.env` in your editor
   - **Save your current local DATABASE_URL** (copy it somewhere safe - you'll need it for local dev!)
   - Replace the `DATABASE_URL` line with your staging connection string:
     ```
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"
     ```
   - ⚠️ **Use port 5432 (direct connection) for migrations**, NOT 6543 (pooler)
   - Port 6543 (pooler) is for Vercel app connections, but migrations work better with port 5432
   - Replace `[PROJECT-REF]`, `[YOUR-PASSWORD]`, and `[REGION]` with your actual Supabase staging values
   - **After migrations complete, change it back to your local development URL**

   **Option B: Use terminal** (replace with your actual connection string):

   ```bash
   cd packages/db
   echo 'DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"' > .env
   ```

   ⚠️ **Important:**
   - **For migrations**: Use port **5432** (direct connection) - migrations work better with direct connections
   - **For Vercel**: You'll use port **6543** (pooler) in environment variables - better for serverless
   - If you see "Tenant or user not found" error, check:
     - ✅ Is your password correct? (no extra spaces or quotes)
     - ✅ Is your project reference correct?
     - ✅ Is your region correct in the connection string?

4. **Navigate to your project folder:**

   ```bash
   cd /Users/akshaybhardwaj/Desktop/Projects/ai-ecom-tool
   ```

   (Replace with your actual project path if different)

5. **Run migrations:**

   ```bash
   pnpm db:migrate
   ```

6. **Verify (optional):**
   ```bash
   cd packages/db
   pnpm prisma studio
   ```
   This opens Prisma Studio in your browser to view your staging database tables.

**Important distinction:**

- **For local migrations** (`pnpm db:migrate`): Use port **5432** (direct connection) - Prisma migrations work better with direct connections
- **For Vercel app connections**: Use port **6543** (pooler) with `?pgbouncer=true&connection_limit=1` - better for serverless environments

**Troubleshooting "Tenant or user not found" error:**

- ✅ For migrations: Use port **5432** (direct connection), NOT 6543 - Prisma migrations need direct database access
- ✅ Verify your password and project reference are correct in the `.env` file
- ✅ Check that your `.env` file in `packages/db/` has the correct staging URL (not an old/production URL)
- ✅ Make sure the connection string format is correct (no extra spaces, quotes are properly escaped)

**Note:** After migrations, you'll set `DATABASE_URL` in Vercel's environment variables (covered in Step 4). The `.env` file will be used for local development and migrations.

**Expected output:** Migrations should run successfully and create all tables.

---

## Step 3: Set Up Staging Redis (Upstash)

### 3.1 Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Click **Create Database**
3. Configure:
   - **Name:** `ai-ecom-redis-staging` (or `ai-ecom-redis` if sharing with production)
   - **Type:** Regional (choose closest region)
   - **Region:** Select closest to you
   - Click **Create**

### 3.2 Get Connection Details

1. Once created, you'll see three important values:

   **REST URL:**

   ```
   https://[endpoint].upstash.io
   ```

   **REST Token:**

   ```
   AXxxxxxxxxxxxxx
   ```

   **Redis URL (TCP):**

   ```
   rediss://default:[token]@[endpoint].upstash.io:6379
   ```

2. **Save all three values!** You'll need them.

### 3.3 Verify Connection (Optional)

```bash
# Test Redis connection
redis-cli -u "rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379" ping
# Should return: PONG
```

If you don't have `redis-cli` installed, that's okay - we'll verify later through the app.

---

## Step 4: Deploy Staging Web App (Vercel)

### 4.1 Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your GitHub repository
4. Authorize Vercel to access your GitHub if needed

### 4.2 Configure Project Settings

1. **Project Name:** `ai-ecom-staging` (or any name you prefer)
2. **Framework Preset:** Next.js (auto-detected)
3. **Root Directory:** Click "Edit" and set to `apps/web`
4. **Build Command:**

   ```
   cd ../.. && pnpm install && pnpm --filter @ai-ecom/db run prisma:generate && pnpm build --filter @ai-ecom/web
   ```

   **⚠️ Important:** This explicitly generates Prisma Client with the correct binary targets before building the web app. The `postinstall` script also runs automatically, but this ensures it happens in the correct order.

5. **Output Directory:** `.next` (auto-detected, but verify)
6. **Install Command:**
   ```
   cd ../.. && pnpm install
   ```

### 4.3 Configure Environment Variables

**Before deploying, add environment variables:**

1. Click **Environment Variables** in the configuration screen
2. Add each variable below (we'll get some values in later steps):

```bash
# Environment
NODE_ENV=production
ENVIRONMENT=staging
NEXTAUTH_URL=https://staging-[your-project].vercel.app

# Database (from Step 2)
# ⚠️ CRITICAL: Must use connection pooler (port 6543) with pgbouncer=true for Vercel serverless
# Without connection pooling, Vercel's serverless functions will exhaust database connections
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Redis (from Step 3)
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# Auth (generate secrets)
NEXTAUTH_SECRET=[GENERATE: openssl rand -base64 32]
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]

# OpenAI
OPENAI_API_KEY=sk-proj-[YOUR_KEY]

# Shopify (we'll set this up in Step 6 - use placeholder for now)
SHOPIFY_API_KEY=[PLACEHOLDER]
SHOPIFY_API_SECRET=[PLACEHOLDER]
SHOPIFY_APP_URL=https://staging-[your-project].vercel.app
SHOPIFY_SCOPES=read_orders,write_orders,read_products
SHOPIFY_WEBHOOK_SECRET=[GENERATE: openssl rand -hex 32]

# Mailgun (Free tier works for staging! See notes below)
# Option 1: Use Mailgun Sandbox Domain (Free - Recommended for Staging)
# Get your sandbox domain from Mailgun Dashboard → Sending → Domains
# Format: sandbox123456.mailgun.org
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=sandbox123456.mailgun.org
MAILGUN_FROM_EMAIL=support@sandbox123456.mailgun.org
MAILGUN_SIGNING_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option 2: Use Custom Domain (Free tier with domain verification)
# If you have a custom domain, you can verify it on Mailgun free tier
# MAILGUN_DOMAIN=mg.yourdomain.com
# MAILGUN_FROM_EMAIL=support@yourdomain.com

# Encryption (REQUIRED - for encrypting sensitive data like access tokens)
ENCRYPTION_KEY=[GENERATE: openssl rand -hex 32]
# This must be a 64-character hex string (32 bytes)

# Inbound Email Domain (for displaying custom email addresses in UI)
NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN=[YOUR_MAILGUN_DOMAIN]
# Example: mg.zyyp.ai or yourdomain.com

# Razorpay (for payment processing - required if using payment features)
RAZORPAY_KEY_ID=[YOUR_RAZORPAY_KEY_ID]
RAZORPAY_KEY_SECRET=[YOUR_RAZORPAY_KEY_SECRET]
RAZORPAY_WEBHOOK_SECRET=[GENERATE: openssl rand -hex 32]
# Optional - plan IDs (defaults are used if not set):
# RAZORPAY_PLAN_STARTER_INR=plan_starter_inr
# RAZORPAY_PLAN_STARTER_USD=plan_starter_usd
# RAZORPAY_PLAN_GROWTH_INR=plan_growth_inr
# RAZORPAY_PLAN_GROWTH_USD=plan_growth_usd
# RAZORPAY_PLAN_PRO_INR=plan_pro_inr
# RAZORPAY_PLAN_PRO_USD=plan_pro_usd

# Feature Flags
PROTECTED_WEBHOOKS=true
MOCK_WEBHOOKS=false

# Sentry (optional for staging)
NEXT_PUBLIC_SENTRY_DSN=https://[PROJECT_ID]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

**Important:**

- Set environment to **Preview** (not Production!)
- **REQUIRED**: `ENCRYPTION_KEY` is critical - without it, access tokens won't be encrypted
- **REQUIRED if using payments**: Razorpay variables are needed for subscription/payment features
- **REQUIRED for email UI**: `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN` is needed to display email addresses in the integrations page
- You can update Shopify and Mailgun values later

**How to generate ENCRYPTION_KEY:**

```bash
openssl rand -hex 32
```

This generates a 64-character hex string. **Save this securely** - you'll need the same key for production!

### 4.4 Configure Branch Settings (IMPORTANT!)

**How Vercel handles branches:**

1. Go to **Settings** → **Git** in your Vercel project
2. **Production Branch:** Set to `main`
   - ✅ Deployments from `main` = Production (live, uses Production env vars)
   - ✅ Deployments from `staging` = Preview (testing, uses Preview env vars)
   - ✅ Deployments from other branches = Preview (also uses Preview env vars)

3. **Preview Branches:** Enable automatic deployments
   - This means any push to `staging` will auto-deploy as Preview
   - Your `main` branch stays as Production

**Key Point:** You configure environment variables separately for:

- **Production** environment (for `main` branch)
- **Preview** environment (for `staging` and other branches)

When you add env vars in Vercel, select the environment:

- Use **Preview** environment for staging env vars
- Use **Production** environment for production env vars

### 4.5 Deploy

1. Click **Deploy**
2. Vercel will:
   - Install dependencies
   - Build the project
   - Deploy to a preview URL
3. Wait for deployment to complete (2-5 minutes)
4. Once done, note your staging URL: `https://staging-[your-project].vercel.app`

**Update `NEXTAUTH_URL` and `SHOPIFY_APP_URL` with the actual URL after deployment!**

### 4.6 Update Environment Variables

After deployment, you'll have your staging URL. Update these variables:

1. Go to **Settings** → **Environment Variables**
2. Update:
   - `NEXTAUTH_URL` → Your actual staging URL
   - `SHOPIFY_APP_URL` → Your actual staging URL
3. Redeploy (or it will auto-redeploy)

---

## Step 5: Deploy Staging Worker (Railway)

### 5.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub
5. Select your repository

### 5.2 Create Worker Service

1. In your Railway project, click **+ New**
2. Select **GitHub Repo** (your repo should already be connected)
3. **Configure Service:**
   - **Source:** Your GitHub repo
   - **Branch:** `staging`
   - **Root Directory:** `.` (root of the monorepo, NOT `apps/worker`)

### 5.3 Configure Build Settings

1. Click on the service you just created
2. Go to **Settings** tab
3. Configure:

   **Build Command:**

   ```
   pnpm install && pnpm build --filter @ai-ecom/worker
   ```

   **⚠️ Important:** Root Directory must be `.` (repo root), not `apps/worker`. This allows:
   - pnpm to see the entire monorepo workspace
   - `pnpm install` to link workspace packages (like `@ai-ecom/db`) into `node_modules`
   - Turbo to build dependencies (`@ai-ecom/db`) before the worker
   - Node.js to resolve `@ai-ecom/db` at runtime via the workspace symlink

   **Start Command:**

   ```
   node apps/worker/dist/apps/worker/src/index.js
   ```

   **⚠️ Note:** TypeScript outputs to `apps/worker/dist/apps/worker/src/index.js` when building from the repo root. The start command must match this path.

### 5.4 Add Environment Variables

Go to **Variables** tab and add:

```bash
# Environment
NODE_ENV=production
ENVIRONMENT=staging

# Database (same as Vercel staging)
# ⚠️ CRITICAL: Must use connection pooler (port 6543) with pgbouncer=true
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Redis (same as Vercel staging)
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# OpenAI
OPENAI_API_KEY=sk-proj-[YOUR_KEY]

# Feature Flags
PROTECTED_WEBHOOKS=true
```

### 5.5 Deploy Worker

1. Railway will automatically detect changes and deploy
2. Go to **Deployments** tab to see build progress
3. Once deployed, check **Logs** tab
4. **Verify logs show:**
   ```
   Worker started successfully
   Connected to Redis
   ```

If you see errors, check:

- Environment variables are correct
- Redis URL is valid
- Database URL is valid

---

## Step 6: Set Up Staging Shopify App

### 6.1 Create Test App in Shopify Partners

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Click **Apps** → **Create app**
3. Choose **Custom app** (for testing)
4. **App name:** `AI E-Commerce Tool (Staging)`
5. **App URL:** `https://staging-[your-project].vercel.app`
6. **Allowed redirection URL(s):**
   ```
   https://staging-[your-project].vercel.app/api/shopify/callback
   ```

### 6.2 Configure API Credentials

1. Go to **API credentials** tab
2. Note your:
   - **Client ID** → This is your `SHOPIFY_API_KEY`
   - **Client secret** → This is your `SHOPIFY_API_SECRET`
3. **Generate webhook secret:**
   ```bash
   openssl rand -hex 32
   ```
   Save this as `SHOPIFY_WEBHOOK_SECRET`

### 6.3 Configure Scopes

1. Go to **Configuration** tab
2. Under **API scopes**, select:
   - `read_orders`
   - `write_orders`
   - `read_products`
   - (Add more if needed)

### 6.4 Update Vercel Environment Variables

1. Go back to Vercel → Your project → **Settings** → **Environment Variables**
2. Update:
   - `SHOPIFY_API_KEY` → Client ID from Shopify
   - `SHOPIFY_API_SECRET` → Client secret from Shopify
   - `SHOPIFY_WEBHOOK_SECRET` → Generated secret
   - `SHOPIFY_APP_URL` → Should already be set
3. Redeploy (or wait for auto-redeploy)

### 6.5 Test Shopify Installation

1. Go to your staging URL: `https://staging-[your-project].vercel.app`
2. Navigate to `/integrations`
3. Click "Connect Shopify"
4. Enter a test shop domain: `your-test-shop.myshopify.com`
5. Complete OAuth flow
6. **Verify:**
   - Redirects back to `/integrations?connected=1`
   - Check database - should see connection record
   - Webhooks should auto-register

---

## Step 7: Set Up Staging Mailgun (Optional for Now)

You can skip this initially and set it up later. Here's the quick setup:

### 7.1 Add Domain to Mailgun

1. Go to [Mailgun Dashboard](https://app.mailgun.com/)
2. **Sending** → **Domains** → **Add New Domain**
3. Add your domain or subdomain: `staging.your-domain.com`
4. Follow DNS setup instructions (add DNS records)
5. Wait for verification (24-48 hours)

### 7.2 Get API Keys

1. **Settings** → **API Keys**
   - Copy **Private API key** → `MAILGUN_API_KEY`
2. **Settings** → **API Security**
   - Copy **HTTP webhook signing key** → `MAILGUN_SIGNING_KEY`

### 7.3 Mailgun Free Tier for Staging ⭐

**Yes, you can use Mailgun's free tier for staging!** Here's what you need to know:

#### Free Tier Limitations:
- ✅ **5,000 emails/month** (perfect for staging/testing)
- ✅ **Sandbox domain** (`sandbox123456.mailgun.org`) - emails only deliver to **authorized recipients**
- ✅ **Custom domain** - can verify your own domain (still free tier)
- ⚠️ **Sandbox limitation**: Emails only sent to addresses you authorize in Mailgun dashboard

#### Option 1: Use Sandbox Domain (Easiest for Staging)

1. **Get your sandbox domain:**
   - Go to Mailgun Dashboard → **Sending** → **Domains**
   - You'll see: `sandbox123456.mailgun.org` (numbers vary)
   - Copy this domain

2. **Authorize test recipients:**
   - Go to **Sending** → **Authorized Recipients**
   - Add email addresses you want to receive emails (e.g., your personal email)
   - These are the **only** addresses that will receive emails from sandbox domain

3. **Set in Vercel:**
   ```bash
   MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   MAILGUN_DOMAIN=sandbox123456.mailgun.org
   MAILGUN_FROM_EMAIL=support@sandbox123456.mailgun.org
   MAILGUN_SIGNING_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN=sandbox123456.mailgun.org
   ```

**Important:** With sandbox domain, emails will only be delivered to addresses you've authorized in Mailgun. This is perfect for staging where you only need to test with a few email addresses.

#### Option 2: Use Custom Domain (More Flexible)

1. **Verify your domain in Mailgun:**
   - Add your domain (e.g., `mg.yourdomain.com`)
   - Follow DNS verification steps
   - Once verified, you can send to any email address

2. **Set in Vercel:**
   ```bash
   MAILGUN_DOMAIN=mg.yourdomain.com
   MAILGUN_FROM_EMAIL=support@yourdomain.com
   NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN=mg.yourdomain.com
   ```

### 7.4 Configure Email Route (Optional - for Inbound Emails)

If you want to receive emails (webhooks), set up a route:

1. **Receiving** → **Routes** → **Create Route**
2. **Route expression:** `match_recipient("in+*@your-domain.com")` (or pattern matching your alias format)
3. **Action:** Forward to webhook
4. **Webhook URL:** `https://staging-[your-project].vercel.app/api/webhooks/email/custom`
5. **Secret:** Generate and save (add to Vercel as `MAILGUN_SIGNING_KEY`)

**Note:** This is optional - you can skip it if you only need to **send** emails (not receive).

### 7.5 Summary

**For staging, Mailgun free tier is perfect:**
- ✅ 5,000 emails/month is plenty for testing
- ✅ Sandbox domain works great if you only need to test with a few email addresses
- ✅ Custom domain works if you want to send to any email address
- ✅ No cost for staging/testing

**When to upgrade to paid:**
- Production needs > 5,000 emails/month
- Need to send to unverified recipients without custom domain
- Need dedicated IP or higher deliverability

---

## Step 8: Test Staging Environment

### 8.1 Basic Health Checks

**Web App:**

- [ ] Visit staging URL: `https://staging-[your-project].vercel.app`
- [ ] Page loads without errors
- [ ] Check browser console for errors

**Worker:**

- [ ] Check Railway logs - should show "Worker started"
- [ ] Check Railway logs - should show "Connected to Redis"

**Database:**

- [ ] Verify Prisma Studio can connect
- [ ] Or query database directly in Supabase dashboard

**Redis:**

- [ ] Check Upstash dashboard - should show connection activity

### 8.2 Test Shopify Integration

1. Go to staging URL → `/integrations`
2. Connect a test Shopify store
3. Verify:
   - [ ] OAuth flow completes
   - [ ] Connection saved in database
   - [ ] Webhooks registered (check Shopify dashboard or app logs)

### 8.3 Test Email Flow (If Mailgun Set Up)

1. Send test email to your staging email address
2. Verify:
   - [ ] Email received via Mailgun webhook
   - [ ] Thread created in database
   - [ ] Worker processes email and generates AI suggestion

### 8.4 Test Worker Job Processing

1. From web app, trigger a job (e.g., approve an AI suggestion)
2. Check Railway logs
3. Verify:
   - [ ] Job queued in Redis
   - [ ] Worker picks up job
   - [ ] Job completes successfully

---

## Step 9: Verify Everything Works

### Complete End-to-End Test

**Full Flow Test:**

1. ✅ Install Shopify app in staging
2. ✅ Create test order in Shopify
3. ✅ Verify webhook received (check Vercel logs)
4. ✅ Verify order appears in database
5. ✅ Send email mentioning order number
6. ✅ Verify email webhook received
7. ✅ Verify worker processes email
8. ✅ Check inbox for AI suggestion
9. ✅ Approve and send email
10. ✅ Verify email sent via Mailgun

### Monitoring Setup

**Vercel:**

- Check **Analytics** tab for errors
- Monitor function invocations

**Railway:**

- Check **Metrics** for CPU/memory
- Monitor **Logs** for errors

**Supabase:**

- Check **Database** → **Usage** for connections
- Monitor query performance

**Upstash:**

- Check **Monitoring** for command count
- Verify within free tier limits

---

## 🎉 Staging Environment Complete!

**You now have:**

- ✅ Staging web app on Vercel (FREE)
- ✅ Staging worker on Railway (~$5/month)
- ✅ Staging database on Supabase (FREE tier)
- ✅ Redis on Upstash (FREE tier)
- ✅ Shopify test app configured
- ✅ (Optional) Mailgun configured

**Next Steps:**

1. Continue testing in staging
2. When ready, follow production deployment guide
3. Use staging to test all features before production

---

## 🔧 Troubleshooting Staging

### Issue: Vercel Build Fails

**Check:**

- Root directory is `apps/web`
- Build command is correct
- All dependencies in `package.json`

**Fix:**

- Check build logs in Vercel dashboard
- Verify `transpilePackages` in `next.config.mjs`

### Issue: Worker Not Starting

**Check:**

- Railway logs for errors
- Environment variables are set
- Redis URL is correct

**Fix:**

- Verify `REDIS_URL` format: `rediss://default:...`
- Check Railway service settings
- Verify build completed successfully

### Issue: Database Connection Fails

**Check:**

- Connection string format
- Using pooler URL (port 6543) for Vercel
- Password is correct

**Fix:**

- Use connection pooler URL for Vercel
- Verify in Supabase dashboard that project is active
- Check IP allowlist (should allow all for pooler)

### Issue: Shopify OAuth Fails

**Check:**

- `SHOPIFY_APP_URL` matches actual Vercel URL
- Callback URL matches in Shopify dashboard
- API credentials are correct

**Fix:**

- Update `SHOPIFY_APP_URL` in Vercel with actual URL
- Verify redirect URL in Shopify matches exactly

---

## 📞 Need Help?

- Check [Complete Deployment Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Railway Support: [railway.app/support](https://railway.app/support)

**You're all set with staging! 🚀**
