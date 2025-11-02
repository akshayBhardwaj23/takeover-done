# Monthly Cost Estimate for 20 Customers

## 📊 Usage Assumptions (Month 1)

### Per Customer (Shopify Store):

- **Inbound emails received**: 100 emails/month (average)
- **Support replies sent**: 50 emails/month (50% response rate)
- **Orders processed**: 200 orders/month

### Total Across 20 Customers:

- **Inbound emails**: 2,000 emails/month
- **Support replies**: 1,000 emails/month
- **Orders processed**: 4,000 orders/month
- **AI suggestions generated**: 2,000/month (one per inbound email)

---

## 💰 Cost Breakdown

### 1. Infrastructure (Fixed Costs)

#### **Hosting: Vercel + Railway**

```
Production Web (Vercel Pro):     $20/month
Production Worker (Railway):     $5-10/month
Staging Web (Vercel Preview):   FREE
Staging Worker (optional):       $0-5/month
────────────────────────────────────────────
Total Infrastructure:            $25-35/month
```

#### **Database: Supabase**

- **Storage**: ~50MB (messages, threads, orders)
- **Compute**: Minimal (small queries)
- **Free tier**: 500MB storage, 2GB bandwidth/month
- **Cost**: **$0/month** ✅ (within free tier)

#### **Redis: Upstash**

- **Commands**: ~6,000/day (job queuing, rate limiting, idempotency)
- **Free tier**: 10,000 commands/day
- **Cost**: **$0/month** ✅ (within free tier)

---

### 2. Third-Party Services (Variable Costs)

#### **OpenAI API** (AI Suggestions) ⚠️ Main Variable Cost

**Usage:**

- 2,000 AI suggestions/month
- Each suggestion: ~500-800 tokens (input + output)
- Model: GPT-3.5-turbo (recommended) or GPT-4

**Cost Calculation:**

