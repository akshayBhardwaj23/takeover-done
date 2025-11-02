# Razorpay Integration Setup Guide

## Overview

This guide will help you set up Razorpay for subscription billing in your SaaS application.

## Prerequisites

1. Razorpay account (sign up at https://razorpay.com)
2. Business documents for KYC verification
3. Bank account details for settlement

## Step 1: Create Razorpay Account

1. Go to https://razorpay.com and sign up
2. Complete business verification (KYC)
   - Typically takes 1-2 business days
   - You'll need: Business PAN, Bank details, Address proof
3. Once verified, you'll get access to Dashboard

## Step 2: Get API Keys

1. Go to Razorpay Dashboard → Settings → API Keys
2. Generate Test API Keys (for development)
3. Generate Live API Keys (for production)
4. Save both Key ID and Key Secret securely

## Step 3: Create Subscription Plans in Razorpay

You need to create plans in Razorpay dashboard that match your pricing:

### Option A: Create via Dashboard (Recommended)

1. Go to Dashboard → Products → Plans
2. Create 3 plans:

   **Starter Plan**
   - Plan Name: "Starter Plan"
   - Amount: ₹29/month (2900 paise)
   - Interval: Monthly
   - Billing Cycles: 12
   - Notes: `planType: STARTER, emailsPerMonth: 500`

   **Growth Plan**
   - Plan Name: "Growth Plan"
   - Amount: ₹99/month (9900 paise)
   - Interval: Monthly
   - Billing Cycles: 12
   - Notes: `planType: GROWTH, emailsPerMonth: 2500`

   **Pro Plan**
   - Plan Name: "Pro Plan"
   - Amount: ₹299/month (29900 paise)
   - Interval: Monthly
   - Billing Cycles: 12
   - Notes: `planType: PRO, emailsPerMonth: 10000`

3. Copy the Plan IDs (starts with `plan_`)
4. Update environment variables with these Plan IDs

### Option B: Create Programmatically

You can use the `createPlan` function from `packages/api/src/payments/razorpay.ts`:

```typescript
import { createPlan } from '@ai-ecom/api/payments/razorpay';

// Create Starter plan
await createPlan('STARTER', 29, 'monthly');

// Create Growth plan
await createPlan('GROWTH', 99, 'monthly');

// Create Pro plan
await createPlan('PRO', 299, 'monthly');
```

## Step 4: Set Up Webhooks

1. Go to Dashboard → Settings → Webhooks
2. Add Webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Subscribe to these events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.updated`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.paused`
   - `subscription.resumed`
   - `payment.failed`
4. Copy the Webhook Secret
5. Add to environment variables

## Step 5: Environment Variables

Add these to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx  # Test key for development
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx  # Test secret for development
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx  # Webhook secret

# Razorpay Plan IDs (update after creating plans)
RAZORPAY_PLAN_STARTER=plan_starter_xxxxxxxx
RAZORPAY_PLAN_GROWTH=plan_growth_xxxxxxxx
RAZORPAY_PLAN_PRO=plan_pro_xxxxxxxx
```

For production:

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_PLAN_STARTER=plan_starter_xxxxxxxx
RAZORPAY_PLAN_GROWTH=plan_growth_xxxxxxxx
RAZORPAY_PLAN_PRO=plan_pro_xxxxxxxx
```

## Step 6: Database Migration

Run the migration to add payment fields to Subscription model:

```bash
cd packages/db
npx prisma migrate dev --name add_razorpay_payment_fields
```

Or if using production database:

```bash
npx prisma migrate deploy
```

## Step 7: Testing

### Test the Integration

1. **Test Checkout Flow:**
   - Visit `/usage` page
   - Click "Upgrade" on any plan
   - Should redirect to Razorpay test checkout
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry date, any CVV

2. **Test Webhook:**
   - Use Razorpay's webhook testing tool
   - Send test events to your webhook endpoint
   - Check database for subscription updates

3. **Test Subscription Events:**
   - Complete a test subscription
   - Verify webhook receives events
   - Check subscription status updates in database

### Test Cards

Razorpay provides test cards for different scenarios:

- **Success**: `4111 1111 1111 1111`
- **Failure**: `4000 0000 0000 0002`
- **3D Secure**: `4012 0010 3714 1112`

Use any future expiry date and any CVV.

## Step 8: Production Checklist

Before going live:

- [ ] Switch to Live API keys
- [ ] Update webhook URL to production domain
- [ ] Verify webhook signature verification works
- [ ] Test complete subscription flow
- [ ] Set up monitoring/alerts for failed payments
- [ ] Configure email notifications in Razorpay
- [ ] Test subscription cancellation flow
- [ ] Verify subscription renewal works
- [ ] Set up proper error logging

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify webhook secret matches
3. Check Razorpay dashboard for webhook delivery logs
4. Ensure webhook endpoint returns 200 status

### Subscription Creation Fails

1. Verify API keys are correct
2. Check plan IDs match Razorpay dashboard
3. Ensure customer creation succeeds
4. Check error logs for specific Razorpay error messages

### Payment Fails

1. Check if subscription is in correct status
2. Verify customer payment method is valid
3. Check Razorpay dashboard for payment details
4. Review webhook events for payment.failed

## Support Resources

- Razorpay Docs: https://razorpay.com/docs/
- Subscription API: https://razorpay.com/docs/api/subscriptions/
- Webhooks: https://razorpay.com/docs/webhooks/
- Support: support@razorpay.com

## Next Steps

After Razorpay is set up:

1. Implement Paddle for international customers (optional)
2. Add payment failure recovery logic
3. Set up subscription renewal reminders
4. Add subscription upgrade/downgrade flows
5. Implement usage-based billing features

