# **AI E-Commerce Support Assistant — Project Requirement Document (PRD)**

---

## 🏷️ **Basic Details**

**Project Name:** 🟩 AI E-Commerce Support Assistant

**Owner:** 🟩 Akshay Bhardwaj

**Version:** v1.0 (Draft)

**Date:** 🟩 [Insert date]

---

## 🎯 **1. Overview**

> The AI-powered dashboard that helps Shopify store owners handle customer support automatically using AI.

- 🟩 Short 2-line product pitch
- 🟩 One-sentence “why this matters”

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
- ✅ Email Integration
- ✅ Shopify Webhooks (orders, refunds, fulfillments)

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

### 📊 Logs & History

- Every thread, reply, and action logged.
- Filter by date / action / AI confidence.
- Export CSV.

---

## 🚫 **6. Non-Goals**

❌ Multi-language replies

❌ WhatsApp or Instagram DMs integration

❌ Full CRM/Ticket system

---

## 🧱 **7. Tech Stack**

| Layer      | Tech                                                  |
| ---------- | ----------------------------------------------------- |
| Frontend   | Next.js (App Router), TypeScript, Tailwind, Shadcn UI |
| Backend    | tRPC or NestJS, Node.js                               |
| Database   | PostgreSQL (Prisma ORM)                               |
| Queue      | BullMQ / Upstash Redis                                |
| Auth       | Auth.js (Shopify + Google OAuth)                      |
| AI         | OpenAI GPT-4o or GPT-5                                |
| Deployment | Vercel + Supabase/Railway                             |
| Monitoring | Sentry, Pino logs                                     |

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

✅ Connection (Shopify / Gmail tokens)

✅ Thread

✅ Message

✅ AISuggestion

✅ Action

✅ Event

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
| Week 1 | Setup project, DB, Auth         | ☐      |
| Week 2 | Gmail + Shopify integration     | ☐      |
| Week 3 | AI reply + action approval flow | ☐      |
| Week 4 | Webhooks + Logs + Deployment    | ☐      |
| Week 5 | QA, UX polish, Beta Launch      | ☐      |

---

## 📦 **14. Deliverables Checklist**

☐ Monorepo setup (`apps/web`, `worker`, `packages`)

☐ Shopify + Gmail OAuth connected

☐ Inbox UI + AI suggestions

☐ Action approval + execution working

☐ Webhooks integrated

☐ Logging + error handling

☐ Deployed MVP on Vercel

☐ Documentation & seed script

---

## 🔮 **15. Future Enhancements**

- ☐ Slack notifications
- ☐ WhatsApp integration
- ☐ Multi-brand management
- ☐ Analytics dashboard
- ☐ Auto-reply scheduling
- ☐ Knowledge base sync

---

## 🧭 **16. Notes for Cursor / AI Agent**

When feeding to Cursor:

- Keep file & folder structure specified.
- Generate **Prisma schema**, **tRPC routers**, **webhooks**, and **UI pages** as listed.
- Create placeholders with clear `// TODO(cursor)` comments.
- Include `.env.example`, seed data, and README.
