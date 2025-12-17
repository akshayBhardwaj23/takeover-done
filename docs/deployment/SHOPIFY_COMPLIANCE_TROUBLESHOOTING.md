# Shopify Compliance Webhooks - Setup & Troubleshooting

**Status:** ✅ Implemented  
**Required:** YES (mandatory for Shopify App Store)  

This guide covers setup, configuration, and troubleshooting for Shopify compliance webhooks (GDPR/CPRA compliance).

---

## Overview

Shopify requires all apps distributed through the App Store to implement three mandatory compliance webhooks for GDPR/CPRA compliance. These webhooks handle customer data requests and deletion.

---

## Finding Compliance Webhooks in Shopify Partners

**Note:** Compliance webhooks are **only visible for apps being distributed publicly** on the Shopify App Store.

### Step 1: Check Your App Distribution Type

1. Go to **Shopify Partners Dashboard**
2. Select **Apps** → **Your App**
3. Click **Overview** or **Distribution**

**Current setting:**
- ❌ **Custom app** = No compliance webhooks needed
- ❌ **Unlisted** = No compliance webhooks needed  
- ✅ **Public** = Compliance webhooks REQUIRED

### Step 2: Create App Listing (If Not Done)

1. In your app dashboard, look for "**App listing**" in the left sidebar
2. If you see "**Create app listing**", click it
3. This starts the App Store submission process

### Step 3: Find Compliance Webhooks Section

Once you're in the app listing flow, compliance webhooks appear in:

**Location A: App Setup Tab**
- Shopify Partners → Apps → Your App → App setup
- Scroll to "Webhooks" section
- Look for "Compliance webhooks" or "GDPR webhooks"

**Location B: During App Listing Creation**
- Create app listing → Privacy & compliance step
- You'll see three required fields:
  - Customer data request endpoint
  - Customer data deletion endpoint
  - Shop data deletion endpoint

---

## Troubleshooting Automated Checks

**Issue:** Automated checks failing in Shopify Partners Dashboard:
- ❌ Provides mandatory compliance webhooks
- ❌ Verifies webhooks with HMAC signatures

---

## ✅ Quick Fix Checklist

### Step 1: Verify Webhooks Are Registered

**Check in Shopify Partners Dashboard:**

1. Go to **Apps** → **Zyyp AI** → **App setup**
2. Scroll to **Webhooks** section
3. Look for compliance webhooks:
   - `customers/data_request`
   - `customers/redact`
   - `shop/redact`

**If webhooks are NOT listed:**

```bash
cd apps/web
shopify app config push
```

This should register the webhooks from your `shopify.app.toml` file.

---

### Step 2: Verify Endpoint is Deployed

**Test your endpoint is live:**

```bash
# Test GET request (verification)
curl https://www.zyyp.ai/api/webhooks/shopify/compliance

# Should return:
# {"status":"ok","endpoint":"compliance-webhooks","message":"Compliance webhook endpoint is active"}
```

**If endpoint returns 404:**
- Deploy your code to production
- Verify the route file exists: `apps/web/app/api/webhooks/shopify/compliance/route.ts`

---

### Step 3: Verify Environment Variables

**In Vercel (or your hosting platform), ensure these are set:**

```bash
SHOPIFY_API_SECRET=<your-secret>  # CRITICAL for HMAC verification
DATABASE_URL=<your-database-url>
```

**The `SHOPIFY_API_SECRET` must match:**
- The secret in your Shopify Partners dashboard
- The secret used to generate HMAC signatures

---

### Step 4: Test HMAC Verification

**Create a test script to verify HMAC works:**

```bash
# Save this as test-hmac.js
const crypto = require('crypto');
const secret = process.env.SHOPIFY_API_SECRET;
const payload = JSON.stringify({ test: true });
const hmac = crypto
  .createHmac('sha256', secret)
  .update(payload, 'utf8')
  .digest('base64');
console.log('HMAC:', hmac);
```

```bash
SHOPIFY_API_SECRET=your-secret node test-hmac.js
```

**If HMAC generation fails:**
- Check `SHOPIFY_API_SECRET` is correct
- Verify no extra spaces or line breaks

---

### Step 5: Check Vercel Function Logs

**In Vercel Dashboard:**

1. Go to **Deployments** → Select latest deployment
2. Click **Functions** → `api/webhooks/shopify/compliance`
3. Check **Logs** tab

**Look for:**
- `[Compliance Webhook] Received request` - Endpoint is being called
- `[Compliance Webhook] HMAC verified successfully` - HMAC works
- `[Compliance Webhook] HMAC verification failed` - HMAC issue
- `Missing SHOPIFY_API_SECRET` - Environment variable missing

