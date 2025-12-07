# Quick Start: Testing Performance on Staging/Production

## Fastest Way to Test (5 minutes)

### Step 1: Get Your Database URL and User ID

**For Staging:**
```bash
# From Vercel Dashboard → Your Project → Settings → Environment Variables
# Copy DATABASE_URL for Preview/Staging environment

# Or get from your database provider (Supabase, Railway, etc.)
```

**For Production:**
```bash
# ⚠️ Be careful! Use read-only credentials if possible
# From Vercel Dashboard → Production environment variables
```

**Get a User ID:**
```bash
# Option 1: From your app
# Log in to staging/prod and check browser console:
# Look for user ID in localStorage or session

# Option 2: From database
psql $DATABASE_URL
SELECT id, email FROM "User" LIMIT 5;
\q
```

### Step 2: Run the Test

```bash
# Staging
TEST_USER_ID="your-user-id" \
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
pnpm test:inbox-performance

# Production (be careful!)
TEST_USER_ID="your-user-id" \
DATABASE_URL="postgresql://user:pass@prod-host:5432/db?sslmode=require" \
pnpm test:inbox-performance
```

### Step 3: Check Results

Look for:
- ✅ `inboxBootstrap`: Should be **< 2000ms** (was ~21s)
- ✅ `unassignedInbound`: Should be **< 1000ms** (was ~4s)

## Browser Testing (Even Faster - 2 minutes)

### Step 1: Deploy & Migrate

```bash
# Deploy code
git push origin staging

# Run migration (wait for deployment first)
DATABASE_URL="your-staging-db-url" pnpm db:migrate
```

### Step 2: Test in Browser

1. Open: `https://staging.zyyp.ai/inbox` (or your staging URL)
2. Open DevTools (F12)
3. Go to **Network** tab
4. Refresh page (F5)
5. Look for `inboxBootstrap` and `unassignedInbound` requests
6. Check **Time** column - should be < 2s and < 1s respectively

## Troubleshooting

**Test script fails?**
- Check `DATABASE_URL` format (must include `?sslmode=require` for remote DBs)
- Verify `TEST_USER_ID` exists in database
- Ensure you have network access to database

**Still slow?**
- Run migration: `pnpm db:migrate` (creates indexes)
- Check indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename = 'Message';`
- Check data volume (too many messages might need pagination)

## Full Guide

See [PERFORMANCE_TESTING_GUIDE.md](./PERFORMANCE_TESTING_GUIDE.md) for detailed instructions.

