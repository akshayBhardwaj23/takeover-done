# Shopify App Store Submission Checklist

Complete checklist for submitting ZYYP AI to the Shopify App Store.

---

## Pre-Submission Requirements

### ✅ 1. Compliance Webhooks (MANDATORY)

**Status:** ✅ Implemented

All three mandatory compliance webhooks are implemented and configured:

- ✅ `customers/data_request` - Provide customer data
- ✅ `customers/redact` - Delete customer data
- ✅ `shop/redact` - Delete shop data

**File:** `/apps/web/app/api/webhooks/shopify/compliance/route.ts`  
**Config:** `/apps/web/shopify.app.toml`  
**Docs:** [SHOPIFY_COMPLIANCE_WEBHOOKS.md](./SHOPIFY_COMPLIANCE_WEBHOOKS.md)

**Endpoint:** `https://www.zyyp.ai/api/webhooks/shopify/compliance`

---

### ✅ 2. App Listing Content

#### App Name

**ZYYP AI** (or **ZYYP AI Support**)

#### Tagline (max 70 characters)

"AI-Powered Customer Support Automation for E-Commerce"

#### Short Description (max 120 characters)

"Automate customer support with AI. Smart email replies, order matching, and analytics - all powered by AI."

#### Full Description

```
Transform Your Customer Support with AI

ZYYP AI automates your customer support workflow end-to-end:

✅ AI-Powered Email Responses
• Automatically generate personalized replies
• Context-aware responses using order data
• Professional, empathetic tone
• OpenAI GPT-4 powered

✅ Smart Order Matching
• Automatic email-to-order correlation
• Order number detection in emails
• Customer history tracking
• Unified inbox view

✅ Powerful Analytics
• AI Support Analytics (response time, ROI, CSAT)
• Shopify Business Analytics (revenue, orders, customers)
• 7-day trend visualizations
• Real-time metrics

✅ Automation Playbooks
• 8 pre-built automation workflows
• No-code playbook builder
• AI-powered execution
• Refunds, exchanges, re-engagement

✅ Email Management
• Per-store email aliases
• Mailgun integration
• Custom support email configuration
• Environment-specific routing

✅ Multi-Tenant & Secure
• Complete data isolation
• Rate limiting
• HMAC verification
• Encrypted tokens

PERFECT FOR:
• Shopify store owners who spend hours on support emails
• Growing brands scaling customer service
• Stores wanting to improve response times
• Merchants seeking data-driven support insights

PRICING:
• Free Trial: 50 emails/month
• Starter: 500 emails/month
• Growth: 2000 emails/month
• Pro: 10,000 emails/month

GET STARTED:
1. Install the app
2. Connect your Shopify store
3. Set up email forwarding
4. Let AI handle customer support

Reduce response time by 60%+ and improve customer satisfaction with automated, context-aware support.
```

---

### ✅ 3. Screenshots & Media

#### Required Screenshots (at least 3, max 10)

1. **Dashboard/Inbox View**
   - Show orders list and email matches
   - Highlight AI suggestions
   - Caption: "Unified inbox with AI-powered reply suggestions"

2. **Analytics Dashboard**
   - Show AI Support Analytics
   - Display metrics and charts
   - Caption: "Track response time, ROI, and customer satisfaction"

3. **Shopify Business Analytics**
   - Show revenue and order metrics
   - Display trend charts
   - Caption: "Monitor store performance and growth metrics"

4. **Integrations Page**
   - Show connected stores
   - Email alias setup
   - Caption: "Easy setup with one-click Shopify integration"

5. **Automation Playbooks** (Optional)
   - Show playbook builder
   - Default playbooks list
   - Caption: "Automate repetitive tasks with AI-powered playbooks"

**Dimensions:** 1280x720px (16:9 ratio)  
**Format:** PNG or JPG  
**Max File Size:** 5MB per image

#### Demo Video (Recommended)

**URL:** https://youtu.be/fZm8VUrT1Bs (your screencast URL)

**Video Requirements:**

