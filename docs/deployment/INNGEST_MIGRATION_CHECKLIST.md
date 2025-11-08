# Inngest Migration Checklist - Step by Step

## ✅ What's Already Done

- ✅ Inngest code created (functions, client, API route)
- ✅ Email webhook updated to use Inngest
- ✅ Package.json updated with Inngest dependency

## 🎯 Next Steps (Do These Now)

### Step 1: Install Dependencies (2 minutes)

```bash
cd apps/web
pnpm install
```

This installs the `inngest` package.

### Step 2: Create Inngest Account & Get Event Key (3 minutes)

1. Go to https://www.inngest.com
2. Sign up with GitHub/Google (free)
3. Click **"Create App"**
   - Name: `ai-ecom-tool` (or your choice)
   - Framework: **Next.js**
4. After creating, go to **Settings** (gear icon) → **Keys**
5. Copy the **Event Key** (looks like `signkey-prod-xxxxx`)

### Step 3: Add Environment Variable to Vercel (2 minutes)

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key:** `INNGEST_EVENT_KEY`
   - **Value:** Paste the Event Key from Step 2
   - **Environment:** Select **Preview** (and **Production** if you want)
5. Click **Save**

### Step 4: Deploy to Vercel (5 minutes)

1. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: migrate to Inngest for background jobs"
   git push
   ```

2. Vercel will automatically deploy
   - Or trigger manually: Vercel Dashboard → Deployments → Redeploy

3. Wait for deployment to complete

### Step 5: Sync Inngest Functions (2 minutes)

1. Go to **Inngest Dashboard** → Your App
2. Click **"Apps"** in sidebar (or **"Sync"** button)
3. Click **"Sync"** or **"Discover Functions"**
4. Inngest will discover your functions at:
   - `https://www.zyyp.ai/api/inngest`

5. You should see:
   - ✅ Function discovered: `process-inbound-email`
   - ✅ Status: Active

### Step 6: Test the Migration (5 minutes)

1. **Send a test email** to your Mailgun alias
2. **Check Vercel logs:**
   - Go to Vercel → Your Project → **Logs**
   - Look for: `[Email Webhook] Triggered Inngest event for message...`

3. **Check Inngest dashboard:**
   - Go to Inngest Dashboard → **Runs**
   - You should see a new run for `email/inbound.process`
   - Click on it to see execution details

4. **Verify AI suggestion:**
   - Check your dashboard/app
   - The AI suggestion should appear (same as before)

### Step 7: Stop Railway Worker (Optional - After Testing)

Once you've verified Inngest is working:

1. Go to **Railway Dashboard**
2. Find your worker service
3. Click **Settings** → **Pause** (or delete if you're confident)

**Why:** The Railway worker is no longer needed and will continue polling Redis unnecessarily.

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Inngest functions are synced (dashboard shows functions)
- [ ] Test email triggers Inngest event (check Vercel logs)
- [ ] Inngest processes the job (check Inngest dashboard → Runs)
- [ ] AI suggestion appears in your app
- [ ] Redis usage drops (check Upstash dashboard - should be near zero)

## 🐛 Troubleshooting

### Issue: "Inngest not receiving events"

**Check:**
- `INNGEST_EVENT_KEY` is set in Vercel environment variables
- Event key is correct (copy-paste from Inngest dashboard)
- Redeploy Vercel after adding environment variable

**Fix:**
- Re-add environment variable
- Redeploy Vercel

### Issue: "Functions not syncing"

**Check:**
- Vercel deployment is successful
- `/api/inngest` route exists (check Vercel logs)
- Inngest app is synced (dashboard → Apps → Sync)

**Fix:**
- Wait a few minutes and try syncing again
- Check Vercel deployment logs for errors

### Issue: "Functions not running"

**Check:**
- Inngest dashboard → Runs (see if events are received)
- Vercel logs for errors
- Function code for syntax errors

**Fix:**
- Check Inngest dashboard → Runs → Click on failed run for error details
- Check function logs in Inngest dashboard

## 📊 Expected Results

**Before Migration:**
- Redis: ~260K commands/month
- Railway: Always-on worker running
- Cost: Railway hosting + Redis usage

**After Migration:**
- Redis: ~1-2K commands/month (only webhook idempotency)
- Railway: Not needed
- Cost: Free (Inngest free tier + minimal Redis)

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Inngest dashboard shows functions synced
2. ✅ Test email triggers Inngest event (see in Runs)
3. ✅ AI suggestion appears in your app
4. ✅ Redis usage drops dramatically
5. ✅ No errors in Vercel or Inngest logs

## 📝 Summary

**Total time:** ~20 minutes
**Difficulty:** Easy (mostly copy-paste)
**Result:** Zero Redis polling, free background jobs, no Railway needed

---

**Need help?** Check the main [INNGEST_SETUP.md](./INNGEST_SETUP.md) guide for more details.

