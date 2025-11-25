# Meta Ads Setup Guide

## Step-by-Step Configuration

### Step 1: Configure the Marketing API Use Case

1. **Click on the first item in "App customization and requirements" section:**
   - "Customize the Create & manage ads with Marketing API use case"
   - This will take you to the Marketing API configuration page

2. **On the Marketing API setup page:**
   - Enable the Marketing API product if not already enabled
   - Make sure you're using the "Create & manage ads" use case

### Step 2: Configure OAuth Redirect URIs

1. **Go to App Settings:**
   - In the left sidebar, click on **"App settings"** (gear icon)
   - Click on **"Basic"** in the submenu

2. **Add OAuth Redirect URIs:**
   - Scroll down to **"Valid OAuth Redirect URIs"**
   - Click **"Add URI"** and add these URLs (one at a time):
     - `http://localhost:3000/api/meta-ads/callback` (for local development)
     - `https://staging.zyyp.ai/api/meta-ads/callback` (for staging, if applicable)
     - `https://www.zyyp.ai/api/meta-ads/callback` (for production)
   - Click **"Save changes"** after adding each URI

### Step 3: Get App Credentials

1. **In App Settings > Basic:**
   - Find **"App ID"** - copy this value (you'll need it for `META_ADS_APP_ID`)
   - Find **"App Secret"** - click "Show" to reveal it, then copy it (you'll need it for `META_ADS_APP_SECRET`)
   - ⚠️ Keep these secure! Don't commit them to version control.

### Step 4: Add Required Permissions

1. **Go to "App settings" → "Advanced":**
   - Scroll to **"Permissions and Features"** section
   - Click **"Add Permissions"** and ensure these are added:
     - `ads_read` - Read ads data
     - `ads_management` - Manage ads (optional, but recommended)

2. **Important Notes:**
   - For **development/test mode**, you can add any permissions without App Review
   - For **production**, you'll need to submit for App Review
   - Meta will require a video demonstration and explanation of how you use these permissions

### Step 5: Test the Integration (Development Mode)

1. **Before going to production:**
   - You can test with your own Meta account in development mode
   - Add yourself as a **"Test User"** or **"Developer"** in **"App roles"** (left sidebar)

2. **Test the OAuth flow:**
   - In your Zyyp app, go to `/integrations`
   - Click "Connect Meta Ads"
   - You should be redirected to Meta's OAuth consent screen
   - Grant permissions and complete the flow

### Step 6: Set Environment Variables

Add these to your `.env` file (local) and Vercel/Railway (staging/production):

```bash
# Meta Ads OAuth
META_ADS_APP_ID=your-app-id-here
META_ADS_APP_SECRET=your-app-secret-here
# META_ADS_REDIRECT_URI is optional - it will be auto-constructed if not set
```

### Step 7: Submit for App Review (Production Only)

1. **Before publishing:**
   - Go to **"App Review"** → **"Permissions and Features"**
   - Submit `ads_read` and `ads_management` for review
   - Provide:
     - **Use case description**: "Zyyp allows users to connect their Meta Ads accounts to view ad performance analytics including spend, clicks, conversions, and ROAS on their dashboard."
     - **Video demonstration**: Show the OAuth flow and how you display ad data
     - **Screencast**: Walk through connecting an account and viewing insights
   - **Data access justification**: Explain that you only read ad performance data to display analytics to users

2. **After approval:**
   - You can publish your app (button in left sidebar)
   - Users will be able to connect their Meta Ads accounts

## Troubleshooting

### "Invalid OAuth Redirect URI" error

- Verify the redirect URI matches exactly what you configured in App Settings
- Check that the URI includes `/api/meta-ads/callback` path
- Ensure there are no trailing slashes

### "App Not Setup: This app is still in development mode" error

- Add the user as a Test User or Developer in "App roles"
- Or submit for App Review and wait for approval

### "Insufficient permissions" error

- Verify `ads_read` permission is added in App Settings > Advanced
- Check that you granted permissions during OAuth flow
- For production, ensure permissions are approved in App Review

## Quick Checklist

- [ ] Marketing API use case configured
- [ ] OAuth redirect URIs added (localhost, staging, production)
- [ ] App ID and App Secret copied
- [ ] `ads_read` permission added
- [ ] Environment variables set (`META_ADS_APP_ID`, `META_ADS_APP_SECRET`)
- [ ] Tested OAuth flow in development mode
- [ ] Submitted for App Review (if going to production)
- [ ] Added test users (for development testing)

## Next Steps

After completing the setup:

1. Test the integration locally with your Meta account
2. Deploy to staging and test there
3. Submit for App Review if ready for production
4. Monitor the integration via Sentry for any errors