- Length: 3-8 minutes
- Show onboarding flow
- Demonstrate main features
- Include merchant and customer perspectives
- No loud background noise
- Professional quality

**DO:**

- Demonstrate main features
- Show customer flow and merchant flow
- Aim for 3-8 minute video

**DON'T:**

- Include loud background noises

---

### ✅ 4. Testing Instructions

```
Testing Instructions for ZYYP AI Support Platform

PREREQUISITES:
- Test store URL: [Your development store URL]
- The app requires email setup which we'll configure during testing

STEP-BY-STEP TESTING:

1. Install the App
   - Click "Add app" from the Shopify App Store
   - Approve the requested permissions (read_orders, read_customers)
   - You'll be redirected to https://www.zyyp.ai

2. Sign In
   - Click "Sign In with Google"
   - Use any Google account for testing
   - You'll be redirected to the Integrations page

3. Connect Your Shopify Store
   - The store should already be connected from step 1
   - Verify your store appears in "Connected Stores" section
   - Click "Open Inbox" button for your store

4. View Inbox & Orders
   - You'll see your store's orders in the left panel
   - Click any order to view full details
   - Click "Refresh from Shopify" to sync latest order data
   - Verify order information displays correctly

5. Test AI Reply Generation (Optional - requires order with email)
   - Select an order with a customer email
   - Enter a test message in "Customer Message" field (e.g., "Where is my order?")
   - Click "Generate AI Reply"
   - Review the AI-generated response
   - Note: Actual email sending requires Mailgun setup (handled by us)

6. View Analytics Dashboards
   - Navigate to "Support Analytics" from the header
   - Verify metrics display (may show zero if no data yet)
   - Navigate to "Business Analytics" from the header
   - Select your store from dropdown
   - Verify revenue, orders, and customer metrics display

7. Check Email Integration Setup (View Only)
   - Return to "Integrations" page
   - Scroll to "Custom Email Integration" section
   - Note: Email alias creation is available but not required for review
   - This shows how merchants would set up email forwarding

EXPECTED BEHAVIOR:
- OAuth flow completes without errors
- Orders sync from your Shopify store
- Analytics display store metrics
- AI reply generation works with OpenAI integration
- All pages load without errors

NOTES:
- Full email functionality requires Mailgun configuration (managed by us)
- AI suggestions require OpenAI API (configured in our backend)
- The app is read-only for your store data (no modifications made during testing)
- Free trial includes 50 emails/month limit

For any issues during testing, contact: hello@zyyp.ai
```

---

### ✅ 5. App Capabilities

**Select:** ✅ **Connector**

**Justification:**
"ZYYP connects merchant Shopify data (orders, customers, order status) with our AI-powered customer support platform. The app syncs order information and provides automated customer support services including AI reply generation, email management, and support analytics based on the merchant's Shopify data."

**Do NOT select:**

- ❌ Embedded (not using App Bridge)
- ❌ Online store (not modifying theme)
- ❌ Payments (not processing payments)
- ❌ Others (not applicable)

---

### ✅ 6. Privacy & Data Handling

#### Privacy Policy URL

`https://www.zyyp.ai/privacy-policy`

**Must include:**

- Data collection practices
- How customer data is used
- Data retention policy
- Third-party services (OpenAI, Mailgun)
- User rights (access, deletion)
- Contact information

#### GDPR Compliance

- ✅ Compliance webhooks implemented
- ✅ Data deletion on request
- ✅ Data export on request
- ✅ 30-day response timeline

---

### ✅ 7. Support & Contact

#### Support Email

`hello@zyyp.ai`

#### Support URL (Optional)

`https://www.zyyp.ai/support`

#### Documentation URL (Optional)

`https://docs.zyyp.ai` or link to GitHub docs

---

### ✅ 8. Pricing

#### Free Trial

- **Plan:** TRIAL
- **Emails:** 50/month
- **Duration:** Indefinite (until upgraded)
- **Features:** All features included

#### Paid Plans

**Starter - $19/month**

- 500 emails/month
- 1 store
- AI-powered replies
- Email management
- Basic analytics

