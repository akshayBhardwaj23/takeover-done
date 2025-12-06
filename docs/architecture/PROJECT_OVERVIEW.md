## Project Overview

### What is this?

An AI-powered E‑Commerce Support Assistant for Shopify store owners. It centralizes customer communications, pulls order context, drafts replies, and lets humans approve/send.

### Key Value

- Reduce response time with AI drafts grounded in order data
- Unified inbox across Shopify and email
- Simple install and secure by design

### Core Features (MVP)

- Shopify OAuth install and connection management
- Recent orders view and order detail panel
- AI response draft (stub; upgradable to OpenAI)
- Approve & Send (stub) that creates `Action` and logs an `Event`

### Tech Stack Summary

**Frontend:**
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + Shadcn UI components
- React Query for data fetching
- Lenis for smooth scrolling

**Backend:**
- tRPC for type-safe API
- Prisma ORM (PostgreSQL)
- Node.js runtime

**Authentication:**
- NextAuth.js (Google OAuth)
- Custom Shopify OAuth implementation

**Background Jobs:**
- Inngest (serverless, event-driven)
- Upstash Redis (optional, webhook idempotency only)

**Integrations:**
- Shopify Admin API + Webhooks
- Mailgun (email sending/receiving)
- OpenAI GPT-4o-mini (AI suggestions)
- Google Analytics 4 (OAuth, property listing, analytics data)
- Meta Ads / Facebook Ads (OAuth, ad account management, performance insights)
- Razorpay (payments and subscriptions)

**Monitoring:**
- Sentry (error tracking)
- Event logging system
- Built-in analytics dashboards

**Development:**
- Cloudflare Tunnel for HTTPS during development
- Turborepo for monorepo management
- pnpm for package management

### Repository Layout

- `apps/web`: Next.js application
  - UI components and pages
  - NextAuth configuration
  - OAuth routes (Shopify, Google)
  - Webhook handlers (Shopify, Mailgun, Razorpay)
  - tRPC handler
  - Inngest functions for background jobs
- `apps/worker`: Legacy worker folder (NOT USED - kept for reference, using Inngest now)
- `packages/api`: tRPC router and business logic
  - API routes and mutations
  - Payment processing (Razorpay)
  - Playbook management
  - Analytics calculations
- `packages/db`: Database layer
  - Prisma schema and migrations
  - Database helper functions
  - Usage tracking and limits
  - Event logging
- Root utilities: Turborepo, pnpm workspace, shared tsconfig and tooling

### Folder Structure (current) and responsibilities

```text
ai-ecom-tool/
├─ apps/
│  ├─ web/                        # Next.js app (App Router)
│  │  ├─ app/
│  │  │  ├─ api/
│  │  │  │  ├─ auth/[...nextauth]/route.ts        # NextAuth handler
│  │  │  │  ├─ shopify/install/route.ts           # Shopify OAuth start (state cookie + redirect)
│  │  │  │  ├─ shopify/callback/route.ts          # Shopify OAuth callback (HMAC/state verify, token exchange, save Connection)
│  │  │  │  ├─ webhooks/shopify/route.ts          # Shopify webhooks (HMAC verify)
│  │  │  │  └─ webhooks/gmail/route.ts            # Email webhook placeholder
│  │  │  ├─ inbox/page.tsx                        # Unified inbox UI: recent orders, details, AI draft, approve & send (stub)
│  │  │  ├─ integrations/page.tsx                 # Connect Shopify + list connections
│  │  │  ├─ page.tsx                              # Marketing homepage (hero, features, CTAs)
│  │  │  └─ layout.tsx                            # Root layout + Providers
│  │  ├─ lib/
│  │  │  ├─ auth.ts                               # NextAuth options (Google provider)
│  │  │  ├─ shopify.ts                            # Shopify helpers: register/list webhooks, getRecentOrders
│  │  │  └─ trpc.ts                               # tRPC React Query client
│  │  ├─ styles/                                   # Tailwind CSS
│  │  ├─ next.config.mjs
│  │  └─ package.json
│  └─ worker/                    # Background worker (BullMQ) placeholder
│     └─ src/index.ts
├─ packages/
│  ├─ api/                       # tRPC server (procedures used by web)
│  │  └─ src/index.ts            # appRouter: health, echo, ordersCount, threadsList, connections,
│  │                              #            ordersRecent, orderGet, aiSuggestReply (stub),
│  │                              #            actionCreate, actionApproveAndSend (stub)
│  └─ db/                        # Prisma ORM and helpers
│     ├─ prisma/schema.prisma    # Models: User, Connection, Order, Thread, Message, AISuggestion, Action, Event
│     └─ src/{index.ts,logger.ts}# Prisma client singleton + logEvent helper
├─ docs/                         # Documentation (overview, architecture, design, runbook, integrations, roadmap, API, data model)
│  └─ planning/PRD.md           # Product requirements (source of truth for features)
├─ cursor-context.md             # Quick repo context for assistants
├─ turbo.json                    # Turborepo tasks
├─ pnpm-workspace.yaml           # Monorepo workspaces
├─ tsconfig.base.json            # Shared TS config
└─ package.json                  # Root package and scripts
```

