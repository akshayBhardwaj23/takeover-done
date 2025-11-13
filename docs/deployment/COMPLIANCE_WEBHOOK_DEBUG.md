# Debugging Shopify Compliance Webhook Failures

**Issue:** Curl works ✅ but Shopify automated checks fail ❌

---

## 🔍 Most Common Issue: SHOPIFY_API_SECRET Mismatch

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

---

## 🧪 Step-by-Step Debugging

### Step 1: Check Vercel Function Logs

**This is the most important step!**

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** → Select latest deployment
3. Click **Functions** tab
4. Find `api/webhooks/shopify/compliance`
5. Click **View Function Logs**

**Look for:**
- `[Compliance Webhook] HMAC verification failed` → Secret mismatch
- `Missing SHOPIFY_API_SECRET` → Env var not set
- `[Compliance Webhook] Successfully processed` → Working correctly

**What to look for in failed requests:**
```
[Compliance Webhook] HMAC verification failed
  expectedPrefix: "abc123..."
  receivedPrefix: "xyz789..."
  hasSecret: true
```

If `expectedPrefix` and `receivedPrefix` are different → **Secret mismatch**

---

### Step 2: Verify Webhook Registration

**Check if webhooks are actually registered:**

1. Go to **Shopify Partners** → **Apps** → **Zyyp AI** → **App setup**
2. Scroll to **Webhooks** section
3. Look for these three webhooks:
   - `customers/data_request`
   - `customers/redact`
   - `shop/redact`

**If webhooks are NOT listed:**

```bash
cd apps/web
shopify app config push
```

**Verify the command succeeded:**
- Should see: "Configuration pushed successfully"
- Check Partners dashboard again

**If webhooks still don't appear:**
- Try manually adding them in Partners dashboard
- URL: `https://www.zyyp.ai/api/webhooks/shopify/compliance`
- API Version: `2024-10` or `2025-10`

---

### Step 3: Test with Shopify CLI

**Trigger a real webhook to see what happens:**

```bash
# Install Shopify CLI if needed
npm install -g @shopify/cli @shopify/app

# Trigger test webhook
shopify app webhook trigger --topic customers/redact

# Check Vercel logs immediately after
# Should see: "[Compliance Webhook] HMAC verified successfully"
```

**If this fails:**
- Check Vercel logs for error
- Verify `SHOPIFY_API_SECRET` is correct
- Check webhook is registered

---

### Step 4: Test Endpoint Manually

**Test with a valid HMAC (requires Node.js):**

```javascript
// test-hmac.js
const crypto = require('crypto');

const secret = process.env.SHOPIFY_API_SECRET || 'your-secret-here';
const payload = JSON.stringify({
  shop_id: 123,
  shop_domain: 'test.myshopify.com',
  customer: {
    id: 456,
    email: 'test@example.com'
  },
  orders_to_redact: []
});

const hmac = crypto
  .createHmac('sha256', secret)
  .update(payload, 'utf8')
  .digest('base64');

console.log('Payload:', payload);
console.log('HMAC:', hmac);
console.log('');
console.log('Test command:');
console.log(`curl -X POST https://www.zyyp.ai/api/webhooks/shopify/compliance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "X-Shopify-Topic: customers/redact" \\`);
console.log(`  -H "X-Shopify-Shop-Domain: test.myshopify.com" \\`);
console.log(`  -H "X-Shopify-Hmac-Sha256: ${hmac}" \\`);
console.log(`  -d '${payload}'`);
```

**Run:**
```bash
SHOPIFY_API_SECRET=your-secret node test-hmac.js
```

**Then run the curl command it outputs**
- Should return: `{"success": true, ...}`
- If returns 401 → Secret mismatch

---

## 🔧 Common Fixes

### Fix 1: Update SHOPIFY_API_SECRET

**If secret is wrong:**

1. Get correct secret from Partners dashboard
2. Update in Vercel: **Settings** → **Environment Variables**
3. **Redeploy** (or wait for auto-redeploy)
4. Test again

### Fix 2: Re-register Webhooks

**If webhooks aren't registered:**

```bash
cd apps/web
shopify app config push
```

**Or manually in Partners dashboard:**
- Add each compliance webhook
- URL: `https://www.zyyp.ai/api/webhooks/shopify/compliance`
- API Version: `2024-10`