**Growth - $49/month**

- 2,000 emails/month
- 3 stores
- All Starter features
- Advanced analytics
- Automation playbooks
- Priority support

**Pro - $99/month**

- 10,000 emails/month
- 10 stores
- All Growth features
- Custom playbooks
- Dedicated support
- API access (future)

---

### ✅ 9. Scopes & Permissions

#### Required Scopes

- `read_orders` - Read order data for AI context
- `read_customers` - Read customer email for support

#### Optional Scopes (Future)

- `write_orders` - For refund/cancel actions
- `write_customers` - For customer updates

---

### ✅ 10. Technical Requirements

#### HTTPS

✅ All endpoints use HTTPS with valid SSL

#### Webhooks

✅ All webhooks verify HMAC signatures

#### Response Times

✅ API responds within 3 seconds

#### Error Handling

✅ Graceful error messages to users

#### Rate Limiting

✅ Respects Shopify API rate limits

---

## Deployment Checklist

### Production Environment

- [ ] Deploy compliance webhook endpoint
- [ ] Verify HTTPS and SSL certificate
- [ ] Test all three compliance webhooks
- [ ] Verify `SHOPIFY_API_SECRET` is set
- [ ] Test OAuth flow end-to-end
- [ ] Verify webhook HMAC verification works
- [ ] Check all environment variables are set
- [ ] Test with real Shopify store
- [ ] Monitor error logs (Sentry)
- [ ] Load test critical endpoints

### Shopify Partners Dashboard

- [ ] Create app listing
- [ ] Upload screenshots (3-10 images)
- [ ] Add demo video URL
- [ ] Fill in testing instructions
- [ ] Select "Connector" capability
- [ ] Add privacy policy URL
- [ ] Add support email
- [ ] Configure pricing plans
- [ ] Verify compliance webhooks registered
- [ ] Request protected customer data access (if needed)

### Documentation

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support documentation ready
- [ ] API documentation complete (if public)

---

## Submission Process

### Step 1: Configure App in Partners Dashboard

1. Go to Shopify Partners → Apps → Your App
2. Navigate to "App listing"
3. Fill in all required fields (see above)
4. Save as draft

### Step 2: Test App Submission

1. Use "Test on development stores"
2. Install on your own test store
3. Complete full user journey
4. Fix any issues found

### Step 3: Submit for Review

1. Click "Submit app for review"
2. Wait for automated checks to pass
3. Shopify will review within 5-7 business days
4. Address any feedback from reviewers

### Step 4: Post-Approval

1. Set pricing
2. Publish to App Store
3. Monitor for reviews
4. Respond to user feedback

---

## Common Rejection Reasons

### ❌ Compliance Webhooks Missing

**Fix:** Ensure all three webhooks are implemented and responding

### ❌ Broken OAuth Flow

**Fix:** Test OAuth with multiple stores, handle errors gracefully

### ❌ Poor Testing Instructions

**Fix:** Provide step-by-step guide, mention any limitations

### ❌ Missing Screenshots

**Fix:** Add at least 3 high-quality screenshots showing main features

### ❌ Unclear Value Proposition

**Fix:** Clearly explain what problem the app solves

### ❌ Privacy Policy Issues

**Fix:** Ensure privacy policy is comprehensive and accessible

---

## Post-Submission Monitoring

### Week 1

- [ ] Monitor Sentry for errors
- [ ] Check user feedback
- [ ] Respond to reviews
- [ ] Fix critical bugs

### Month 1

- [ ] Analyze usage metrics
- [ ] Gather user feedback
- [ ] Plan feature improvements
- [ ] Optimize performance

---

## Support Resources

- [Shopify App Review Requirements](https://shopify.dev/docs/apps/launch/review-requirements)
- [Shopify Partners Support](https://partners.shopify.com/support)
- [App Store Listing Best Practices](https://shopify.dev/docs/apps/launch/listing)

---

**Status:** ✅ Ready for Submission  
**Last Updated:** 2024-11-13  
**Next Steps:** Configure listing in Partners Dashboard → Submit for review
