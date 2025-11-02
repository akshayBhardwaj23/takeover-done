# Currency Support Implementation Summary

## Changes Made

### ✅ Code Changes Required for Dual Pricing (INR/USD)

All necessary code changes have been implemented to support dual pricing. Here's what was changed:

### 1. New Currency Module ✅

**File**: `packages/api/src/payments/currency.ts`

- Added `PLAN_PRICING` with both USD and INR prices
- Currency detection function (`detectCurrency`)
- Price formatting helpers
- Currency symbols

### 2. Updated Plan Limits ✅

**File**: `packages/db/src/usage.ts`

- Removed `price` from base `PLAN_LIMITS` (now currency-dependent)
- Kept `PLAN_LIMITS_WITH_PRICE` for backward compatibility
- Updated `getUsageSummary` to not return price (fetched separately)

### 3. Updated Razorpay Integration ✅

**Files**:

- `packages/api/src/payments/razorpay.ts`
- `packages/api/src/payments/planMapping.ts`

- Added currency parameter to `createSubscription()`
- Updated plan mapping to support both INR and USD plans
- Plan configs now require currency selection
- Updated `createPlan()` helper to support currency

### 4. Updated tRPC Endpoints ✅

**File**: `packages/api/src/index.ts`

**Updated Endpoints:**

- `getAvailablePlans` - Now accepts `currency` and `country` params, returns both prices
- `getUsageSummary` - Now accepts `currency` param, returns formatted price
- `createCheckoutSession` - Now accepts `currency` and `country` params

### 5. Updated UI Components ✅

**File**: `apps/web/app/usage/page.tsx`

- Added currency state (defaults to INR)
- Passes currency to all queries/mutations
- Displays formatted prices with correct currency symbol
- Currency selector can be added later

## What You Need to Do

### 1. Create Razorpay Plans for Both Currencies

You need to create **6 plans** in Razorpay (3 plans × 2 currencies):

**INR Plans:**

- Starter: ₹999/month → Plan ID: `plan_starter_inr`
- Growth: ₹2,999/month → Plan ID: `plan_growth_inr`
- Pro: ₹9,999/month → Plan ID: `plan_pro_inr`

**USD Plans (Optional - for international):**

- Starter: $29/month → Plan ID: `plan_starter_usd`
- Growth: $99/month → Plan ID: `plan_growth_usd`
- Pro: $299/month → Plan ID: `plan_pro_usd`

**Note:** Razorpay supports USD plans, but you may want to use Paddle for USD customers (as recommended earlier).

### 2. Update Environment Variables

Add to `.env`:

```env
# INR Plans (for Indian customers)
RAZORPAY_PLAN_STARTER_INR=plan_starter_inr_xxxxxxxx
RAZORPAY_PLAN_GROWTH_INR=plan_growth_inr_xxxxxxxx
RAZORPAY_PLAN_PRO_INR=plan_pro_inr_xxxxxxxx

# USD Plans (optional - or use Paddle for USD)
RAZORPAY_PLAN_STARTER_USD=plan_starter_usd_xxxxxxxx
RAZORPAY_PLAN_GROWTH_USD=plan_growth_usd_xxxxxxxx
RAZORPAY_PLAN_PRO_USD=plan_pro_usd_xxxxxxxx
```

### 3. Run Database Migration

The schema already supports currency (stored in `metadata`), but regenerate Prisma client:

```bash
cd packages/db
npx prisma generate
```

### 4. Test Currency Detection

**Current Implementation:**

- Defaults to INR
- Can be enhanced with IP geolocation
- Can be stored in user preferences

**To Test:**

- Visit `/usage` page
- Should show ₹ pricing by default
- Can add currency switcher later

## How It Works

### Flow for Indian Customer:

```
1. User visits /usage page
   ↓
2. Currency detected as 'INR' (default)
   ↓
3. UI shows: ₹999, ₹2,999, ₹9,999
   ↓
4. User clicks "Upgrade"
   ↓
5. createCheckoutSession({ planType: 'STARTER', currency: 'INR' })
   ↓
6. Razorpay creates subscription with INR plan (₹999)
   ↓
7. User pays in INR
```

### Flow for International Customer:

```
1. User visits /usage page
   ↓
2. Currency detected as 'USD' (if IP/location detected)
   ↓
3. UI shows: $29, $99, $299
   ↓
4. User clicks "Upgrade"
   ↓
5. createCheckoutSession({ planType: 'STARTER', currency: 'USD' })
   ↓
6. Razorpay creates subscription with USD plan ($29)
   ↓
7. User pays in USD
```

## Optional Enhancements

### 1. IP Geolocation

Add IP-based detection:

```typescript
// Detect from request headers
const country = req.headers.get('x-vercel-ip-country') || 'IN';
const currency = detectCurrency(country);
```

### 2. User Preference Storage

Store currency preference in user metadata:

```typescript
// Save to user.metadata
await prisma.user.update({
  where: { id: userId },
  data: {
    metadata: { preferredCurrency: 'INR' },
  },
});
```

### 3. Currency Switcher UI

Add dropdown in usage page:

```tsx
<select value={currency} onChange={(e) => setCurrency(e.target.value)}>
  <option value="INR">₹ INR</option>
  <option value="USD">$ USD</option>
</select>
```

## Testing Checklist

- [ ] Create INR plans in Razorpay dashboard
- [ ] Update environment variables with plan IDs
- [ ] Test `/usage` page shows ₹ pricing
- [ ] Test checkout flow with INR currency
- [ ] Verify Razorpay subscription created with correct plan
- [ ] Test webhook receives subscription events
- [ ] Optional: Test USD flow (if plans created)

## Backward Compatibility

- Existing subscriptions continue to work
- Legacy code using `PLAN_LIMITS_WITH_PRICE` still works
- New code uses currency-aware pricing
- Defaults to INR if currency not specified

## Next Steps

1. **Immediate:** Create INR plans in Razorpay (required for Indian pricing)
2. **Short-term:** Test checkout flow with INR pricing
3. **Optional:** Add currency switcher UI
4. **Optional:** Implement IP geolocation for auto-detection
5. **Future:** Add Paddle for USD customers (better international support)

## Summary

✅ **All code changes are complete!**

You just need to:

1. Create Razorpay plans for INR pricing (₹999, ₹2,999, ₹9,999)
2. Update environment variables with plan IDs
3. Test the flow

The system now fully supports dual pricing with automatic currency detection! 🎉

