# Payment Solutions for Indian SaaS

## Overview

Since Stripe is not available for Indian businesses, here are recommended payment solutions that work for both domestic and international customers.

## Recommended Solutions

### **Option 1: Razorpay + Paddle (Hybrid Approach)** ⭐ **RECOMMENDED**

**Why This Combination:**

- **Razorpay**: Best for Indian customers (cards, UPI, wallets, netbanking)
- **Paddle**: Best for international customers (handles tax, compliance, multi-currency)

**Architecture:**

```
Indian Customers → Razorpay (UPI, Cards, Wallets)
International Customers → Paddle (Cards, handles VAT/GST automatically)
```

**Pros:**

- ✅ Razorpay supports 99% of Indian payment methods (UPI, wallets, netbanking)
- ✅ Paddle handles international tax compliance automatically
- ✅ Best user experience for each market
- ✅ Paddle acts as merchant of record (simplifies tax compliance)
- ✅ Supports subscription billing

**Cons:**

- Need to maintain two payment flows
- More setup complexity

**Pricing:**

- Razorpay: 2% + GST on domestic transactions, 3% + GST on international
- Paddle: 5% + $0.50 per transaction (includes tax handling)

**Implementation:**

- Route users by country/currency
- Indian customers → Razorpay checkout
- International → Paddle checkout

---

### **Option 2: Razorpay Only (Simplified)**

**Why:**

- Single payment gateway for all customers
- Excellent Indian market coverage
- Supports international cards

**Pros:**

- ✅ Simple implementation (one gateway)
- ✅ Great Indian payment methods (UPI, wallets)
- ✅ Accepts international cards
- ✅ Subscription support via Razorpay Subscriptions

**Cons:**

- ❌ You handle international tax compliance manually
- ❌ Limited international payment methods
- ❌ May not be optimal for international customers

**Pricing:**

- Domestic: 2% + GST
- International: 3% + GST

**Best For:**

- Primarily Indian customers with some international
- Want simplest implementation

---

### **Option 3: Paddle Only (International-First)**

**Why:**

- Excellent for international SaaS businesses
- Handles tax/VAT automatically (saves huge compliance burden)
- Merchant of record model

**Pros:**

