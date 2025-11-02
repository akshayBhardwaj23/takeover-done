# Usage Limits & Billing Implementation

## Overview

This document describes the usage limits and billing system that has been implemented. The system tracks email volume per plan, shows upgrade prompts when approaching limits, and provides a comprehensive usage dashboard.

## What Was Implemented

### 1. Database Schema

- **Subscription Model**: Tracks user subscriptions with plan type, status, and billing periods
- **UsageRecord Model**: Tracks usage metrics (emails sent, received, AI suggestions) per billing period
- **Plan Types**: TRIAL, STARTER, GROWTH, PRO, ENTERPRISE

### 2. Plan Limits

| Plan       | Price/Month | Emails/Month | Stores    | Target Audience                      |
| ---------- | ----------- | ------------ | --------- | ------------------------------------ |
| TRIAL      | Free        | 100          | 1         | New users (14 days)                  |
| STARTER    | $29         | 500          | 1         | Small stores (<50 orders/month)      |
| GROWTH     | $99         | 2,500        | 3         | Growing stores (50-200 orders/month) |
| PRO        | $299        | 10,000       | 10        | Agencies & large stores              |
| ENTERPRISE | Custom      | Unlimited    | Unlimited | Large enterprises                    |

### 3. Features Implemented

#### Usage Tracking

- ✅ Automatic tracking when emails are sent
- ✅ Per-user subscription management
- ✅ Monthly billing period tracking
- ✅ Usage history (last 6 months)

#### Limit Enforcement

- ✅ Hard limits: Blocks email sending at 100% usage
- ✅ Soft warnings: Shows upgrade prompts at 80% usage
- ✅ Real-time usage checking before email send
- ✅ Error messages when limit reached

#### UI Components

- ✅ Usage Dashboard (`/usage`) - Comprehensive usage overview
- ✅ Upgrade Prompt Component - Reusable component for warnings
- ✅ Inbox Integration - Shows usage warnings in email composer
- ✅ Usage History - Visual display of past usage

## How to Use

### For Users

1. **View Usage Dashboard**
   - Navigate to `/usage` page
   - See current plan, usage stats, and history
   - View available plans for upgrading

2. **Monitor Usage in Inbox**
   - Usage warnings appear automatically at 80% usage
   - Upgrade prompts show when approaching limits
   - Email send button disabled when limit reached

3. **Upgrade Flow**
   - Click "Upgrade" buttons in prompts or dashboard
   - View available plans with features
   - (Note: Payment integration coming in Phase 2)

### For Developers

#### Checking Usage Before Sending Email

```typescript
// Already implemented in actionApproveAndSend and sendUnassignedReply
const limitCheck = await canSendEmail(userId);
if (!limitCheck.allowed) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Email limit reached. Please upgrade.',
  });
}
```

#### Tracking Email Usage

```typescript
import { incrementEmailSent } from '@ai-ecom/db';

// After successfully sending email
await incrementEmailSent(userId);
```

#### Getting Usage Summary

```typescript
import { getUsageSummary } from '@ai-ecom/db';

const summary = await getUsageSummary(userId);
// Returns: planType, emailsSent, emailLimit, usagePercentage, etc.
```

#### tRPC Endpoints

- `getUsageSummary` - Get current usage stats
- `getUsageHistory` - Get usage history (last 6 months)
- `checkEmailLimit` - Check if user can send email
- `getAvailablePlans` - List all available plans

## Database Migration

Run the migration to add subscription tables:

```bash
cd packages/db
npx prisma migrate deploy  # or prisma migrate dev for development
```

This will create:

- `Subscription` table
- `UsageRecord` table
- `PlanType` enum

## Default Behavior

- **New Users**: Automatically get a TRIAL subscription (14 days, 100 emails)
- **Trial Expiry**: After trial, subscription status becomes inactive (limits enforced)
- **Billing Periods**: Monthly billing cycles, usage resets at period end
- **Usage Tracking**: Happens automatically when emails are sent

## Pricing Strategy

See `docs/PRICING_STRATEGY.md` for detailed profitability analysis:

- **Margins**: 85-90% profit margins
- **Break-even**: ~17 paying customers at Starter plan
- **Target Revenue**: $5,300 MRR with 100 customers (conservative mix)

## Next Steps (Phase 2)

To complete the billing system:

1. **Payment Integration**
   - Integrate Stripe for payments
   - Create checkout flow
   - Handle webhooks for subscription updates

2. **Automated Billing**
   - Auto-renewal logic
   - Invoice generation
   - Payment failure handling

3. **Trial Management**
   - Auto-convert trials to paid plans
   - Email reminders before trial expiry
   - Grace period after trial ends

4. **Admin Features**
   - Manual plan upgrades/downgrades
   - Usage monitoring dashboard
   - Customer support tools

## Testing

### Manual Testing Checklist

- [ ] Create new user → Should get TRIAL subscription
- [ ] Send emails → Usage should increment
- [ ] Reach 80% usage → Should see upgrade prompt
- [ ] Reach 100% usage → Should block email sending
- [ ] View usage dashboard → Should show accurate stats
- [ ] Check usage history → Should show past periods

### Test Scenarios

1. **Trial User**
   - Starts with 100 email limit
   - Should see "Free Trial" badge
   - Usage warnings at 80 emails

2. **Starter Plan User**
   - 500 email limit
   - Should see upgrade prompt at 400 emails
   - Should block at 500 emails

3. **Enterprise User**
   - Unlimited emails
   - No limits enforced
   - No upgrade prompts shown

## Troubleshooting

### Users not getting subscriptions

- Check if `ensureSubscription()` is called on user creation
- Verify database migration ran successfully

### Usage not incrementing

- Check if `incrementEmailSent()` is called after email send
- Verify email send is successful (not just attempted)

### Limits not enforcing

- Verify `canSendEmail()` is called before sending
- Check subscription status is "active"
- Ensure billing period is correct

## Files Modified/Created

### Created Files

- `packages/db/src/usage.ts` - Usage tracking functions
- `packages/db/prisma/migrations/20251025120000_add_subscriptions_and_usage/migration.sql` - Database migration
- `apps/web/app/usage/page.tsx` - Usage dashboard page
- `apps/web/components/UpgradePrompt.tsx` - Reusable upgrade component
- `docs/PRICING_STRATEGY.md` - Pricing recommendations
- `docs/USAGE_LIMITS_IMPLEMENTATION.md` - This file

### Modified Files

- `packages/db/prisma/schema.prisma` - Added Subscription and UsageRecord models
- `packages/db/src/index.ts` - Exported usage functions
- `packages/api/src/index.ts` - Added usage endpoints and limit checks
- `apps/web/app/inbox/page.tsx` - Added usage warnings and limit checking

## Support

For questions or issues, refer to:

- PRD: `PRD.md`
- Architecture: `docs/ARCHITECTURE.md`
- Data Model: `docs/DATA_MODEL.md`

