# Inngest Testing Guide

**Complete guide for testing Inngest functionality in your AI E-Commerce Tool**

---

## 🎯 Quick Test Checklist

- [ ] Inngest functions are synced
- [ ] `INNGEST_EVENT_KEY` is set in environment variables
- [ ] `/api/inngest` endpoint is accessible
- [ ] Test event triggers successfully
- [ ] Function executes and completes
- [ ] AI suggestions are generated correctly

---

## Step 1: Verify Inngest Setup

### 1.1 Check Environment Variable

**Vercel (Staging/Production):**

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Verify `INNGEST_EVENT_KEY` is set
3. Value should start with `signkey-`

**Local:**

```bash
# Check if env var is set
echo $INNGEST_EVENT_KEY

# Should output: signkey-prod-xxxxxxxxxxxxx
```

### 1.2 Verify Inngest App is Synced

1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Navigate to **Apps** (left sidebar)
3. Check if your app is listed and shows **"Synced"** status
4. If not synced:
   - Click **"Create App"** or **"Sync"**
   - Enter your Vercel URL: `https://www.zyyp.ai/api/inngest`
   - Click **"Sync"**

### 1.3 Check Functions are Registered

1. In Inngest Dashboard → **Functions** (left sidebar)
2. You should see: **`process-inbound-email`** function
3. Status should be **"Active"**
4. If missing, the app needs to be synced (see Step 1.2)

### 1.4 Verify API Endpoint is Accessible

**Test the endpoint:**

```bash
# Test locally (if running dev server)
curl http://localhost:3000/api/inngest

# Test staging/production
curl https://www.zyyp.ai/api/inngest
```

**Expected response:**

- Should return `200 OK` (or a valid response)
- No errors in the response

---

## Step 2: Test Inngest Function (Local Development)

### 2.1 Start Local Development Server

```bash
# From project root
cd apps/web
pnpm dev
```

### 2.2 Create a Test Script

Create `apps/web/test-inngest.ts`:

```typescript
import { inngest } from './inngest/client';

async function testInngest() {
  console.log('Testing Inngest event trigger...');

  try {
    // Send a test event
    const result = await inngest.send({
      name: 'email/inbound.process',
      data: {
        messageId: 'test-message-id-123', // Replace with actual message ID from your DB
      },
    });

    console.log('✅ Event sent successfully:', result);
  } catch (error) {
    console.error('❌ Error sending event:', error);
  }
}

testInngest();
```

### 2.3 Run Test Script

```bash
# From apps/web directory
npx tsx test-inngest.ts
```

### 2.4 Check Inngest Dashboard

1. Go to **Inngest Dashboard** → **Runs**
2. You should see a new run with event `email/inbound.process`
3. Click on the run to see execution details
4. Check for errors or success status

---

## Step 3: Test via Email Webhook (Real Flow)

### 3.1 Send Test Email

1. Send an email to your Mailgun alias (e.g., `in+shop-slug-xxxx@mail.zyyp.ai`)
2. Mailgun will forward it to your webhook: `/api/webhooks/email/custom`

### 3.2 Check Vercel Logs

1. Go to **Vercel Dashboard** → Your Project → **Logs**
2. Filter for recent logs
3. Look for: `[Email Webhook] Triggered Inngest event for message...`
4. Should see: `Triggered Inngest event for message [message-id]`

### 3.3 Check Inngest Dashboard

1. Go to **Inngest Dashboard** → **Runs**
2. You should see a new run:
   - **Event:** `email/inbound.process`
   - **Status:** Success (green) or Failed (red)
   - **Started:** Recent timestamp

3. Click on the run to see:
   - Execution steps
   - Logs
   - Any errors

### 3.4 Verify Results

1. **Check Database:**

   ```bash
   # Using Prisma Studio
   cd packages/db
   pnpm prisma studio
   ```

   - Navigate to `AISuggestion` table
   - Should see a new record with the `messageId`
   - `reply` field should contain AI-generated response

2. **Check Web Dashboard:**
   - Go to your app → Messages/Threads
   - Should see the email thread
   - Should see AI suggestion generated

---

## Step 4: Test via Inngest Dashboard (Manual Trigger)

### 4.1 Send Test Event from Dashboard

1. Go to **Inngest Dashboard** → **Events** → **Send Event**
2. Enter event details:
   ```json
   {
     "name": "email/inbound.process",
     "data": {
       "messageId": "your-test-message-id"
     }
   }
   ```
3. Click **"Send Event"**

### 4.2 Monitor Execution

1. Go to **Runs** tab
2. Watch for new run appearing
3. Click on the run to see execution details

---

## Step 5: Verify Function Execution

### 5.1 Check Function Logs