Basics of implementations by area:

- `apps/web/app/api/shopify/*`: Implements OAuth start/callback, HMAC/state verification, access token exchange, `Connection` persistence, and conditional webhook registration + mock seeding.
- `apps/web/app/api/webhooks/shopify/route.ts`: Verifies HMAC, logs event, and persists/updates `Order` rows on `orders/create`, `orders/fulfilled`, `refunds/create`.
- `apps/web/app/inbox/page.tsx`: Unified inbox UI with two main views:
  - **Inbox View**: 3-column layout (Email List, Conversation Thread, Customer/Order Details).
  - **Orders View**: 2-column layout (Order List, Order Details).
  - Features: Real email sending via Mailgun API, AI suggestions, and order management.
- `apps/web/inngest/functions.ts`: Inngest functions for async email processing and AI suggestion generation.
- `packages/api/src/index.ts`: tRPC router with read queries (health, orders, connections) and write mutations (AI draft stub, action create/approve-send stub).
- `packages/db`: Prisma schema and `logEvent` utility to persist `Event` rows for auditing.

### Data Model (high level)

- User — tenant identities
- Connection — integrations (Shopify, email)
- Order — order entities (selected fields for AI context)
- Thread/Message — future inbox threading and messages
- AISuggestion — future storage of generated drafts
- Action — user-approved actions (e.g., send email)
- Event — audit log for important operations

### Environments and Flags

- `PROTECTED_WEBHOOKS` — only register protected webhooks when approved
- `MOCK_WEBHOOKS` — seed mock events for local/dev
- `SHOPIFY_APP_URL` — HTTPS external URL for OAuth/webhooks
- `DATABASE_URL` — Prisma reads from `packages/db/.env`
- `NEXTAUTH_URL` — Origin used by NextAuth (localhost or tunnel)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXTAUTH_SECRET`

### Current UX Flow

1. Connect Shopify on `/integrations`
2. Browse `/inbox?shop=your-shop.myshopify.com`
3. Switch between "Inbox" (conversations) and "Orders" (order management) views
4. Select an email or order to view details, generate AI suggestions, and take actions

### Current Status (Production Ready)

**Core Support Features (Complete):**
- ✅ Real email delivery via Mailgun API
- ✅ Email ingestion via Mailgun webhooks
- ✅ Unified inbox with email threads and order matching
- ✅ AI-powered reply generation (OpenAI GPT-4o-mini)
- ✅ Background job processing (Inngest)
- ✅ Per-store email aliases and support email configuration

**Analytics & Insights (Complete):**
- ✅ AI Support Analytics dashboard (response time, ROI, customer satisfaction, volume trends)
- ✅ Shopify Business Analytics dashboard (revenue, orders, customers, AOV, growth metrics)
- ✅ Google Analytics 4 dashboard (sessions, users, page views, bounce rate, e-commerce metrics, traffic sources, top pages)
- ✅ Meta Ads dashboard (spend, impressions, clicks, CTR, CPC, CPM, conversions, ROAS, CPA, reach, frequency, campaign breakdowns)
- ✅ 7-day and 30-day trend visualizations
- ✅ Real-time metrics and aggregated insights

**Automation Playbooks (Complete):**
- ✅ No-code playbook builder (6-step wizard)
- ✅ 8 default playbooks across 6 categories (Refund/Return, Marketing, Fulfillment, Support, Inventory, Custom)
- ✅ AI-powered execution with confidence thresholds
- ✅ Manual approval workflows
- ✅ Execution history tracking
- ✅ Real-time triggers (Shopify events, email intents, scheduled tasks)

**Subscription & Billing (Complete):**
- ✅ Razorpay payment integration
- ✅ Multiple subscription plans (TRIAL, STARTER, GROWTH, PRO, ENTERPRISE)
- ✅ Usage tracking and enforcement (emails, AI requests, stores)
- ✅ Upgrade prompts and limit notifications
- ✅ Webhook handling for payment events
- ✅ Multi-currency support (automatic detection and pricing)

**Integrations (Complete):**
- ✅ Shopify OAuth and Admin API
- ✅ Mailgun email integration
- ✅ Google Analytics 4 OAuth and API
- ✅ Meta Ads OAuth and Graph API
- ✅ Razorpay payment gateway

**Security & Multi-Tenancy (Complete):**
- ✅ Complete data isolation by userId
- ✅ Rate limiting (API, AI, Email, Webhooks)
- ✅ HMAC verification for Shopify webhooks
- ✅ Signature verification for Mailgun webhooks
- ✅ Encrypted OAuth tokens and secrets
- ✅ State parameter for CSRF protection in OAuth flows