### Fix 3: Check API Version Mismatch

**Verify API version matches:**

1. Check `shopify.app.toml`:
   ```toml
   [webhooks]
   api_version = "2024-10"
   ```

2. Check Partners dashboard:
   - **App setup** → **Webhooks API Version**
   - Should match `2024-10` or `2025-10`

3. Update if different:
   ```bash
   shopify app config push
   ```

---

## 📋 Verification Checklist

Before clicking "Run" in Partners dashboard again:

- [ ] `SHOPIFY_API_SECRET` in Vercel matches Partners dashboard **EXACTLY**
- [ ] All 3 compliance webhooks registered in Partners dashboard
- [ ] Webhook URLs are: `https://www.zyyp.ai/api/webhooks/shopify/compliance`
- [ ] API version matches in both places (`2024-10` or `2025-10`)
- [ ] Code deployed to production (latest version)
- [ ] GET request works: `curl https://www.zyyp.ai/api/webhooks/shopify/compliance`
- [ ] Vercel function logs show no errors
- [ ] Test webhook with Shopify CLI succeeds

---

## 🎯 What Shopify's Automated Checks Test

Shopify's automated checks verify:

1. **Endpoint exists and responds:**
   - Sends GET request → Should return 200 OK ✅

2. **Webhooks are registered:**
   - Checks Partners dashboard for compliance webhooks
   - Verifies URLs are correct

3. **HMAC verification works:**
   - Sends POST request with valid HMAC
   - Expects 200 OK response
   - If HMAC fails → Returns 401 → Check fails ❌

4. **Response format:**
   - Expects 200-series status code
   - JSON response preferred

---

## 🚨 If Still Failing

### Check These:

1. **Vercel Function Logs:**
   - What exact error is shown?
   - Is HMAC verification failing?
   - Is the endpoint being called at all?

2. **Network/Firewall:**
   - Can Shopify reach your endpoint?
   - Any firewall blocking Shopify IPs?
   - SSL certificate valid?

3. **Timing:**
   - Wait 2-3 minutes after deploying
   - Wait 1-2 minutes after updating env vars
   - Click "Run" again in Partners dashboard

4. **Contact Shopify Support:**
   - If webhooks won't register
   - If automated checks keep failing
   - Ask for specific error details

---

## 📞 Getting Help

**If you've tried everything:**

1. **Collect debug info:**
   - Vercel function logs (last 10 requests)
   - Partners dashboard webhook list (screenshot)
   - Environment variable names (not values!)

2. **Contact Shopify Partners Support:**
   - Explain: "Automated compliance webhook checks failing"
   - Provide: App name, App ID
   - Ask: "Can you check if webhooks are registered correctly?"

3. **Check Vercel Support:**
   - If environment variables aren't loading
   - If function isn't deploying

---

## ✅ Success Indicators

When everything works:

1. **Vercel Logs:**
   ```
   [Compliance Webhook] Received request
   [Compliance Webhook] HMAC verified successfully
   [Compliance Webhook] Successfully processed
   ```

2. **Partners Dashboard:**
   - ✅ Provides mandatory compliance webhooks
   - ✅ Verifies webhooks with HMAC signatures

3. **Test Request:**
   ```bash
   shopify app webhook trigger --topic customers/redact
   # Should succeed without errors
   ```

---

**Most likely fix:** Update `SHOPIFY_API_SECRET` in Vercel to match Partners dashboard exactly! 🔑

---

**Last Updated:** November 13, 2024