**Current Model: GPT-4o-mini** (You're using this - excellent choice!)

```
Input tokens:  ~600 tokens/suggestion × 2,000 = 1.2M tokens
Output tokens: ~200 tokens/suggestion × 2,000 = 400K tokens

Pricing (GPT-4o-mini):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

Cost = (1.2M × $0.15/1M) + (400K × $0.60/1M)
     = $0.18 + $0.24
     = $0.42/month
```

**Comparison with Other Models:**

**GPT-3.5-turbo:**

- Input: $1.50/1M, Output: $2.00/1M
- Cost: ~$2.60/month (6x more expensive)

**GPT-4-turbo:**

- Input: $2.50/1M, Output: $10.00/1M
- Cost: ~$7.00/month (17x more expensive)

**GPT-4:**

- Input: $10.00/1M, Output: $30.00/1M
- Cost: ~$24.00/month (57x more expensive)

**Recommendation: Keep using GPT-4o-mini** ✅

- ✅ Excellent cost/quality balance
- ✅ Fast response times
- ✅ More cost-effective than GPT-3.5-turbo
- ✅ Perfect for customer support suggestions

**OpenAI Cost: ~$0.50/month** (GPT-4o-mini)

---

#### **Mailgun** (Email Sending)

**Usage:**

- 1,000 outbound emails/month (replies sent)

**Pricing:**

- **Free tier**: 5,000 emails/month (first 3 months)
- **After free tier**: $0.80 per 1,000 emails

**Cost:**

- Month 1-3: **$0/month** ✅ (free tier)
- Month 4+: **$0.80/month** (1,000 emails)

**Mailgun Cost: $0-1/month** (first month free)

---

#### **Shopify API**

- Free (included with Shopify stores)
- Cost: **$0/month** ✅

---

## 📈 Total Monthly Cost Breakdown

### Month 1 (Free tier benefits):

```
Infrastructure (Vercel + Railway):  $30/month
Database (Supabase):               $0/month (free tier)
Redis (Upstash):                    $0/month (free tier)
OpenAI API (GPT-4o-mini):           $0.50/month
Mailgun:                            $0/month (free tier)
────────────────────────────────────────────
Total Month 1:                     ~$30.50/month
```

### Month 4+ (After free tiers):

```
Infrastructure (Vercel + Railway):  $30/month
Database (Supabase):               $0/month (still free)
Redis (Upstash):                    $0/month (still free)
OpenAI API (GPT-4o-mini):           $0.50/month
Mailgun:                            $1/month
────────────────────────────────────────────
Total Month 4+:                    ~$31.50/month
```

---

## 💡 Cost Optimization Strategies

### 1. **OpenAI Model Selection**

- ✅ **Use GPT-3.5-turbo** instead of GPT-4
- Savings: ~$21/month vs GPT-4
- Quality: Still excellent for support suggestions

### 2. **Caching AI Suggestions**

- Cache suggestions for similar queries
- Potential savings: 10-20% on OpenAI costs
- Estimated savings: ~$0.25-0.50/month

### 3. **Smart Rate Limiting**

- Limit AI suggestions to prevent abuse
- Already implemented via Redis rate limiting
- Protects against cost spikes

### 4. **Database Optimization**

- Use connection pooling (Supabase handles this)
- Keep database queries efficient
- Free tier should last for 50-100 customers

### 5. **Redis Optimization**

- Use Upstash free tier efficiently
- Monitor command usage
- Free tier should last for 100+ customers

---

## 📊 Cost Per Customer

```
Total Cost: ~$33/month
Customers: 20
─────────────────────
Cost per customer: ~$1.65/month
```

**This is highly efficient!** Most SaaS tools spend $5-10 per customer on infrastructure.

---

## 🚀 Scaling Projections

### 50 Customers (Month 6):

```
Infrastructure:                    $30/month (same - no scaling needed)
OpenAI (GPT-4o-mini):             $1.25/month (5,000 emails)
Mailgun:                          $2.50/month (2,500 emails)
────────────────────────────────────────────
Total:                            ~$33.75/month
Cost per customer:                ~$0.68/month
```

### 100 Customers (Month 12):

```
Infrastructure:                    $30-40/month (may need upgrade)
OpenAI (GPT-4o-mini):             $2.50/month (10,000 emails)
Mailgun:                          $5/month (5,000 emails)
Database:                         $0/month (still free)
Redis:                            $0/month (may need upgrade ~$10/month)
────────────────────────────────────────────
Total:                            ~$37.50-47.50/month
Cost per customer:                ~$0.38-0.48/month
```

**Note:** At 100 customers, you'll likely need:

- Upstash paid tier (~$10/month) - when you exceed 10K commands/day
- Supabase paid tier (~$25/month) - when you exceed free tier
- Better hosting plan (optional)

---

## ⚠️ Cost Risks & Mitigation

### High-Risk Areas:

1. **OpenAI API**
   - Risk: Spike in email volume → high costs
   - Mitigation: ✅ Rate limiting already implemented
   - Mitigation: ✅ Using GPT-4o-mini (very cost-efficient!)
   - Mitigation: ✅ Monitor usage with alerts
   - **Note:** Even with 10x usage, OpenAI costs would only be ~$5/month

2. **Mailgun**
   - Risk: Email abuse/spam
   - Mitigation: ✅ Rate limiting on sending
   - Mitigation: ✅ Domain verification required

3. **Database Storage**
   - Risk: Large attachments or long email threads
   - Mitigation: ✅ Free tier covers 500MB
   - Mitigation: Can archive old emails

### Low-Risk Areas:

✅ **Infrastructure** - Fixed cost, scales well  
✅ **Redis** - Free tier generous  
✅ **Shopify API** - Free

---

## 📋 Cost Monitoring Recommendations

### Set Up Alerts For:

1. **OpenAI API**
   - Alert if > $5/month (2x expected)
   - Alert if > 5,000 requests/month

2. **Mailgun**
   - Alert if > 2,000 emails/month

3. **Upstash Redis**
   - Alert if > 8,000 commands/day (80% of free tier)

4. **Supabase**
   - Alert if > 400MB storage (80% of free tier)

---

## ✅ Final Cost Estimate: 20 Customers

### **Month 1: ~$30.50/month**

### **Month 4+: ~$31.50/month**

**Breakdown:**

- Infrastructure: $30/month (97%)
- OpenAI (GPT-4o-mini): $0.50/month (2%)
- Mailgun: $0-1/month (1-3%)
- Database/Redis: $0/month (free tier)

**Cost per customer: ~$1.50-1.60/month**

---

## 🎯 Cost Comparison

| SaaS Tool       | Cost/Month (20 customers) | Cost/Customer |
| --------------- | ------------------------- | ------------- |
| **Your App**    | $33                       | $1.65         |
| Typical SaaS    | $100-200                  | $5-10         |
| Enterprise SaaS | $500-1000                 | $25-50        |

**You're 3-10x more cost-efficient!** 🎉

---

## 💡 Revenue vs. Cost

### If you charge $29/month per customer:

```
Revenue: 20 × $29 = $580/month
Costs:   ~$31/month
─────────────────────────────
Profit:  ~$549/month (95% margin)
```

**Excellent unit economics!** 👏

---

## 🚀 Next Steps

1. **Monitor costs** from day 1
2. **Set up alerts** for variable costs (OpenAI, Mailgun)
3. **Use GPT-3.5-turbo** (best cost/quality)
4. **Track per-customer costs** as you scale
5. **Optimize** when costs exceed $2-3/customer

---

## 📝 Notes

- Costs assume **healthy usage** (100 emails/customer/month)
- High-volume customers (500+ emails/month) will increase costs proportionally
- Infrastructure costs are **fixed** regardless of customer count (scales well)
- Variable costs (OpenAI, Mailgun) scale **linearly** with usage
- Free tiers (Supabase, Upstash) should last until **50-100 customers**
