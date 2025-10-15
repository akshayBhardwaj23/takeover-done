## AI E‑Commerce Support Assistant — Cursor Context

This repository is a monorepo for a multi-tenant SaaS that helps Shopify store owners automate customer support with an AI-powered inbox, Shopify integration, and email ingestion.

### Tech stack

- **Framework**: Next.js App Router (TypeScript), Tailwind CSS, Shadcn UI
- **API**: tRPC
- **DB**: PostgreSQL via Prisma
- **Queues**: BullMQ / Upstash Redis (scaffolded)
- **Auth**: NextAuth (Google OAuth), Shopify OAuth
- **External**: Shopify Admin API, Cloudflare Tunnel for HTTPS dev

### Monorepo layout

- `apps/web`: Next.js app (UI + API routes for OAuth/webhooks)
- `apps/worker`: Worker/queue placeholder
- `packages/api`: tRPC router (server)
- `packages/db`: Prisma schema, client, and event logger

### Key pages and routes

- Web pages
  - `/` — Marketing homepage with CTAs
  - `/integrations` — Connect Shopify; list connections
  - `/inbox` — Recent orders list and order details + AI draft
- API routes (Next.js)
  - `app/api/shopify/install` — Starts Shopify OAuth
  - `app/api/shopify/callback` — Verifies HMAC, exchanges token, stores `Connection`, registers webhooks (feature-flagged), redirects to `/integrations`
  - `app/api/webhooks/shopify` — Shopify webhook receiver (HMAC verified)
  - `app/api/webhooks/gmail` — Placeholder for email ingestion
  - `app/api/trpc/[trpc]` — tRPC handler

### tRPC procedures (packages/api)

- Read
  - `health`
  - `echo`
  - `ordersCount`
  - `threadsList`
  - `connections`
  - `ordersRecent({ shop, limit })` — Shopify Admin API (non‑protected)
  - `orderGet({ shop, orderId })` — Shopify Admin API (non‑protected)
- Write
  - `aiSuggestReply({ customerMessage, orderSummary, tone })` — AI draft stub
  - `actionCreate({ shop, shopifyOrderId, email?, type, note?, draft? })`
  - `actionApproveAndSend({ actionId, to, subject, body })` — stub “send” + event

### Prisma models (packages/db/prisma/schema.prisma)

- `User`, `Order`, `Connection`, `Thread`, `Message`, `AISuggestion`, `Action`, `Event`
- `logEvent(type, payload?, entity?, entityId?)` helper is available

### Environment variables

- Root `.env` and app-specific `.env.local`/package `.env` files
- `packages/db/.env` must include: `DATABASE_URL` (e.g., Supabase pooler, sslmode=require)
- `apps/web/.env.local` examples:
  - `NEXTAUTH_URL` — use HTTPS tunnel for local auth callbacks
  - `NEXTAUTH_SECRET` — random string
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`
  - `SHOPIFY_APP_URL` — HTTPS tunnel base URL (e.g., Cloudflare tunnel)
  - `PROTECTED_WEBHOOKS` — `true|false`; defaults to non‑protected only
  - `MOCK_WEBHOOKS` — `true|false`; seeds mock events on install when true
  - Optional: `REDIS_URL` for worker

### Local development

1. Start HTTPS tunnel (Cloudflare or ngrok) and set `SHOPIFY_APP_URL` to the tunnel
2. Ensure `DATABASE_URL` is set in `packages/db/.env`
3. Install deps: `pnpm i`
4. Migrate DB: `pnpm db:migrate`
5. Dev: kill port if needed then `pnpm dev`
   - If port busy: `lsof -ti tcp:3000 | xargs -r kill -9`

### Shopify OAuth notes

- App must be accessible over HTTPS; set the tunnel URL in Shopify Partner App settings (Callback URL matches our `/api/shopify/callback`)
- Protected webhooks (orders/refunds/fulfillments) require Shopify “Protected customer data” approval; behind `PROTECTED_WEBHOOKS` flag. Non‑protected webhooks register regardless.
- When `MOCK_WEBHOOKS=true`, mock `Event` rows are seeded on install.

### Current UX flow

1. Connect Shopify on `/integrations`
2. Visit `/inbox?shop=your-shop.myshopify.com` to load recent orders and select one
3. Generate AI suggestion (stub), “Approve & Send (stub)” to create `Action` and log send event

### Roadmap (high level)

- Replace AI stub with OpenAI
- Real email send (Resend/Nodemailer/SMTP); support inbound parse/IMAP
- Background sync jobs via worker and Redis
- Multi-tenant auth hardening and per-tenant scoping