**In Inngest Dashboard:**

1. Go to **Runs** → Click on a specific run
2. Expand **Steps** to see execution details
3. Check **Logs** tab for console output

**Expected logs:**

```
[Inngest] Processing message: [message-id]
[Inngest] AI suggestion generated for message [message-id]
```

### 5.2 Check Database Updates

```sql
-- Check if AI suggestion was created
SELECT * FROM "AISuggestion"
WHERE "messageId" = 'your-test-message-id'
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Expected:**

- `reply` field contains AI-generated response
- `proposedAction` is set (REFUND, CANCEL, etc.)
- `confidence` is between 0 and 1

---

## Step 6: Debug Common Issues

### Issue 1: Functions Not Synced

**Symptoms:**

- Functions tab shows no functions
- Runs tab shows no executions

**Solutions:**

1. Check `INNGEST_EVENT_KEY` is set in environment variables
2. Re-sync app: **Inngest Dashboard** → **Apps** → **Sync**
3. Verify `/api/inngest` endpoint is accessible
4. Check Vercel deployment completed successfully

### Issue 2: Events Not Triggering

**Symptoms:**

- No runs appear in Inngest Dashboard
- Vercel logs don't show "Triggered Inngest event"

**Solutions:**

1. Check Vercel logs for errors:

   ```bash
   # In Vercel Dashboard → Logs
   # Look for errors related to Inngest
   ```

2. Verify import path is correct:

   ```typescript
   // Should be: ../../../inngest/client
   import { inngest } from '../../../inngest/client';
   ```

3. Check if event is being sent:
   ```typescript
   // Add logging before sending
   console.log('[Email Webhook] About to trigger Inngest event');
   await inngest.send({...});
   console.log('[Email Webhook] Inngest event triggered');
   ```

### Issue 3: Function Fails with Database Error

**Symptoms:**

- Runs show "Failed" status
- Error mentions Prisma or database

**Solutions:**

1. Check `DATABASE_URL` is set correctly
2. Verify database connection is working
3. Check Prisma Client is generated:
   ```bash
   cd packages/db
   pnpm prisma generate
   ```

### Issue 4: Function Runs But No AI Suggestion

**Symptoms:**

- Run shows "Success" but no database record

**Solutions:**

1. Check function logs in Inngest Dashboard
2. Verify `messageId` exists in database:
   ```sql
   SELECT * FROM "Message" WHERE id = 'your-message-id';
   ```
3. Check if function is actually saving to database (check logs)

### Issue 5: OpenAI API Errors

**Symptoms:**

- Function succeeds but AI reply is generic/fallback

**Solutions:**

1. Check `OPENAI_API_KEY` is set
2. Verify API key is valid
3. Check OpenAI API quota/limits
4. Review function logs for OpenAI errors

---

## Step 7: Monitoring and Alerts

### 7.1 Set Up Monitoring

**Inngest Dashboard:**

1. Go to **Insights** (left sidebar)
2. Monitor:
   - Function execution rate
   - Success/failure rate
   - Average execution time

### 7.2 Set Up Alerts

1. Go to **Settings** → **Alerts**
2. Configure alerts for:
   - Function failures
   - High error rates
   - Slow execution times

---

## Step 8: Production Testing Checklist

Before going to production, verify:

- [ ] Inngest functions synced in production environment
- [ ] `INNGEST_EVENT_KEY` set in production Vercel environment
- [ ] Test email webhook triggers Inngest event
- [ ] Function executes successfully
- [ ] AI suggestions are generated correctly
- [ ] Database records are created
- [ ] Error handling works (test with invalid messageId)
- [ ] Retry logic works (test with temporary failure)
- [ ] Monitoring is set up

---

## Quick Reference Commands

```bash
# Test Inngest endpoint
curl https://www.zyyp.ai/api/inngest

# Check environment variable (local)
echo $INNGEST_EVENT_KEY

# View Inngest logs (via dashboard)
# Go to: https://app.inngest.com → Runs → Click on run → Logs

# Check database for AI suggestions
cd packages/db
pnpm prisma studio
# Navigate to AISuggestion table
```

---

## Success Indicators

✅ **Inngest is working correctly if:**

- Functions appear in Inngest Dashboard → Functions
- Events trigger and create runs in Runs tab
- Function executions complete successfully
- AI suggestions are created in database
- No errors in Inngest Dashboard or Vercel logs

---

## Need Help?

- **Inngest Docs:** https://www.inngest.com/docs
- **Inngest Discord:** https://www.inngest.com/discord
- **Check Vercel Logs:** Dashboard → Your Project → Logs
- **Check Inngest Logs:** Dashboard → Runs → Click run → Logs
