# Inngest Quick Setup - Skip Dev Server (Vercel Deployment)

## You're on the Onboarding Screen - Here's What to Do

### Option 1: Skip Dev Server (Recommended for Vercel)

On the Inngest onboarding screen, look for:
- **"I already have an Inngest app"** button (usually at the bottom)
- Or click **"Next"** to skip the Dev Server step
- Or navigate to **Apps** in the sidebar → **Create App** manually

### Option 2: Get Event Key Directly

You don't need the Dev Server for Vercel deployment. Instead:

1. **Skip the onboarding** (click "I already have an Inngest app" or navigate away)

2. **Go to Settings** → **Keys**:
   - Click on your profile/name in top right
   - Go to **Settings** → **Keys**
   - Copy the **Event Key** (starts with `signkey-`)

3. **Add to Vercel**:
   - Vercel → Your Project → Settings → Environment Variables
   - Add: `INNGEST_EVENT_KEY` = your Event Key
   - Environment: Preview

4. **Deploy your code**:
   ```bash
   git add .
   git commit -m "feat: migrate to Inngest"
   git push
   ```

5. **After deployment, sync functions**:
   - Inngest Dashboard → **Apps** → **Create App** or **Add App**
   - Or wait for auto-discovery after deployment
   - Your endpoint will be: `https://your-app.vercel.app/api/inngest`

## Alternative: Complete Onboarding Later

If you want to test locally first:
1. Click **"Next"** to proceed through onboarding
2. Set up Dev Server locally (optional)
3. But for production, you'll still sync to Vercel after deployment

## What You Actually Need Right Now

For Vercel deployment, you only need:
1. ✅ **Event Key** (from Settings → Keys)
2. ✅ **Add to Vercel environment variables**
3. ✅ **Deploy code** (already done)
4. ✅ **Sync app** (after deployment)

**You don't need the Dev Server for Vercel!**

## Quick Path

1. **Skip onboarding** → Go to **Settings** → **Keys** → Copy Event Key
2. **Add to Vercel** → Environment Variables → `INNGEST_EVENT_KEY`
3. **Deploy** → `git push` (code is ready)
4. **Sync** → Inngest Dashboard → Apps → Sync after deployment

That's it! The Dev Server is only needed for local testing, not for Vercel deployment.

