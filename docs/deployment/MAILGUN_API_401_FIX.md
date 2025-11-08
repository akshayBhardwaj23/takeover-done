# Fix Mailgun API 401 Error When Sending Emails

## The Problem

Getting `Mailgun API error: 401` when trying to send emails from the dashboard. The error message is:
```json
{"ok":false,"error":"Mailgun API error: 401"}
```

## Root Cause

The **Mailgun API key is either missing or incorrect** in your Vercel environment variables. A 401 from Mailgun means:
- ❌ `MAILGUN_API_KEY` is not set in Vercel
- ❌ `MAILGUN_API_KEY` is incorrect/invalid
- ❌ `MAILGUN_DOMAIN` doesn't match the API key's domain
- ❌ API key format is wrong

## Quick Fix

### Step 1: Verify Mailgun API Key

1. **Go to Mailgun Dashboard**: https://app.mailgun.com/
2. **Navigate to**: **Settings** → **API Keys**
3. **Copy your Private API Key** (starts with `key-...`)
4. **Verify the format**: Should look like `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Check Vercel Environment Variables

1. **Go to Vercel Dashboard**: https://vercel.com/
2. **Select your project** → **Settings** → **Environment Variables**
3. **Check Preview environment** (or Production if that's where you're testing)

**Verify these are set:**
- ✅ `MAILGUN_API_KEY` = `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your Private API Key)
- ✅ `MAILGUN_DOMAIN` = `mail.zyyp.ai` (or your Mailgun domain)
- ✅ `MAILGUN_FROM_EMAIL` = `support@mail.zyyp.ai` (optional, defaults to `support@{MAILGUN_DOMAIN}`)

### Step 3: Verify Domain Matches

**Important:** The `MAILGUN_DOMAIN` must match the domain associated with your API key.

1. **In Mailgun Dashboard**: Go to **Sending** → **Domains**
2. **Check your verified domain** (e.g., `mail.zyyp.ai`)
3. **Verify** `MAILGUN_DOMAIN` in Vercel matches exactly

### Step 4: Redeploy After Changes

**After updating environment variables:**
1. **Redeploy your staging environment** in Vercel
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment → **Redeploy**
   - Or push a new commit to trigger redeploy

2. **Wait for deployment to complete** (usually 1-2 minutes)

3. **Test again** by sending an email from the dashboard

## Common Issues

### Issue 1: API Key Format Wrong

**Symptom:** 401 error even though key is set

**Check:**
- API key should start with `key-`
- Should be the **Private API Key**, not Public API Key
- Should be from **Settings** → **API Keys**, not signing key

**Fix:**
1. Get the correct Private API Key from Mailgun
2. Update `MAILGUN_API_KEY` in Vercel
3. Redeploy

### Issue 2: Domain Mismatch

**Symptom:** 401 error with valid API key

**Check:**
- `MAILGUN_DOMAIN` must match the domain in Mailgun
- If using `mail.zyyp.ai`, make sure it's verified in Mailgun

**Fix:**
1. Verify domain in Mailgun Dashboard → **Sending** → **Domains**
2. Update `MAILGUN_DOMAIN` in Vercel to match exactly
3. Redeploy

### Issue 3: Environment Variable Not Set

**Symptom:** 401 error, no API key in logs

**Check:**
- Make sure you're checking the **correct environment** (Preview vs Production)
- Verify the variable name is exactly `MAILGUN_API_KEY` (case-sensitive)

**Fix:**
1. Add `MAILGUN_API_KEY` to the correct environment in Vercel
2. Add `MAILGUN_DOMAIN` if missing
3. Redeploy

### Issue 4: API Key Not Applied After Update

**Symptom:** Updated env var but still getting 401

**Fix:**
1. **Redeploy** after updating environment variables
2. Environment variables are only applied on new deployments
3. Check deployment logs to verify new env vars are loaded

## How to Verify It's Fixed

After fixing and redeploying:

1. **Try sending an email** from the dashboard
2. **Check for success**: Should return `{"ok":true,"messageId":"..."}` instead of error
3. **Check Vercel logs**: Should see `[Mailgun API Error]` only if there's an actual error
4. **Check Mailgun logs**: Go to **Sending** → **Logs** to see sent emails

## Improved Error Messages

The code now provides better error messages:

- **401 Error**: "Mailgun API authentication failed. Please verify MAILGUN_API_KEY and MAILGUN_DOMAIN are set correctly in Vercel environment variables."
- **Other Errors**: Shows the actual Mailgun error message

## Debugging

If still not working, check **Vercel logs** for:
```
[Mailgun API Error] {
  status: 401,
  domain: 'mail.zyyp.ai',
  apiKeyPrefix: 'key-1234...',
  error: '...'
}
```

This will show:
- What domain is being used
- First few characters of API key (to verify it's set)
- Actual Mailgun error message

## Next Steps

1. ✅ Verify Mailgun API key is correct
2. ✅ Check `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` in Vercel
3. ✅ Redeploy after updating env vars
4. ✅ Test sending email again
5. ✅ Check Vercel logs for detailed error if still failing

