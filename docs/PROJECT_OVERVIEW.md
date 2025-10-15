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
