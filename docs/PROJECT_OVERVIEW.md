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

- Next.js (App Router, TypeScript), Tailwind, Shadcn UI
- tRPC for typed API; React Query client
- Prisma (PostgreSQL)
- Auth: NextAuth (Google), custom Shopify OAuth
- Queues: BullMQ/Upstash Redis (scaffolded)
- Tunneling: Cloudflare Tunnel for HTTPS during development

### Repository Layout

- `apps/web`: UI, NextAuth, OAuth routes, webhook routes, tRPC handler
- `apps/worker`: Background worker (placeholder)
- `packages/api`: tRPC router and server-side logic
- `packages/db`: Prisma schema/client and event logger
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
├─ cursor-context.md             # Quick repo context for assistants
├─ PRD.md                        # Product requirements (source of truth for features)
├─ turbo.json                    # Turborepo tasks
├─ pnpm-workspace.yaml           # Monorepo workspaces
├─ tsconfig.base.json            # Shared TS config
└─ package.json                  # Root package and scripts
```

Basics of implementations by area:

- `apps/web/app/api/shopify/*`: Implements OAuth start/callback, HMAC/state verification, access token exchange, `Connection` persistence, and conditional webhook registration + mock seeding.
- `apps/web/app/inbox/page.tsx`: Fetches recent orders via tRPC, shows details, drafts AI reply with `aiSuggestReply` stub, creates `Action` and logs send (stub).
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

### Current UX Flow

1. Connect Shopify on `/integrations`
2. Browse `/inbox?shop=your-shop.myshopify.com`
3. Select an order, generate AI suggestion (stub), Approve & Send (stub)

### Non-Goals (MVP)

- No real email delivery yet (stub only)
- No protected webhooks without partner approval
- No full multi-channel inbox yet (email ingestion planned)
