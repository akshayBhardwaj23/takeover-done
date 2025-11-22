# **AI E-Commerce Support Assistant — Project Requirement Document (PRD)**

---

## 🏷️ **Basic Details**

**Project Name:** AI E-Commerce Support Assistant

**Owner:** Akshay Bhardwaj

**Version:** v1.0

**Date:** 2024

---

## 🎯 **1. Overview**

> The AI-powered dashboard that helps Shopify store owners handle customer support automatically using AI.

**Product Pitch:** An intelligent customer support automation platform that reads support emails, maps them to Shopify orders, and suggests AI-powered responses with actionable insights. Reduce response time by 60%+ and improve customer satisfaction with automated, context-aware support.

**Why This Matters:** E-commerce store owners spend hours daily responding to repetitive support emails. This platform automates the entire workflow—from email ingestion to order matching to AI-suggested replies—freeing up time for strategic work while ensuring customers get faster, more accurate responses.

---

## 🧩 **2. Problem Statement**

- Store owners manually check support emails and Shopify orders.
- Responding to repetitive queries is time-consuming.
- Lack of automation → slower responses → unhappy customers.
  ✅ Goal: Use AI + Shopify + Mail integration to automate these workflows.

---

## 🚀 **3. Goals**

| #   | Goal                             | Description                                                                                                                                          |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Integrate Shopify with Dashboard | Enable Shopify integration with our dashboard so that user can see shopify orders and also take actions against those.                               |
| 2   | Unified Inbox                    | Merge customer emails + order data in one dashboard.                                                                                                 |
| 3   | Email integration                | Dashboard should have all the email trail for the customer and also should be able to match the details with the shopify order before taking action. |
| 3   | AI Reply Generator               | Auto-suggest contextual replies using GPT.                                                                                                           |
| 4   | Actionable AI                    | Suggest and execute Shopify actions (refund, cancel, etc.).                                                                                          |
| 5   | Approval System                  | Human approval before final actions.                                                                                                                 |
| 6   | Logging                          | Maintain audit trail for every AI decision.                                                                                                          |

---

## 👥 **4. Target Users**

- ✅ Shopify Store Owners
- ✅ Support Executives / VAs
- ✅ Agencies handling multiple stores

---

## ⚙️ **5. Core Features (MVP)**

### 🧠 AI-Powered Support

- AI reads email → extracts intent.
- Suggests reply + Shopify action.
- Supports shopify structured actions:
  - REFUND
  - CANCEL
  - REPLACE_ITEM
  - ADDRESS_CHANGE
  - INFO_REQUEST

### 📥 Unified Inbox

- Left: customer threads (from Gmail)
- Right: Shopify order & AI suggestions
- Buttons:
  - “Approve & Send”
  - “Edit & Send”
  - “Reject”

### 🔁 Integrations

- ✅ Shopify OAuth
- ✅ Email Integration (Mailgun)
- ✅ Shopify Webhooks (orders, refunds, fulfillments)
- ✅ Google Analytics 4 (GA4) - OAuth integration, property listing, comprehensive analytics data
- ✅ Meta Ads (Facebook Ads) - OAuth integration, ad account management, performance insights

### ⚡ Smart Actions

| Action         | Description                               |
| -------------- | ----------------------------------------- |
| Refund         | Full/partial refund via Shopify Admin API |
| Cancel         | Cancel pending orders                     |
| Replace        | Trigger new fulfillment                   |
| Address Change | Update address if unfulfilled             |
| Info Request   | Ask for missing order info                |

### ⚙️ Settings

- Tone presets (Friendly / Professional / Brand voice)
- Confidence threshold for auto-action
- Escalation rules (e.g., refund > ₹2000 → manual)

### 📊 Analytics & Insights

- **AI Support Analytics Dashboard**:
  - Response time metrics
  - ROI calculations
  - Customer satisfaction tracking
  - Volume trends (7-day, 30-day)
  - Automation rates

- **Shopify Business Analytics Dashboard**:
  - Revenue metrics
  - Order counts and trends
  - Customer analytics
  - Average Order Value (AOV)
  - Growth metrics

