# Inbox API Performance Testing Guide

This guide explains how to test the performance optimizations on staging and production environments.

## Prerequisites

1. Access to the database connection string (staging or production)
2. A valid user ID from the environment you want to test
3. Node.js and pnpm installed locally

## Option 1: Local Performance Testing Script

### Step 1: Set Up Environment Variables

Create a `.env` file in the project root or set environment variables:

```bash
# For Staging
export DATABASE_URL="postgresql://user:password@staging-db-host:5432/dbname?sslmode=require"
export TEST_USER_ID="your-staging-user-id"

# For Production (be careful!)
export DATABASE_URL="postgresql://user:password@prod-db-host:5432/dbname?sslmode=require"
export TEST_USER_ID="your-prod-user-id"
```

**⚠️ IMPORTANT**: When testing production:
- Use read-only database credentials if available
- Be cautious not to modify production data
- Test during low-traffic periods
- Consider creating a dedicated test user

### Step 2: Get a User ID

You can get a user ID from the database:

```bash
# Connect to your database
psql $DATABASE_URL

# Find a user ID
SELECT id, email FROM "User" LIMIT 5;
```

Or from your application:
- Log in to staging/production
- Check browser DevTools → Application → Local Storage
- Look for session data or user ID

### Step 3: Run the Performance Test

```bash
# Install dependencies if needed
pnpm install

# Run the performance test
TEST_USER_ID="your-user-id" DATABASE_URL="your-database-url" pnpm test:inbox-performance
```

Or set the env vars and run:

```bash
export TEST_USER_ID="your-user-id"
export DATABASE_URL="your-database-url"
pnpm test:inbox-performance
```

### Step 4: Interpret Results

The script will output:
- Individual query timings (connections, orders, messages)
- Pending count calculation time
- Total endpoint execution time
- Slow queries (>100ms)
- Data volumes (orders count, messages count)

**Expected Improvements:**
- `inboxBootstrap`: Should be < 2 seconds (was ~21s)
- `unassignedInbound`: Should be < 1 second (was ~4s)
- Pending count calculation: Should be < 500ms (was likely the bottleneck)

## Option 2: Browser-Based Testing (Chrome DevTools)

### Step 1: Deploy Changes to Staging/Production

```bash
# Push your changes
git add .
git commit -m "feat: optimize inbox API performance"
git push origin staging  # or main for production
```

### Step 2: Wait for Deployment

- Vercel will automatically deploy
- Check deployment status in Vercel dashboard
- Wait for deployment to complete

### Step 3: Run Database Migration

**⚠️ CRITICAL**: Run the migration before testing to ensure indexes are created:

```bash
# For staging
DATABASE_URL="your-staging-db-url" pnpm db:migrate

# For production (be extra careful!)
DATABASE_URL="your-prod-db-url" pnpm db:migrate
```

**Alternative: Use Prisma Studio to run migration:**
```bash
DATABASE_URL="your-db-url" cd packages/db && pnpm prisma studio
# Navigate to the database and verify indexes exist
```

### Step 4: Test in Browser

1. **Open the inbox page**:
   - Staging: `https://staging.zyyp.ai/inbox`
   - Production: `https://www.zyyp.ai/inbox`

2. **Open Chrome DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to the **Network** tab
   - Filter by `Fetch/XHR`

3. **Clear network log** and **refresh the page**:
   - Click the 🚫 icon to clear
   - Press `F5` or `Cmd+R` to refresh

4. **Observe API calls**:
   - Look for `inboxBootstrap` request
   - Look for `unassignedInbound` request
   - Check the **Time** column for each request

5. **Compare before/after**:
   - Take screenshots of the Network tab
   - Note the request durations
   - Check if requests are running in parallel (should start at similar times)

### Step 5: Check Console Logs

1. Go to **Console** tab in DevTools
2. Look for slow query warnings:
   - `[inboxBootstrap] Slow query detected: Xms`
   - `[unassignedInbound] Slow query detected: Xms`

These will only appear if queries are still slow (which shouldn't happen after optimization).

## Option 3: Production Monitoring (After Deployment)

### Monitor Slow Query Logs

Check your deployment logs (Vercel, Railway, etc.) for:
- Slow query warnings from the console.warn statements
- Error messages from the fallback logic

### Check Database Indexes

Verify indexes were created successfully:

```sql
-- Connect to your database
psql $DATABASE_URL

-- Check Message table indexes
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'Message' 
    AND indexname LIKE '%threadId%' OR indexname LIKE '%orderId%'
ORDER BY indexname;

-- Should see:
-- Message_threadId_createdAt_idx
-- Message_orderId_createdAt_direction_idx
```

### Monitor API Response Times

If you have monitoring tools (Sentry, DataDog, etc.):
- Check average response times for `inboxBootstrap`
- Check average response times for `unassignedInbound`
- Compare before/after metrics

## Option 4: Automated Load Testing (Advanced)

### Using k6 or Artillery

Create a simple load test script:

```javascript
// test-inbox-api.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 5, // 5 virtual users
  duration: '30s',
};

export default function () {
  const baseUrl = 'https://staging.zyyp.ai';
  
  // Test inboxBootstrap
  const bootstrapRes = http.post(
    `${baseUrl}/api/trpc/inboxBootstrap`,
    JSON.stringify({ json: { ordersTake: 25 } }),
    {
      headers: { 'Content-Type': 'application/json' },
      // Add authentication headers if needed
    }
  );
  
  check(bootstrapRes, {
    'inboxBootstrap status is 200': (r) => r.status === 200,
    'inboxBootstrap response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}
```

Run with:
```bash
k6 run test-inbox-api.js
```

## Troubleshooting

### Migration Fails

If the migration fails:
1. Check database connection
2. Verify you have permissions to create indexes
3. Check if indexes already exist:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'Message';
   ```

### Still Slow After Optimization

If queries are still slow:
1. **Check if indexes are being used**:
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM "Message" 
   WHERE "orderId" IN (...)
   ORDER BY "createdAt" DESC;
   ```
   Look for `Index Scan` in the output

2. **Check data volumes**:
   - How many orders does the user have?
   - How many messages per order?
   - If very high (>1000 messages per order), consider pagination

3. **Check for N+1 queries**:
   - Enable Prisma query logging
   - Look for repeated queries

### Performance Test Script Fails

If the test script fails:
1. Check `DATABASE_URL` is correct
2. Verify `TEST_USER_ID` exists in database
3. Check database connection (firewall, SSL, etc.)
4. Ensure Prisma client is generated: `pnpm db:generate`

## Success Criteria

After optimization, you should see:

✅ **inboxBootstrap**: < 2 seconds (previously ~21s)  
✅ **unassignedInbound**: < 1 second (previously ~4s)  
✅ **Pending count calculation**: < 500ms (previously the bottleneck)  
✅ **Total page load**: < 3 seconds (previously ~25s)  
✅ **Parallel execution**: Both queries start at similar times  
✅ **No slow query warnings** in console logs  
✅ **Indexes created** successfully in database

## Next Steps

1. **Monitor for 24-48 hours** to ensure stability
2. **Check error rates** - ensure no regressions
3. **Gather user feedback** - check if users notice improvements
4. **Document any issues** for follow-up optimization

## Rollback Plan

If issues occur:

1. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   git push origin staging
   ```

2. **Indexes can stay** - they won't hurt performance even if not used
3. **Monitor logs** for any errors

