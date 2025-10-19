## Runbook

### Prerequisites

- Node.js (LTS), pnpm
- PostgreSQL database (e.g., Supabase/Neon). Use pooler with `sslmode=require` for local dev.
- HTTPS tunnel (Cloudflare Tunnel or ngrok) for Shopify OAuth/webhooks

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
- Feature flags:
  - `PROTECTED_WEBHOOKS=true|false`
  - `MOCK_WEBHOOKS=true|false`

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

- Open `/inbox?shop=your-shop.myshopify.com`
- Select an order to view details
- Click “Suggest reply” to generate a draft (stub)
- Click “Approve & Send (stub)” to create an Action and log an Event

### Public vs Protected routes

- Public: `/` (homepage)
- Protected by NextAuth middleware: `/integrations`, `/inbox`
- Anonymous users visiting protected routes are redirected to sign in

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