- **Google Analytics 4 Dashboard**:
  - Sessions, Users, Page Views
  - Bounce Rate
  - E-commerce metrics (Revenue, Transactions, Conversion Rate, AOV)
  - Traffic sources
  - Top pages
  - Daily trend visualizations

- **Meta Ads Dashboard**:
  - Spend, Impressions, Clicks
  - CTR, CPC, CPM
  - Conversions and conversion value
  - ROAS (Return on Ad Spend) and CPA
  - Reach and Frequency
  - Campaign and ad set breakdowns
  - Daily trend data

### 🤖 Automation Playbooks

- **No-Code Playbook Builder**: 6-step wizard to create automation workflows
- **8 Default Playbooks** across 6 categories:
  - Refund/Return (auto-refund damaged products, auto-exchange size issues)
  - Marketing (re-engage inactive customers, cart abandonment recovery)
  - Fulfillment (delayed order escalation, VIP customer fast-track)
  - Support (auto-respond to negative reviews, route urgent inquiries)
  - Inventory (low stock alerts, auto-restock notifications)
  - Custom (build any workflow)
- **AI-Powered Execution**: Automatic execution based on confidence scores
- **Approval Workflows**: Manual approval option before execution
- **Real-time Triggers**: Shopify events, email intents, scheduled tasks
- **Execution History**: Track all playbook runs and results

### 💳 Subscription & Billing

- **Multiple Subscription Plans**:
  - TRIAL (free trial period)
  - STARTER (basic features)
  - GROWTH (mid-tier features)
  - PRO (advanced features)
  - ENTERPRISE (unlimited features)
- **Razorpay Payment Integration**: Secure payment processing
- **Usage Tracking & Limits**: Per-plan limits for emails, AI requests, stores
- **Upgrade Prompts**: Automatic notifications when approaching limits
- **Subscription Management**: View status, upgrade, cancel subscriptions
- **Multi-Currency Support**: Automatic currency detection and pricing

### 📊 Logs & History

- Every thread, reply, and action logged.
- Filter by date / action / AI confidence.
- Export CSV.
- Usage history tracking
- Account activity logs

---

## 🚫 **6. Non-Goals**

❌ Multi-language replies

❌ WhatsApp or Instagram DMs integration

❌ Full CRM/Ticket system

---

## 🧱 **7. Tech Stack**

| Layer        | Tech                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| Frontend     | Next.js (App Router), TypeScript, Tailwind, Shadcn UI                             |
| Backend      | tRPC, Node.js                                                                     |
| Database     | PostgreSQL (Prisma ORM)                                                           |
| Queue        | Inngest (serverless, event-driven) / Upstash Redis (optional)                     |
| Auth         | NextAuth.js (Google OAuth), Shopify OAuth, Google Analytics OAuth, Meta Ads OAuth |
| AI           | OpenAI GPT-4o-mini (production)                                                   |
| Payments     | Razorpay (subscription management)                                                |
| Integrations | Shopify Admin API, Mailgun (email), Google Analytics 4 API, Meta Ads API          |
| Deployment   | Vercel + Supabase/Railway                                                         |
| Monitoring   | Sentry (error tracking), Pino logs                                                |

---

## 🧮 **8. System Flow**

```
Customer Email → Dashboard integration → AI Parser
                     ↓
          Shopify Order Fetched
                     ↓
       AI Suggests Reply + Action
                     ↓
      User Reviews → Approves/Rejects
                     ↓
        Shopify API executes action
                     ↓
           Logs + Dashboard update

```

---

## 🗄️ **9. Database Models (Initial)**

✅ User

✅ Orders with status

✅ Connection (Shopify / Email / Google Analytics / Meta Ads tokens)

✅ Thread

✅ Message

✅ AISuggestion

✅ Action

✅ Event

✅ Playbook (automation workflows)

✅ PlaybookExecution (playbook run history)

✅ Subscription (user subscription plans)

✅ Usage (usage tracking and limits)

---

## 🧠 **10. AI Prompt (Draft)**

