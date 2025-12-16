# Dashboard 401 Error Troubleshooting

## The Problem

Getting **401 Unauthorized** popup when clicking "Send Reply" in dashboard, but no error in Vercel logs.

## Root Cause

The `actionApproveAndSend` mutation requires authentication (NextAuth session). The 401 means:

- ❌ No session found
- ❌ Session expired
- ❌ Not logged in
- ❌ Session not being passed correctly to tRPC

## Quick Diagnostic

### Step 1: Check if You're Logged In

1. **Look at top-right corner** of dashboard
2. **Do you see your name/email and "Sign out" button?**
   - ✅ **Yes** → You're logged in, but session might not be passed to API
   - ❌ **No** → You need to log in first

### Step 2: Check Browser Console

1. **Open browser DevTools** (F12 or Cmd+Option+I)
2. **Go to Console tab**
3. **Click "Send Reply"** button
4. **Look for error messages:**
   - `Send email error: ...`
   - `UNAUTHORIZED`
   - `You must be logged in`

### Step 3: Check Network Tab

1. **Open browser DevTools** → **Network tab**
2. **Click "Send Reply"** button
3. **Find the request** to `/api/trpc/actionApproveAndSend`
4. **Check:**
   - **Status**: Should show 401
   - **Request Headers**: Check if cookies are being sent
   - **Response**: Should show the error JSON

## Solutions

### Solution 1: Log In Again

**If you're not logged in:**

1. Click **"Sign in"** button
2. Complete Google OAuth flow
3. Try sending email again

### Solution 2: Refresh Session

**If session expired:**

1. **Sign out** (top-right corner)
2. **Sign in again**
3. Try sending email

### Solution 3: Check Environment Variables

**Vercel Dashboard** → **Settings** → **Environment Variables** (Preview environment):

Verify these are set:

- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL` (should be your staging URL)

**If missing:**

- Add them
- Redeploy

### Solution 4: Check Vercel Logs for Session Details

After clicking "Send Reply", check **Vercel Logs** for:

```
[tRPC] Session check: { hasSession: false/true, userEmail: ... }
[tRPC] Creating context: { hasSession: false/true, hasUserId: false/true }
```

**If `hasSession: false`:**

- Session not being passed correctly
- NextAuth configuration issue

## Test with curl (Requires Session Cookie)

Since the endpoint requires authentication, you need a session cookie:

```bash
# Step 1: Log in via browser
# Step 2: Get session cookie from browser DevTools → Application → Cookies
# Step 3: Use cookie in curl:

curl -X POST https://your-staging-url.vercel.app/api/trpc/actionApproveAndSend \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"json":{"actionId":"test-action-id","to":"customer@example.com","subject":"Test","body":"Test email"}}'
```

**But this is complex** - easier to test via browser and check console/network tabs.

## Common Issues

### Issue: "No session" but you're logged in

**Cause:** Session cookie not being sent with tRPC requests

**Fix:**

1. Check browser DevTools → Network → Request Headers
2. Verify cookies are included
3. Check if SameSite cookie settings are correct

### Issue: Session expires immediately

**Cause:** `NEXTAUTH_SECRET` not set or wrong

**Fix:**

1. Verify `NEXTAUTH_SECRET` in Vercel
2. Generate new secret if needed: `openssl rand -base64 32`
3. Redeploy

### Issue: 401 in popup but no error in logs

**Cause:** Error caught client-side before reaching server

**Fix:**

1. Check browser console for detailed error
2. Check network tab for actual request/response
3. The improved error handling should now show better messages

## Common Issues & Solutions

### Issue: "No session" but you're logged in

**Cause:** Session cookie not being sent with tRPC requests

**Fix:**
1. Check browser DevTools → Network → Request Headers
2. Verify cookies are included
3. Check if SameSite cookie settings are correct
4. Try clearing cookies and signing in again

### Issue: Session expires immediately

**Cause:** `NEXTAUTH_SECRET` not set or wrong

**Fix:**
1. Verify `NEXTAUTH_SECRET` in Vercel
2. Generate new secret if needed: `openssl rand -base64 32`
3. Update in Vercel and redeploy

### Issue: Works locally but not staging

**Cause:** Different session cookies or auth configuration

**Fix:**
1. Verify `NEXTAUTH_SECRET` is set in Vercel (Preview environment)
2. Verify `NEXTAUTH_URL` points to staging URL
3. Clear browser cookies and sign in again

### Issue: 401 in popup but no error in logs

**Cause:** Error caught client-side before reaching server

**Fix:**
1. Check browser console for detailed error
2. Check network tab for actual request/response
3. The improved error handling should now show better messages

## Debugging Steps Summary

1. **Check if you're logged in** (top-right corner shows your name, not "Sign in")
2. **Open browser console** (F12) and try sending email
3. **Check Network tab** for request to `/api/trpc/actionApproveAndSend`
4. **Check Vercel logs** for session status: `[tRPC] Session check: { hasSession: true/false }`
5. **If still 401:**
   - Sign out and sign in again
   - Check environment variables (NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID/SECRET)
   - Verify NextAuth is configured correctly
   - Clear browser cookies and retry
