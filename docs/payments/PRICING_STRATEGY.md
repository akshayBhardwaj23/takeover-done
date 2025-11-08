# Pricing Strategy & Profitability Analysis

## Recommended Pricing Tiers

### **Starter Plan - $29/month**

- **Email Volume**: 500 emails/month (outbound)
- **Shopify Stores**: 1 store
- **AI Suggestions**: Unlimited
- **Features**:
  - Basic AI reply generation
  - Order matching
  - Email threading
- **Target**: Small stores (< 50 orders/month)
- **Cost per Email**: ~$0.058
- **Margin**: ~70% (assuming $0.018/email cost)

### **Growth Plan - $99/month** ⭐ **Most Profitable**

- **Email Volume**: 2,500 emails/month (outbound)
- **Shopify Stores**: 3 stores
- **AI Suggestions**: Unlimited
- **Features**:
  - Everything in Starter
  - Priority support
  - Advanced analytics
  - Email templates
- **Target**: Growing stores (50-200 orders/month)
- **Cost per Email**: ~$0.04
- **Margin**: ~75% (best unit economics)

### **Pro Plan - $299/month**

- **Email Volume**: 10,000 emails/month (outbound)
- **Shopify Stores**: 10 stores
- **AI Suggestions**: Unlimited
- **Features**:
  - Everything in Growth
  - Custom AI training
  - API access
  - White-label options
- **Target**: Agencies & large stores (200-1000 orders/month)
- **Cost per Email**: ~$0.03
- **Margin**: ~80% (scale efficiency)

### **Enterprise Plan - Custom**

- **Email Volume**: Unlimited or custom limits
- **Shopify Stores**: Unlimited
- **Features**:
  - Everything in Pro
  - Dedicated support
  - SLA guarantees
  - Custom integrations
- **Pricing**: $0.025/email or volume discounts

## Cost Breakdown (Per Email)

### Infrastructure Costs

- **OpenAI API** (GPT-4o-mini): ~$0.0015 per email (avg 200 tokens)
- **Mailgun**: ~$0.001 per email (after free tier)
- **Database/Storage**: ~$0.0005 per email
- **Infrastructure overhead**: ~$0.001 per email
- **Total**: ~$0.004 per email

### Plan Economics

| Plan    | Monthly Price | Emails | Revenue/Email | Cost/Email | Margin |
| ------- | ------------- | ------ | ------------- | ---------- | ------ |
| Starter | $29           | 500    | $0.058        | $0.004     | 93%    |
| Growth  | $99           | 2,500  | $0.04         | $0.004     | 90%    |
| Pro     | $299          | 10,000 | $0.03         | $0.004     | 87%    |

## Revenue Projections (100 Customers)

### Conservative Mix (80% Starter, 15% Growth, 5% Pro)

- Starter: 80 × $29 = $2,320
- Growth: 15 × $99 = $1,485
- Pro: 5 × $299 = $1,495
- **Total MRR**: $5,300
- **Annual**: $63,600

### Optimistic Mix (50% Starter, 40% Growth, 10% Pro)

- Starter: 50 × $29 = $1,450
- Growth: 40 × $99 = $3,960
- Pro: 10 × $299 = $2,990
- **Total MRR**: $8,400
- **Annual**: $100,800

## Profitability Thresholds

### Break-Even Analysis

- **Fixed Costs**: ~$500/month (hosting, monitoring, etc.)
- **Variable Costs**: $0.004 per email
- **Break-even at Starter plan**: ~17 paying customers

### Growth Scenarios

- **100 customers** (conservative): $5,300 MRR → $63,600 ARR
- **500 customers** (realistic year 1): $26,500 MRR → $318,000 ARR
- **2,000 customers** (year 2): $106,000 MRR → $1,272,000 ARR

## Usage Limits Strategy

### Soft Limits (90% of quota)

- Show warning banner
- Allow continue with notification
- Suggest upgrade

### Hard Limits (100% of quota)

- Block new emails
- Show upgrade modal
- Allow viewing/drafting but not sending

### Overage Handling

- **Option 1**: Block until upgrade (recommended for simplicity)
- **Option 2**: Overage charges ($0.10/email after limit)
- **Option 3**: Grace period (48 hours to upgrade)

## Feature Gating Strategy

### Starter

- Basic features only
- Limited to 1 store connection

### Growth

- All Starter features
- Multiple stores
- Analytics dashboard
- Email templates

### Pro

- All Growth features
- API access
- Custom AI training
- Priority processing

## Conversion Funnel Optimization

1. **Free Trial**: 7 days, 100 emails
   - Low commitment
   - Show value quickly
2. **First Upgrade Prompt**: At 80% usage
   - Show clear value proposition
   - Highlight time saved

3. **Urgent Upgrade Prompt**: At 95% usage
   - Block sending until upgrade
   - Offer annual discount (20% off)

## Churn Prevention

- Monitor usage patterns
- Proactive outreach at 90% usage
- Offer temporary limit increase for loyal customers
- Annual plans with discount to reduce churn

## Competitive Analysis

| Competitor   | Price Range  | Emails    | Notes                                     |
| ------------ | ------------ | --------- | ----------------------------------------- |
| Zendesk      | $55-115/user | Unlimited | Per agent                                 |
| Intercom     | $74-359      | Unlimited | Per user                                  |
| Gorgias      | $50-600      | Unlimited | Per agent                                 |
| **Our Tool** | $29-299      | 500-10K   | **Volume-based, better for small stores** |

## Key Advantages

1. **Volume-based pricing** aligns with actual usage
2. **Lower entry point** ($29 vs $50+) for small stores
3. **Predictable costs** for customers (fixed monthly)
4. **High margins** (85-90%) enable growth

## Recommended Implementation Priority

1. ✅ Track email volume per user
2. ✅ Enforce limits (soft at 90%, hard at 100%)
3. ✅ Usage dashboard with upgrade prompts
4. ⏸️ Payment integration (Stripe) - Phase 2
5. ⏸️ Automated billing - Phase 2
6. ⏸️ Trial management - Phase 2
