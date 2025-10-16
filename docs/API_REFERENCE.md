## API Reference

### tRPC Router (packages/api)

Base URL: `/api/trpc`

Client usage via `apps/web/lib/trpc.ts` hooks (React Query).

#### Queries

- `health()` → `{ status: 'ok' }`
- `echo({ text })` → `{ text }`
- `ordersCount()` → `{ count: number }`
- `threadsList({ take? })` → `{ threads: Thread[] }`
- `connections()` → `{ connections: { id, type, shopDomain, createdAt }[] }`
- `ordersRecent({ shop, limit? })` → `{ orders: OrderSummary[] }`
  - Calls Shopify Admin API `/orders.json?status=any&limit=...` with `X-Shopify-Access-Token`
- `orderGet({ shop, orderId })` → `{ order: OrderDetail | null }`
  - Calls Shopify Admin API `/orders/{id}.json`

- `ordersListDb({ take? })` → `{ orders: DbOrder[] }`
  - Lists orders persisted from Shopify webhooks in our Postgres via Prisma

Notes:

- Both `ordersRecent` and `orderGet` resolve the `Connection` by `shop` (domain) and require an existing connection; otherwise they return an empty list/null safely.

#### Mutations

- `aiSuggestReply({ customerMessage, orderSummary?, tone })` → `{ suggestion: string }`
  - Stubbed server-side suggestion; replace with OpenAI later
- `actionCreate({ shop, shopifyOrderId, email?, type, note?, draft? })` → `{ actionId }`
  - Creates `Action` row and logs `action.created` event
- `actionApproveAndSend({ actionId, to, subject, body })` → `{ ok, status }`
  - Marks action approved and logs `email.sent.stub` event (no real send yet)

Types (conceptual):

```ts
type OrderSummary = {
  id: string;
  name: string;
  email?: string;
  totalPrice: string;
  createdAt: string;
};
type OrderDetail = OrderSummary & {
  currency?: string;
  lineItems: { id: string; title: string; quantity: number; price: string }[];
  shippingAddress?: any;
};
```

### Next.js API Routes (apps/web)

- `GET /api/shopify/install?shop=...`
  - Generates `state` cookie, redirects to Shopify OAuth
- `GET /api/shopify/callback?code=...&hmac=...&shop=...&state=...`
  - Verifies HMAC + state, exchanges token, saves `Connection`, registers webhooks (flagged)
  - On `MOCK_WEBHOOKS=true`, seeds mock events via `logEvent`
  - Redirects to `/integrations?connected=1&shop=...`
- `POST /api/webhooks/shopify`
  - Verifies Shopify webhook HMAC; handles topics (protected registration behind flag)
- `GET /api/shopify/webhooks/register?shop=...` (dev utility)
  - Re-registers webhooks for an existing connection and returns the current list
- `POST /api/webhooks/gmail` (placeholder)
  - Reserved for inbound email parsing
- `GET /api/trpc/[trpc]`
  - tRPC handler endpoint for the client hooks

### Auth

- NextAuth routes under `/api/auth/*` (provided by NextAuth)
  - `NEXTAUTH_URL` must be set to the tunnel URL during development