---

## 🔍 Common Issues & Solutions

### Issue 1: "Provides mandatory compliance webhooks" ❌

**Symptoms:**
- Webhooks not listed in Partners dashboard
- Shopify can't find the webhook endpoints

**Solutions:**

1. **Register webhooks via CLI:**
   ```bash
   cd apps/web
   shopify app config push
   ```

2. **Verify `shopify.app.toml` has compliance webhooks:**
   ```toml
   [[webhooks.subscriptions]]
   compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
   uri = "https://www.zyyp.ai/api/webhooks/shopify/compliance"
   ```

3. **Manually register in Partners Dashboard:**
   - Go to **App setup** → **Webhooks**
   - Add each compliance webhook manually
   - URL: `https://www.zyyp.ai/api/webhooks/shopify/compliance`

---

### Issue 2: "Verifies webhooks with HMAC signatures" ❌

**Symptoms:**
- HMAC verification failing
- 401 errors in logs
- Shopify test requests failing

**Solutions:**

1. **Verify `SHOPIFY_API_SECRET` is set:**
   ```bash
   # In Vercel dashboard
   Settings → Environment Variables
   # Check SHOPIFY_API_SECRET exists and is correct
   ```

2. **Test HMAC verification locally:**
   ```bash
   # Use Shopify CLI to trigger test webhook
   shopify app webhook trigger --topic customers/redact
   
   # Check your endpoint logs
   # Should see: "HMAC verified successfully"
   ```

3. **Check HMAC calculation:**
   - Ensure you're reading raw request body (not parsed JSON)
   - Verify base64 encoding is correct
   - Check secret matches Partners dashboard

4. **Verify endpoint handles GET requests:**
   - Shopify may send GET for verification
   - Our endpoint now handles GET (added in latest update)

---

### Issue 3: Endpoint Not Accessible

**Symptoms:**
- 404 errors
- Connection timeout
- SSL certificate errors

**Solutions:**

1. **Verify deployment:**
   ```bash
   # Check Vercel deployment status
   # Ensure latest code is deployed
   ```

2. **Test endpoint accessibility:**
   ```bash
   curl https://www.zyyp.ai/api/webhooks/shopify/compliance
   # Should return JSON response, not 404
   ```

3. **Check SSL certificate:**
   - Verify certificate is valid
   - Check expiration date
   - Ensure HTTPS is working

4. **Verify route file exists:**
   - File: `apps/web/app/api/webhooks/shopify/compliance/route.ts`
   - Should export `GET` and `POST` handlers

---

### Issue 4: Webhooks Registered But Not Working

**Symptoms:**
- Webhooks show in dashboard ✅
- But checks still fail ❌

**Solutions:**

1. **Wait for Shopify to re-check:**
   - Click "Run" button in Partners dashboard
   - Wait 1-2 minutes for checks to complete

2. **Verify webhook URLs are correct:**
   - Production: `https://www.zyyp.ai/api/webhooks/shopify/compliance`
   - No trailing slashes
   - HTTPS (not HTTP)

3. **Check webhook format:**
   - All 3 compliance webhooks should use same URL
   - API version should match: `2024-10` or `2025-10`

---

## 🧪 Testing Your Fixes

### Test 1: Endpoint Accessibility

```bash
# GET request (verification)
curl https://www.zyyp.ai/api/webhooks/shopify/compliance

# Expected: {"status":"ok","endpoint":"compliance-webhooks",...}
```

### Test 2: HMAC Verification

```bash
# Use Shopify CLI to trigger test webhook
shopify app webhook trigger --topic customers/redact

# Check Vercel logs
# Should see: "HMAC verified successfully"
```

### Test 3: Full Webhook Flow

1. Install app on test store
2. Trigger compliance webhook from Shopify
3. Check database for logged events
4. Verify webhook was processed

---

## 📋 Verification Checklist

Before clicking "Run" again in Partners dashboard:

- [ ] Webhooks registered in Partners dashboard (all 3 compliance webhooks)
- [ ] Endpoint accessible: `curl https://www.zyyp.ai/api/webhooks/shopify/compliance`
- [ ] `SHOPIFY_API_SECRET` set in Vercel environment variables
- [ ] Code deployed to production (latest version)
- [ ] GET handler returns 200 OK
- [ ] POST handler verifies HMAC correctly
- [ ] No errors in Vercel function logs
- [ ] SSL certificate is valid

---

## 🚀 Step-by-Step Fix Process

### 1. Deploy Latest Code

```bash
git add .
git commit -m "Fix compliance webhook endpoint - add GET handler and improve error handling"
git push origin main  # or staging
```

