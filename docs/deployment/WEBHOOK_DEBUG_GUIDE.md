# Shopify Webhook Debugging Guide

## Problem: 401 Unauthorized on Webhook Delivery

If you're getting `401 Unauthorized` errors when Shopify sends webhooks, follow these debugging steps.

## Changes Made

1. **Added detailed logging** - The webhook handler now logs:
   - Secret presence and length
   - HMAC values (computed vs received)
   - Payload length and preview
   - Secret preview (first 3 and last 3 chars for security)

2. **Added `dynamic = 'force-dynamic'`** - Ensures fresh request body reads (no caching)

3. **Improved error messages** - Shows exact HMAC values for comparison

## Step-by-Step Debugging

### Step 1: Check Vercel Logs

After deploying, create a test order in Shopify and check Vercel logs:

1. Go to **Vercel Dashboard** → Your Project → **Logs**
2. Filter for `POST /api/webhooks/shopify`
3. Look for `[Shopify Webhook]` log entries

You should see:
```
[Shopify Webhook] Received webhook: {
  shop: 'your-store.myshopify.com',
  topic: 'orders/create',
  hmacPresent: true,
  hmacPrefix: 'ZeE11LNEmZ...',
  secretPresent: true,
  secretLength: 32,
  secretPrefix: 'abc...xyz'
}
```

### Step 2: Verify Secret in Vercel

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Check **Preview** environment (not Production)
3. Find `SHOPIFY_API_SECRET`
4. **Copy the exact value** (no spaces, no line breaks)

### Step 3: Verify Secret in Shopify Partners

1. Go to **Shopify Partners** → Your App → **App Setup**
2. Scroll to **API Credentials**
3. **Copy the Client Secret** (not the API Key)
4. Compare with Vercel's `SHOPIFY_API_SECRET`

**Common Issues:**
- ✅ Secret should match exactly
- ❌ No leading/trailing spaces
- ❌ No newlines or line breaks
- ❌ Should be the **Client Secret**, not API Key

### Step 4: Check HMAC Comparison in Logs

In Vercel logs, look for:
```
[Shopify Webhook] HMAC validation: {
  payloadLength: 6580,
  computedHMAC: 'ZeE11LNEmZoDyslLxta42C0KJBnpnZh0Y/F3DPi0AKE=',
  receivedHMAC: 'ZeE11LNEmZoDyslLxta42C0KJBnpnZh0Y/F3DPi0AKE=',
  match: true/false
}
```

**If `match: false`:**
- The secret doesn't match
- Or the payload is being transformed

### Step 5: Verify Secret Length

Shopify Client Secrets are typically **32 characters** (hex). Check the logs:
```
secretLength: 32  ✅ Correct
secretLength: 0   ❌ Missing
secretLength: 64  ❌ Wrong secret (might be API Key)
```

### Step 6: Check Secret Preview

The logs show a preview like:
```
secretPrefix: 'abc...xyz'
```

Compare the first 3 and last 3 characters with your Shopify Partners secret to verify it's the right one.

## Common Issues and Solutions

### Issue 1: Secret Not Set in Preview Environment

**Symptom:** `secretLength: 0` in logs

**Fix:**
1. Go to Vercel → Environment Variables
2. Ensure `SHOPIFY_API_SECRET` is set for **Preview** environment
3. Redeploy

### Issue 2: Wrong Secret (API Key instead of Client Secret)

**Symptom:** `secretLength: 64` or different length

**Fix:**
1. Use **Client Secret** from Shopify Partners (not API Key)
2. Client Secret is typically 32 hex characters
3. Update Vercel environment variable

### Issue 3: Secret Has Whitespace

**Symptom:** Secret length is correct but HMAC doesn't match

**Fix:**
1. Copy secret again from Shopify Partners
2. Remove any leading/trailing spaces
3. Paste directly into Vercel (don't type manually)
4. Redeploy

### Issue 4: Different Apps (Staging vs Production)

**Symptom:** Works locally but not on Vercel

**Fix:**
1. Verify you're using the **same Shopify app** for staging
2. Check that Vercel's `SHOPIFY_API_SECRET` matches the staging app's Client Secret
3. If you have separate apps, use separate secrets

## Manual HMAC Verification

If you want to manually verify the HMAC:

1. Get the webhook payload from Shopify logs (click on the failed webhook)
2. Get the HMAC from the `X-Shopify-Hmac-Sha256` header
3. Use this command (replace with your values):

```bash
# Calculate HMAC
echo -n "PAYLOAD_JSON_HERE" | openssl dgst -sha256 -hmac "YOUR_SECRET_HERE" -binary | base64
```

Compare with the HMAC from Shopify. They should match exactly.

## Testing After Fix

1. **Update secret in Vercel** (if needed)
2. **Redeploy** or wait for auto-deploy
3. **Create a test order** in Shopify
4. **Check Vercel logs** - should see `match: true`
5. **Check dashboard** - order should appear

## Still Not Working?

If HMAC still doesn't match after verifying the secret:

1. **Check if payload is being modified** - The payload preview in logs should match Shopify's payload
2. **Try reading body as buffer** - May need to use `req.arrayBuffer()` instead of `req.text()`
3. **Check Next.js middleware** - Ensure no middleware is modifying the request body
4. **Check Vercel edge functions** - If using edge functions, they may transform the body

## Contact Points

- **Vercel Logs:** Project → Logs tab
- **Shopify Webhook Logs:** Shopify Partners → App → Monitoring → Logs → Webhooks
- **Secret Location:** Shopify Partners → App → App Setup → API Credentials