- ✅ Automatic tax handling (VAT, GST, sales tax)
- ✅ Multi-currency support
- ✅ Merchant of record (you don't hold payment data)
- ✅ Great for subscriptions
- ✅ Accepts Indian cards too

**Cons:**

- ❌ Doesn't support UPI, wallets (Indian payment methods)
- ❌ Higher fees (5% + $0.50)
- ❌ Less optimal for Indian customers

**Best For:**

- Primarily international customers
- Want to avoid tax compliance complexity

---

### **Option 4: Chargebee + Multiple Gateways**

**Why:**

- Payment orchestration platform
- Routes to best gateway based on customer
- Manages subscriptions across gateways

**Pros:**

- ✅ Single subscription management system
- ✅ Can route to Razorpay (India) and Paddle/Stripe (International)
- ✅ Advanced subscription features (upgrades, prorations, etc.)
- ✅ Revenue recognition automation

**Cons:**

- ❌ Additional cost layer (Chargebee subscription + gateway fees)
- ❌ More complex setup
- ❌ May be overkill for simple use case

**Pricing:**

- Chargebee: $99-999/month + gateway fees
- Best for: Larger scale operations

---

## Comparison Table

| Solution              | Indian Methods    | International     | Tax Handling  | Complexity | Cost     | Best For           |
| --------------------- | ----------------- | ----------------- | ------------- | ---------- | -------- | ------------------ |
| **Razorpay + Paddle** | ✅ UPI, Wallets   | ✅ Excellent      | Auto (Paddle) | Medium     | 2-5%     | **Mixed audience** |
| **Razorpay Only**     | ✅ UPI, Wallets   | ⚠️ Cards only     | Manual        | Low        | 2-3%     | Indian-focused     |
| **Paddle Only**       | ❌ Cards only     | ✅ Excellent      | Auto          | Low        | 5%+$0.50 | Intl-focused       |
| **Chargebee**         | ✅ (via Razorpay) | ✅ (via gateways) | Auto          | High       | $99+/mo  | Large scale        |

## Detailed Recommendations by Use Case

### **If 70%+ Indian Customers: Razorpay Only**

- Simplicity wins
- Best Indian payment experience
- Accept international cards too
- Handle tax manually for international (can automate later)

### **If 50/50 Split: Razorpay + Paddle** ⭐

- Route by customer location
- Best experience for each market
- Paddle handles international tax automatically

### **If 70%+ International: Paddle Only**

- Focus on international market
- Tax compliance handled automatically
- Indian customers can pay with cards

## Implementation Strategy

### Phase 1: Start with Razorpay

1. Implement Razorpay for all customers
2. Get Indian market optimized first
3. Launch quickly

### Phase 2: Add Paddle for International

1. Add location detection
2. Route international customers to Paddle
3. Keep Razorpay for Indian customers
4. Optimize conversion rates per market

### Phase 3: Add Chargebee (Optional)

1. If subscription complexity grows
2. Need advanced revenue recognition
3. Multiple products/plans to manage

## Specific Implementation Notes

### Razorpay Features for SaaS

**Subscription API:**

- Create subscriptions with plans
- Webhook support for payment events
- Automatic retry for failed payments
- Proration support for upgrades

**Payment Methods:**

- Cards (Visa, Mastercard, Amex)
- UPI (PhonePe, GPay, Paytm)
- Netbanking (All major banks)
- Wallets (Paytm, Freecharge, etc.)
- EMI options

**International:**

- Accepts international cards
- Multi-currency support
- But you handle tax compliance

### Paddle Features for SaaS

**Subscription Management:**

- Full subscription lifecycle
- Automatic renewals
- Prorated upgrades/downgrades
- Dunning management (failed payment recovery)

**Tax Compliance:**

- Automatic VAT/GST calculation
- Tax-inclusive pricing
- EU VAT MOSS compliance
- US sales tax handling

**Merchant of Record:**

- Paddle is the seller (reduces your compliance burden)
- They handle chargebacks
- They manage payment data (PCI scope reduction)

## Code Implementation Example

### Razorpay Setup (Recommended for Indian SaaS)

```typescript
// packages/api/src/payments/razorpay.ts
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createSubscription(
  userId: string,
  planId: string,
  customerDetails: {
    email: string;
    name: string;
    phone?: string;
  },
) {
  // Create Razorpay customer
  const customer = await razorpay.customers.create({
    name: customerDetails.name,
    email: customerDetails.email,
    contact: customerDetails.phone,
  });

  // Create subscription
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    total_count: 12, // 12 months
    notes: {
      userId,
    },
  });

  return {
    subscriptionId: subscription.id,
    customerId: customer.id,
  };
}
```

### Paddle Setup (For International)

```typescript
// packages/api/src/payments/paddle.ts
import { Paddle } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

export async function createSubscription(
  userId: string,
  priceId: string, // Paddle price ID
  customerEmail: string,
) {
  // Paddle handles customer creation automatically
  const subscription = await paddle.subscriptions.create({
    items: [{ price_id: priceId, quantity: 1 }],
    customer_email: customerEmail,
    custom_data: {
      userId,
    },
  });

  return {
    subscriptionId: subscription.id,
    checkoutUrl: subscription.update_urls?.customer_portal,
  };
}
```

### Smart Routing

```typescript
// packages/api/src/payments/router.ts
import { detectCustomerLocation } from './location';
import { createRazorpaySubscription } from './razorpay';
import { createPaddleSubscription } from './paddle';

export async function createSubscription(userId: string, planType: string) {
  const user = await getUser(userId);
  const location = await detectCustomerLocation(user.email, user.ipAddress);

  // Route based on location
  if (location.country === 'IN') {
    // Indian customer → Razorpay
    return await createRazorpaySubscription(userId, planType, {
      email: user.email,
      name: user.name,
    });
  } else {
    // International → Paddle
    return await createPaddleSubscription(userId, planType, user.email);
  }
}
```

## Recommended Approach for Your SaaS

Given your tool is for Shopify store owners (global audience), I recommend:

### **Razorpay + Paddle Hybrid**

**Rationale:**

1. **Indian Shopify stores** can pay via UPI/wallets (Razorpay)
2. **International stores** get smooth experience with tax handled (Paddle)
3. **Best conversion rates** for each market
4. **Future-proof** as you scale

**Implementation Priority:**

1. **Week 1**: Implement Razorpay (covers 80% of market needs)
2. **Week 2**: Add location detection
3. **Week 3**: Implement Paddle for international
4. **Week 4**: Add smart routing

**Cost Analysis:**

- Razorpay: ~2.36% effective (2% + 18% GST on fees)
- Paddle: 5% + $0.50 per transaction
- Average: If 60% Indian, 40% international → ~3.5% blended rate

## Getting Started

### Razorpay Registration

1. Sign up at https://razorpay.com
2. Complete KYC (typically 1-2 days)
3. Get API keys (test + live)
4. Set up webhooks for subscription events

### Paddle Registration

1. Sign up at https://paddle.com
2. Complete onboarding (can take 1-2 weeks)
3. Create products and prices
4. Set up webhooks

### Next Steps

- See implementation guide in `docs/PAYMENT_IMPLEMENTATION.md` (to be created)
- Start with Razorpay for quick launch
- Add Paddle when international traction grows