### 2. Verify Deployment

- Check Vercel dashboard → Deployments
- Ensure deployment succeeded
- Check function logs for errors

### 3. Register Webhooks

```bash
cd apps/web
shopify app config push
```

### 4. Verify in Partners Dashboard

- Go to **App setup** → **Webhooks**
- Confirm all 3 compliance webhooks are listed
- Check URLs are correct

### 5. Test Endpoint

```bash
curl https://www.zyyp.ai/api/webhooks/shopify/compliance
```

### 6. Run Automated Checks

- Go to **Distribution** → **Automated checks**
- Click **Run** button
- Wait for results

---

## 📞 Still Not Working?

### Check These:

1. **Vercel Function Logs:**
   - Look for error messages
   - Check HMAC verification logs
   - Verify environment variables are loaded

2. **Shopify Partners Support:**
   - Contact support if webhooks won't register
   - Ask about compliance webhook requirements
   - Request manual webhook registration

3. **Network/Firewall:**
   - Ensure Shopify can reach your endpoint
   - Check firewall rules
   - Verify no IP blocking

4. **API Version Mismatch:**
   - Check `api_version` in `shopify.app.toml`
   - Should match Partners dashboard setting
   - Try updating to latest: `2025-10`

---

## ✅ Success Indicators

When everything is working, you should see:

1. **Partners Dashboard:**
   - ✅ All 3 compliance webhooks listed
   - ✅ Green checkmarks on automated checks
   - ✅ "Provides mandatory compliance webhooks" ✅
   - ✅ "Verifies webhooks with HMAC signatures" ✅

2. **Vercel Logs:**
   - `[Compliance Webhook] Received request`
   - `[Compliance Webhook] HMAC verified successfully`
   - `[Compliance Webhook] Successfully processed`

3. **Test Requests:**
   - GET request returns 200 OK
   - POST request with valid HMAC returns 200 OK
   - Invalid HMAC returns 401 (expected)

---

## 📚 References

- [Shopify Compliance Webhooks Docs](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Shopify Webhook Verification](https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook)
- [Shopify Partners Support](https://partners.shopify.com/support)

---

---

## Common Issue: SHOPIFY_API_SECRET Mismatch

**This is the #1 cause of HMAC verification failures!**

### How to Verify:

1. **Get your secret from Shopify Partners:**
   - Go to **Shopify Partners** → **Apps** → **Zyyp AI** → **App setup**
   - Find **Client secret** or **API secret**
   - Copy the exact value (no spaces, no line breaks)

2. **Check Vercel Environment Variable:**
   - Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
   - Find `SHOPIFY_API_SECRET`
   - Compare with Partners dashboard value
   - **They must match EXACTLY**

3. **Update if Different:**
   - In Vercel, update `SHOPIFY_API_SECRET` to match Partners dashboard
   - **Redeploy** your application (Vercel will auto-redeploy when env vars change)

### Step-by-Step Debugging

#### Step 1: Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** → Select latest deployment
3. Click **Functions** tab
4. Find `api/webhooks/shopify/compliance`
5. Click **View Function Logs**

**Look for:**
- `[Compliance Webhook] HMAC verification failed` → Secret mismatch
- `Missing SHOPIFY_API_SECRET` → Env var not set
- `[Compliance Webhook] Successfully processed` → Working correctly

#### Step 2: Test Endpoint Directly

**Test GET request (verification):**
```bash
curl https://www.zyyp.ai/api/webhooks/shopify/compliance

# Should return:
# {"status":"ok","endpoint":"compliance-webhooks","message":"Compliance webhook endpoint is active"}
```

**If endpoint returns 404:**
- Deploy your code to production
- Verify the route file exists: `apps/web/app/api/webhooks/shopify/compliance/route.ts`

#### Step 3: Verify Webhooks Are Registered

**Check in Shopify Partners Dashboard:**

1. Go to **Apps** → **Zyyp AI** → **App setup**
2. Scroll to **Webhooks** section
3. Look for compliance webhooks:
   - `customers/data_request`
   - `customers/redact`
   - `shop/redact`

**If webhooks are NOT listed:**

```bash
cd apps/web
shopify app config push
```

This should register the webhooks from your `shopify.app.toml` file.

---

## References

- [Shopify Compliance Webhooks Docs](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Shopify Webhook Verification](https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook)
- [Shopify Partners Support](https://partners.shopify.com/support)
- Main reference: [SHOPIFY_COMPLIANCE_WEBHOOKS.md](./SHOPIFY_COMPLIANCE_WEBHOOKS.md)

---

**Last Updated:** December 2024  
**Status:** Active troubleshooting guide

