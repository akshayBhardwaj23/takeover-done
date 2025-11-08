# Dashboard 401 Error When Sending Emails

## Problem

Getting `401 Unauthorized` popup when sending emails from dashboard, but no error in Vercel logs.

## Root Cause

The error is likely a **NextAuth session issue**:
- User is not logged in, or
- Session expired, or  
- Session not being passed correctly to tRPC

## Quick Fix

### Step 1: Check if You're Logged In

1. Check the top-right corner of the dashboard
2. Should see your name/email and "Sign out" button
3. If you see "Sign in" instead, you're not logged in

**Fix:** Click "Sign in" and authenticate with Google

### Step 2: Check Session in Browser

1. Open browser DevTools (F12)
2. Go to **Application** tab → **Cookies**
3. Look for `next-auth.session-token` cookie
4. If missing, session expired or not set

**Fix:** Sign out and sign in again

### Step 3: Check Vercel Logs for Session Info

After trying to send email, check Vercel logs for:
- `[tRPC] Session check:` - Should show `hasSession: true`
- `[tRPC] Creating context:` - Should show `hasUserId: true`

If you see `hasSession: false`, you're not logged in.

## Common Issues

### Issue: "Please log in to send emails" popup

**Cause:** Session not available

**Fix:**
1. Sign out from dashboard
2. Sign in again
3. Try sending email again

### Issue: Session expires quickly

**Cause:** NextAuth session TTL might be too short

**Check:** `NEXTAUTH_SECRET` is set in Vercel

### Issue: Works locally but not staging

**Cause:** Different session cookies or auth configuration

**Fix:**
1. Verify `NEXTAUTH_SECRET` is set in Vercel (Preview environment)
2. Verify `NEXTAUTH_URL` points to staging URL
3. Clear browser cookies and sign in again

## Debugging Steps

### 1. Check Browser Console

Open DevTools → Console, then try sending email. Look for:
- `Send email error:` - Should show the actual error
- Check error code: `UNAUTHORIZED` means not logged in

### 2. Check Network Tab

1. DevTools → **Network** tab
2. Try sending email
3. Look for request to `/api/trpc/actionApproveAndSend`
4. Check:
   - **Status**: Should be 200 (not 401)
   - **Request Headers**: Should have `cookie` header with session
   - **Response**: Check for error message

### 3. Check Vercel Logs

Look for:
```
[tRPC] Session check: { hasSession: false, ... }
```

If `hasSession: false`, you're not authenticated.

## Verification

After fixing:

1. ✅ Sign in to dashboard
2. ✅ Check top-right shows your name (not "Sign in")
3. ✅ Try sending email
4. ✅ Should succeed (no 401 error)
5. ✅ Check Vercel logs show `hasSession: true`

## If Still Not Working

1. **Clear browser cookies:**
   - DevTools → Application → Cookies
   - Delete all cookies for your domain
   - Sign in again

2. **Check environment variables:**
   - `NEXTAUTH_SECRET` is set in Vercel
   - `NEXTAUTH_URL` matches staging URL
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

3. **Check NextAuth configuration:**
   - Verify Google OAuth is configured correctly
   - Check callback URL matches staging URL

4. **Test authentication:**
   - Try accessing `/api/auth/signin` 
   - Should show Google sign-in option
   - Complete sign-in flow
   - Then try sending email again

