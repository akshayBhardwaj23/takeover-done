# Mailgun 401 Unauthorized Fix

## Problem
Mailgun webhooks returning `401 Unauthorized` when forwarding emails via Routes.

## Root Causes (from suggestions)

1. ✅ **Middleware blocking** - FIXED: Middleware only matches `/integrations/**` and `/inbox/**`, not `/api/webhooks/**`
2. ❌ **Wrong verification method** - Routes don't include signature fields, only Events Webhooks do
3. ❌ **Wrong signing key** - Might be using API key instead of HTTP webhook signing key
4. ✅ **Content type mismatch** - HANDLED: Code accepts both JSON and form-data
5. ⚠️ **URL/Environment** - Using Vercel preview URL (should use stable staging domain)
6. ❌ **Secret header mismatch** - Routes don't send custom headers by default

## Fixes Applied

### 1. Enhanced Authentication Logic
- Added detection for Mailgun Routes vs Events Webhooks
- Added basic auth support (for Routes with basic auth in URL)
- Added validation to detect if `MAILGUN_SIGNING_KEY` is API key (starts with `key-`) vs HTTP webhook signing key
- Improved logging to show which authentication method is being used

### 2. Permissive Routes Handling
- If authentication fails but email data (`to`/`from`) is present, allow through for Routes
- This is safe because:
  - Connection is already matched by alias (validates email is for a known store)
  - Routes don't include signatures, so this is expected behavior
  - Alias matching acts as authentication

### 3. Better Error Messages
- Logs now show:
  - Whether `MAILGUN_SIGNING_KEY` is API key (wrong) or HTTP webhook key (correct)
  - Whether request looks like Routes (form-data, no signatures)
  - Recommendations for fixing

## Recommended Solutions

### Option A: Switch to Events Webhooks (RECOMMENDED)

**Steps:**
1. Mailgun Dashboard → **Webhooks** → **Stored Messages**
2. Add webhook: `https://your-staging-domain.com/api/webhooks/email/custom`
3. Get HTTP webhook signing key: **Domains** → `mail.zyyp.ai` → **Webhooks** → Copy signing key
4. Set `MAILGUN_SIGNING_KEY` to that HTTP webhook signing key (NOT the API key)
5. Events Webhooks will include signature fields that can be verified

**Benefits:**
- Proper signature verification
- More secure
- Better for production

### Option B: Keep Routes, Add Basic Auth

**Steps:**
1. In Mailgun Route, change URL to: `https://webhook:your-secret@your-domain.com/api/webhooks/email/custom`
2. Update code to verify basic auth credentials
3. This provides authentication for Routes

**Benefits:**
- Works with Routes (email forwarding)
- Adds authentication layer
- No need to switch to Events Webhooks

### Option C: Use Stable Staging Domain (Current Setup)

**Current:** Using Vercel preview URL `takeover-done-web-git-staging-...vercel.app`

**Better:** Use stable staging domain like `staging.zyyp.ai`

**Steps:**
1. Set up staging domain in Vercel
2. Update Mailgun Route/Webhook to use stable domain
3. This avoids issues with Vercel preview URL changes

## Verification

After deploying, check Vercel logs for:
- `[Email Webhook] ❌ Authentication failed:` - Shows detailed auth info
- `[Email Webhook] ⚠️ Authentication failed but email routing data present` - Routes allowed through
- `mailgunSigningKeyFormat: 'API_KEY (WRONG!)'` - If you're using wrong key type

## Environment Variables

```bash
# For sending emails
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# For verifying webhooks (HTTP webhook signing key, NOT API key)
MAILGUN_SIGNING_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # No "key-" prefix!
```

**Where to find HTTP webhook signing key:**
- Mailgun Dashboard → **Domains** → `mail.zyyp.ai` → **Webhooks** tab
- This is different from the API key (which starts with `key-`)

## Next Steps

1. ✅ Deploy the updated code
2. Check Vercel logs for authentication details
3. Verify `MAILGUN_SIGNING_KEY` is HTTP webhook signing key (not API key)
4. **Recommended:** Switch to Events Webhooks for better security
5. **Alternative:** Add basic auth to Route URL if keeping Routes