```json
{
 "role": "system",
 "content": "You are a helpful AI assistant for a Shopify brand.
  Read the email and order details.
  Output JSON:
  {
    'reply': 'email text',
    'proposedAction': {
       'actionType': 'REFUND' | 'CANCEL' | 'REPLACE_ITEM' | 'ADDRESS_CHANGE' | 'INFO_REQUEST' | 'NONE',
       'orderId': 'string',
       'confidence': 'float'
    }
  }"
}

```

---

## 🔐 **11. Security & Compliance**

- ✅ Shopify HMAC webhook verification
- ✅ OAuth token encryption
- ✅ Rate limits on AI endpoints
- ✅ Role-based access
- ✅ GDPR-ready data deletion

---

## 📊 **12. Success Metrics**

| Metric                           | Target |
| -------------------------------- | ------ |
| Avg time saved per support email | ≥ 60%  |
| AI action accuracy               | ≥ 85%  |
| Manual approval rate             | ≤ 30%  |
| Active stores (month 1)          | ≥ 10   |
| Emails processed                 | ≥ 1000 |

---

## 🗓️ **13. Timeline**

| Week   | Milestone                       | Status |
| ------ | ------------------------------- | ------ |
| Week 1 | Setup project, DB, Auth         | ✅     |
| Week 2 | Gmail + Shopify integration     | ✅     |
| Week 3 | AI reply + action approval flow | ✅     |
| Week 4 | Webhooks + Logs + Deployment    | ✅     |
| Week 5 | QA, UX polish, Beta Launch      | ✅     |

---

## 📦 **14. Deliverables Checklist**

✅ Monorepo setup (`apps/web`, `worker`, `packages`)

✅ Shopify OAuth connected (Mailgun for email)

✅ Inbox UI + AI suggestions

✅ Action approval + execution working

✅ Webhooks integrated (Shopify webhooks, Mailgun email webhooks)

✅ Logging + error handling (Event model, Sentry)

✅ Deployed MVP on Vercel (staging + production)

✅ Documentation & setup guides

✅ Analytics dashboards (AI Support Analytics + Shopify Business Analytics + Google Analytics 4 + Meta Ads)

✅ Background job processing (Inngest for async email processing)

✅ Per-store email aliases and support email configuration

✅ Automation Playbooks system (no-code builder, 8 default playbooks, AI-powered execution)

✅ Payment integration (Razorpay with multiple subscription plans)

✅ Usage tracking and limits (per-plan quotas, upgrade prompts)

✅ Google Analytics 4 integration (OAuth, property listing, comprehensive analytics)

✅ Meta Ads integration (OAuth, ad account management, performance insights)

---

## 🔮 **15. Future Enhancements**

- ✅ Analytics dashboard (COMPLETE - AI Support Analytics + Shopify Business Analytics + Google Analytics 4 + Meta Ads)
- ✅ Automation Playbooks (COMPLETE - No-code builder with 8 default playbooks)
- ✅ Payment & Subscriptions (COMPLETE - Razorpay integration with multiple plans)
- ✅ Usage Tracking (COMPLETE - Per-plan limits and tracking)
- ☐ Slack notifications
- ☐ WhatsApp integration
- ☐ Multi-brand management
- ☐ Auto-reply scheduling
- ☐ Knowledge base sync
- ☐ SMTP integration (Gmail/Outlook OAuth)
- ☐ Basic audit UI (actions/events timeline per order)
- ☐ Smart templates, tone control, multi-language support
- ☐ SLA timers, reminders, collision prevention
- ☐ Visual flow builder for playbooks (drag-and-drop)
- ☐ A/B testing for playbook variations
- ☐ Advanced analytics per playbook
- ☐ Playbook templates marketplace

---

## 🧭 **16. Notes for Cursor / AI Agent**

When feeding to Cursor:

- Keep file & folder structure specified.
- Generate **Prisma schema**, **tRPC routers**, **webhooks**, and **UI pages** as listed.
- Create placeholders with clear `// TODO(cursor)` comments.
- Include `.env.example`, seed data, and README.
