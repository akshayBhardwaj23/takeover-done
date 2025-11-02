## Runbook

> **Note for Team Members**: If you're setting up your development environment for the first time, see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) for detailed instructions on running the app independently with your own Cloudflare tunnel.

### Prerequisites

- Node.js (LTS), pnpm
- PostgreSQL database (e.g., Supabase/Neon). Use pooler with `sslmode=require` for local dev.
- HTTPS tunnel (Cloudflare Tunnel or ngrok) for Shopify OAuth/webhooks
  - **Important**: Each developer needs their own tunnel for independent development

### Environment

- Root `.env` may hold shared values.
- `packages/db/.env` must include `DATABASE_URL` (Prisma reads per package).
- `apps/web/.env.local` for web-specific values.

Suggested `apps/web/.env.local` keys:

- `NEXTAUTH_URL` — your HTTPS tunnel URL (e.g., https://your-tunnel.trycloudflare.com)
- `NEXTAUTH_SECRET` — random string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — for NextAuth Google
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` — from Shopify Partner app
- `SHOPIFY_APP_URL` — same HTTPS tunnel base URL
- `OPENAI_API_KEY` — for AI-powered reply generation
- Mailgun settings (for outbound email):
  - `MAILGUN_API_KEY` — from Mailgun dashboard
  - `MAILGUN_DOMAIN` — your verified sending domain
  - `MAILGUN_FROM_EMAIL` — sender email (e.g., support@your-domain.com)
- Feature flags:
  - `PROTECTED_WEBHOOKS=true|false`
  - `MOCK_WEBHOOKS=true|false`
  - `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN=mail.example.com` (your inbound email domain)
  - `MAILGUN_SIGNING_KEY=` (optional; enables provider signature verification)

### First-time setup

1. Install deps
   ```bash
   pnpm i
   ```
2. Configure DB URL
   - Set `packages/db/.env`:
     ```
     DATABASE_URL=postgres://... (pooler; sslmode=require)
     ```
3. Migrate DB
   ```bash
   pnpm db:migrate
   ```
4. Start HTTPS tunnel and copy URL to `SHOPIFY_APP_URL` and `NEXTAUTH_URL`.

### Google OAuth (NextAuth)

1. In Google Cloud Console → APIs & Services:
   - Configure OAuth consent screen: type External, scopes `email`, `profile`, add your Google as Test user.
   - Create Credentials → OAuth client ID → Web application.
   - Authorized redirect URIs (choose based on your origin):
     - `http://localhost:3000/api/auth/callback/google`
     - `https://dev.zyyp.ai/api/auth/callback/google` (or your tunnel domain)
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://dev.zyyp.ai`
   - Copy Client ID/Secret.
2. Set `apps/web/.env.local`:
   - `NEXTAUTH_URL=http://localhost:3000` (or `https://dev.zyyp.ai`)
   - `NEXTAUTH_SECRET=<random-32+ chars>`
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
3. Restart dev. Visit `/api/auth/signin`.

### Development

```bash
# kill anything on 3000 then start dev
lsof -ti tcp:3000 | xargs -r kill -9 && pnpm dev
```

The web app will be available at `http://localhost:3000` and via your HTTPS tunnel.

### Inbound Email (Custom)

1. Configure your provider (e.g., Mailgun) to route all messages to `mail.<your-domain>` and forward to webhook `POST /api/webhooks/email/custom`.
2. Set `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN` in `apps/web/.env.local`.
3. (Optional) Set `MAILGUN_SIGNING_KEY` to enable signature verification.
4. In the app, go to `/integrations` → Custom Email → Create alias.
5. Forward your support mailbox to the generated alias and send a test email.

#### Alias management

- Rotate: use the Rotate button on `/integrations` → Custom Email card. This creates a new alias and secret.
- Disable/Enable: toggle to block/allow inbound. Webhook returns 403 when disabled.

#### Guardrails & Troubleshooting

- Max payload: 25MB; Mailgun large attachments may be rejected.
- 401 Unauthorized: ensure `MAILGUN_SIGNING_KEY` matches the domain’s Signing key and app restarted.
- 403 alias disabled: re‑enable the alias from `/integrations`.
- Health card shows last inbound timestamp; if stale, verify Mailgun Route target and logs (expect 200).

### Worker (queues)

- Set `REDIS_URL` to enable BullMQ workers (`apps/worker`).
- Inbox queue processes `inbound-email-process` to generate AI suggestions (placeholder).
- The webhook also creates a minimal inline suggestion if the worker is disabled.
- Start the worker separately in production.

### Allowed Dev Origins (tunnel)

If you proxy the app through a tunnel domain, Next.js may warn about cross-origin `/_next/*` assets. Add your tunnel to `apps/web/next.config.mjs`:

```js
// apps/web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ai-ecom/api', '@ai-ecom/db'],
  allowedDevOrigins: ['https://your-tunnel.trycloudflare.com'],
};
export default nextConfig;
```

Restart dev (`pnpm dev`).

### Shopify Partner App configuration

- App URL / Redirect URL: `${SHOPIFY_APP_URL}/api/shopify/callback`
- Ensure the app is public (draft) and “Test on development stores” enabled.
- Use the same Client ID/Secret in env.

### Cloudflare Tunnel (custom domain)

- Named tunnel example (already configured in `infra/cloudflared/config.yml`):

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: ~/.cloudflared/<YOUR_TUNNEL_ID>.json
ingress:
  - hostname: dev.zyyp.ai
    service: http://localhost:3000
  - service: http_status:404
```

Commands:

- `cloudflared tunnel run <name>` (or use the config above)
- Ensure DNS CNAME for `dev.zyyp.ai` points to the tunnel per Cloudflare setup
- Set `SHOPIFY_APP_URL` and `NEXTAUTH_URL` to `https://dev.zyyp.ai`

### Sign in (NextAuth)

- Visit `/api/auth/signin` and sign in with Google (or add a sign-in button).
- Connections created during Shopify OAuth will be linked to the signed-in user.

### Verifying OAuth

1. Go to `/integrations`
2. Enter your development store domain (e.g., `dev-yourstore.myshopify.com`) and connect
3. Approve the install; you should be redirected back to `/integrations?connected=1`

### Using the Inbox

The inbox provides a modern 3-column interface for managing orders and support emails:

**Left Column - Orders List:**

- Displays all orders from the database with order number, customer, total, status, and date
- Click any order to view full details
- Orders are color-coded by status (green for fulfilled, red for refunded, amber for pending)

**Center Panel - Order Details:**

- Shows full order information with items, pricing, and customer details
- **Refresh from Shopify button**: Click to sync latest order data (status, amount) from Shopify API
- AI Reply Assistant: Generate AI-powered responses to customer inquiries
- AI Suggestions section displays recommended actions based on email content
- "View Email Thread" button to see all related email conversations

**Right Panel - Email Matches:**

- When an order is selected: Shows all emails mapped to that order
- When no order is selected: Shows unassigned emails that need manual mapping
- Displays AI suggestions and confidence scores for each email

**Usage Flow:**

1. Open `/inbox?shop=your-shop.myshopify.com` (accessed from "Open Inbox" button on integrations page)
2. Select an order from the left sidebar
3. Click "Refresh from Shopify" if you need the latest data
4. Review email matches in the right panel
5. Click "Generate AI Reply" to create a personalized response (uses OpenAI with order context)
6. Edit the draft and click "Send Reply" to respond to customer (sends via Mailgun)
7. For unassigned emails (right panel when no order is selected):
   - AI suggestions are automatically shown
   - Click "Send AI Reply" to send the suggested response

**UX Features:**

- Loading states: All actions show spinners and disabled states during processing
- Skeleton loaders: Order list, order details, and email sections show animated skeletons during data fetching
- Toast notifications: Success, error, and warning messages appear as dismissible toasts
- AI-powered replies: Uses customer name, order details, and email context for personalized responses

### Using the Analytics Dashboards

The platform provides two comprehensive analytics dashboards:

#### 1. AI Support Analytics (`/analytics`)

Tracks AI-powered support performance and ROI metrics:

**Key Metrics:**

- **Total Emails**: All inbound emails processed with weekly/monthly breakdowns
- **Average Response Time**: Time from first email to first action (minutes/hours)
- **AI Accuracy**: Percentage of AI suggestions that lead to actions
- **Customer Satisfaction**: Score based on positive action types (refunds, replacements, etc.)

**Visualizations:**

- **Email Volume Trend**: 7-day bar chart showing daily inbound email activity
- **Email Mapping**: Success rate of email-to-order correlation
- **AI Automation**: Suggestions made vs actions taken
- **ROI Impact**: Time saved, automation rate, emails processed

**ROI Summary Card:**

- Demonstrates value to merchants
- Emails processed, actions automated, time saved, CSAT score
- Industry comparisons (e.g., avg response time vs industry standard)

**Access**: Main navigation → "Support Analytics" (requires authentication)

#### 2. Shopify Business Analytics (`/shopify-analytics`)

Displays business performance metrics for connected Shopify stores:

**Key Metrics:**

- **Total Revenue**: All-time revenue with weekly/monthly breakdowns
- **Total Orders**: Order counts with weekly/monthly trends
- **Average Order Value (AOV)**: Revenue per order
- **Total Customers**: Unique customers with new customer tracking

**Visualizations:**

- **Revenue Trend**: 7-day bar chart showing daily sales performance
- **Order Status**: Fulfilled vs pending order breakdown with fulfillment rate
- **Top Products**: Best-selling products by order count (when available)

**Business Overview:**

- Monthly revenue and orders
- Average order value
- Customer acquisition metrics
- Growth rate calculations

**Store Selection**: Dropdown to switch between connected stores (if multiple)

**Access**: Main navigation → "Business Analytics" (requires authentication and connected Shopify store)

### Public vs Protected routes

- Public: `/` (homepage)
- Protected by NextAuth middleware: `/integrations`, `/inbox`, `/analytics`, `/shopify-analytics`
- Anonymous users visiting protected routes are redirected to sign in

### Header & auth UX

- The global header shows Sign in when anonymous, and avatar + name with a Sign out button when authenticated (NextAuth SessionProvider).
- When authenticated, the header includes links to:
  - **Integrations** - Connect Shopify stores and manage email aliases
  - **Support Analytics** - AI support performance, response times, and ROI metrics
  - **Business Analytics** - Shopify store revenue, orders, and customer insights
  - **Note:** Inbox is accessible only via the "Open Inbox" button on connected Shopify stores in the integrations page
- Sign out redirects back to `/`.

### Using the Integrations Page

The integrations page features a modern dashboard with stats cards and integration management:

**Stats Dashboard:**

- Shows count of connected Shopify stores, email aliases, and active/inactive aliases
- Color-coded cards with gradient backgrounds for visual clarity

**Shopify Integration Card:**

- Large prominent card with gradient overlay
- "Connect Store" button to add new Shopify stores via OAuth
- Connected stores displayed in a grid with status badges
- Each store card has an "Open Dashboard" button linking to its inbox

**Custom Email Integration Card:**

- "Create Alias" button to generate unique forwarding addresses per store
- Displays all email aliases with their associated Shopify stores
- Each alias card shows:
  - Email address (click "Copy" to copy to clipboard)
  - Associated Shopify store
  - Active/Disabled status badge
  - Action buttons: Rotate (new address), Enable/Disable
- Email Health card shows last inbound email timestamp
- Quick Setup guide with numbered steps

**UX notes:**

- Duplicate store prevention: entering a Shopify domain that is already connected will show a toast and will not start OAuth.
- If an already-connected store starts OAuth anyway, the callback redirects back to `/integrations?connected=1&already=1&shop=...` and a success toast is shown instead of adding a duplicate.
- Email aliases are per-store, so you'll need at least one Shopify store connected before creating an alias
- Loading states: All buttons show loading text ("Creating...", "Rotating...", "Updating...") while processing
- Skeleton loaders: Stats cards and integration cards show animated skeletons during data fetching
- Toast notifications: Success, error, and warning messages appear as dismissible toasts in the top-right corner

### Local onboarding (TL;DR for new devs)

1. `pnpm i`
2. Set `packages/db/.env` → `DATABASE_URL=...` (pooler; sslmode=require)
3. `pnpm db:migrate`
4. Start tunnel (`cloudflared ...`) → set `SHOPIFY_APP_URL` & `NEXTAUTH_URL`
5. Create Google OAuth client → set `GOOGLE_CLIENT_ID/SECRET` & `NEXTAUTH_SECRET`
6. `lsof -ti tcp:3000 | xargs -r kill -9 && pnpm dev`
7. `/api/auth/signin` → sign in; `/integrations` → connect store; `/inbox?shop=...`

### Feature flags

- `PROTECTED_WEBHOOKS`: If `true`, attempts to register protected topics (`orders/create`, `refunds/create`, `fulfillments/create`). Without “Protected customer data” approval, Shopify will 403.
- `MOCK_WEBHOOKS`: If `true`, seeds mock `Event` rows after install for local/dev.

### Common issues

- Prisma P1012 (missing DATABASE_URL): ensure `packages/db/.env` is set.
- Prisma P1001 (cannot reach DB): use pooler URL with `sslmode=require`.
- Next.js ESM config issues: ensure `next.config.mjs` and `postcss.config.cjs`.
- Port busy / EADDRINUSE: kill 3000 as shown above.
- Shopify webhooks missing: must use HTTPS tunnel; set `SHOPIFY_APP_URL`.
- Webhook 403 on protected topics: requires Shopify “Protected customer data” access.
- Redirect to localhost: set `SHOPIFY_APP_URL` and configure Partner app Redirect URL accordingly.
