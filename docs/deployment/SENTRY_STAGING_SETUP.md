# Sentry Setup for Staging

## Quick Start

1. **Get Sentry DSN:**
   - Go to [sentry.io](https://sentry.io) → Your Project → Settings → Client Keys (DSN)
   - Copy the DSN: `https://[PROJECT_ID]@[ORG].ingest.sentry.io/[PROJECT_ID]`

2. **Add to Vercel:**
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_SENTRY_DSN` = `[YOUR_DSN]`
   - Set environment to **Preview** (staging)
   - Redeploy

3. **Verify:**
   - Send a test email to your Mailgun alias
   - Check Sentry Dashboard → Discover → Search `source:email-webhook`

## What Gets Logged

All email webhook events are automatically sent to Sentry:

### Info Logs (Breadcrumbs)

- `[Email Webhook] 📧 Received request` - Every webhook request
- `[Email Webhook] 🔐 Authentication check` - Authentication status
- `[Email Webhook] ✅ Authentication PASSED` - Successful auth
- `[Email Webhook] ✅✅✅ SUCCESSFULLY PROCESSED EMAIL` - Final success

### Warning Logs

- `[Email Webhook] ❌ Authentication FAILED` - Auth failures (but allowed through)
- `[Email Webhook] ⚠️ No order matched` - Order not found (goes to unassigned)

### Error Logs

- `[Email Webhook] ❌ Error processing webhook` - Actual errors with stack traces

## Searching Logs

### In Sentry Dashboard:

1. **Go to Discover** → Create a query
2. **Search for:**
   - `source:email-webhook` - All webhook logs
   - `message:[Email Webhook]` - All webhook messages
   - `requestId:abc123` - Trace a specific request
   - `level:error` - Only errors
   - `level:warning` - Only warnings
   - `level:info` - Only info logs

3. **Filter by:**
   - Time range
   - Environment (staging/production)
   - Tags (source, endpoint)

### Example Queries:

```
# All webhook logs from last hour
source:email-webhook timestamp:>-1h

# All authentication failures
source:email-webhook message:"Authentication FAILED"

# All successful email processing
source:email-webhook message:"SUCCESSFULLY PROCESSED EMAIL"

# Trace a specific request
requestId:abc-123-def-456
```

## Request ID Tracing

Every webhook request gets a unique `requestId` that's included in all logs. This allows you to:

1. **Trace a single request** through all log entries
2. **See the full flow** from start to finish
3. **Debug issues** by following the request lifecycle

Example:

```
requestId: abc-123-def-456
├─ [Email Webhook] 📧 Received request
├─ [Email Webhook] 🔐 Authentication check
├─ [Email Webhook] ✅ Authentication PASSED
└─ [Email Webhook] ✅✅✅ SUCCESSFULLY PROCESSED EMAIL
```

## Benefits Over Vercel Logs

1. **Always visible** - No filtering or buffering
2. **Structured** - Easy to search and filter
3. **Rich context** - Request IDs, tags, extra data
4. **Error tracking** - Automatic stack traces and breadcrumbs
5. **Alerts** - Can set up alerts for errors

## Cost

- **Free tier:** 5,000 events/month (plenty for staging)
- **Staging usage:** ~100-500 events/month (very low)
- **No cost for staging** if you stay under free tier

## Configuration

Sentry is automatically configured to:

- ✅ **Enable in staging** (when `ENVIRONMENT=staging`)
- ✅ **Enable in production** (when `NODE_ENV=production`)
- ✅ **Disable in local development** (no events sent)
- ✅ **Set environment tag** (staging/production/development)
- ✅ **Add tags** (source: email-webhook, endpoint: /api/webhooks/email/custom)

## Troubleshooting

### No logs appearing in Sentry?

1. **Check DSN is set:**

   ```bash
   # In Vercel, verify environment variable exists
   NEXT_PUBLIC_SENTRY_DSN=https://...
   ```

2. **Check Sentry is enabled:**
   - Should be enabled when `ENVIRONMENT=staging` or `NODE_ENV=production`
   - Check `sentry.server.config.ts` for configuration

3. **Check Sentry dashboard:**
   - Go to Issues → See if errors are appearing
   - Go to Discover → Search for logs

4. **Test with a manual error:**
   ```typescript
   // Temporarily add to webhook handler
   Sentry.captureMessage('Test from staging', { level: 'info' });
   ```

### Logs appearing but not structured?

- All logs include `requestId` for tracing
- All logs include `source: email-webhook` tag
- Check Discover → Fields to see all available fields

## Next Steps

1. ✅ Set up Sentry DSN in Vercel
2. ✅ Redeploy staging
3. ✅ Send test email
4. ✅ Verify logs appear in Sentry
5. ✅ Set up alerts (optional) for errors
