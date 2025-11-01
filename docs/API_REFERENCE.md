## API Reference

### tRPC Router (packages/api)

Base URL: `/api/trpc`

Client usage via `apps/web/lib/trpc.ts` hooks (React Query).

#### Queries

- `health()` → `{ status: 'ok' }`
- `echo({ text })` → `{ text }`
- `ordersCount()` → `{ count: number }`
- `threadsList({ take? })` → `{ threads: Thread[] }`
- `threadMessages({ threadId })` → `{ messages: Message[] }`
  - Returns all messages in a thread with AI suggestions
- `connections()` → `{ connections: { id, type, shopDomain, createdAt, metadata }[] }`
- `emailHealth()` → `{ lastInboundAt?: string }`
  - Returns timestamp of last inbound email delivery
- `ordersRecent({ shop, limit? })` → `{ orders: OrderSummary[] }`
  - Calls Shopify Admin API `/orders.json?status=any&limit=...` with `X-Shopify-Access-Token`
- `orderGet({ shop, orderId })` → `{ order: OrderDetail | null }`
  - Calls Shopify Admin API `/orders/{id}.json`
- `ordersListDb({ take? })` → `{ orders: DbOrder[] }`
  - Lists orders persisted from Shopify webhooks in our Postgres via Prisma
- `messagesByOrder({ shopifyOrderId })` → `{ messages: Message[] }`
  - Returns messages mapped to a specific order with AI suggestions and thread info
  - Each message includes `thread.subject` for displaying email subjects in the UI
- `unassignedInbound({ take? })` → `{ messages: Message[] }`
  - Returns inbound messages not yet mapped to any order
- `getAnalytics()` → `{ totalEmails, emailsThisWeek, emailsThisMonth, mappedEmails, unmappedEmails, totalOrders, actionsTaken, actionsThisWeek, aiSuggestionAccuracy, aiSuggestionsTotal, averageResponseTime, customerSatisfactionScore, volumeTrend }`
  - Returns AI support analytics metrics including response time, customer satisfaction, and 7-day email volume trend
- `getShopifyAnalytics({ shop })` → `{ totalOrders, ordersThisWeek, ordersThisMonth, totalRevenue, revenueThisWeek, revenueThisMonth, averageOrderValue, currency, totalCustomers, newCustomersThisWeek, ordersFulfilled, ordersPending, topProducts, revenueTrend }`
  - Returns Shopify business analytics for a specific store including revenue, orders, and customer metrics

Notes:

- Both `ordersRecent` and `orderGet` resolve the `Connection` by `shop` (domain) and require an existing connection; otherwise they return an empty list/null safely.

#### Mutations

- `aiSuggestReply({ customerMessage, orderSummary?, tone, customerEmail?, orderId? })` → `{ suggestion: string }`
  - Uses OpenAI API to generate personalized replies with order context
  - Falls back to heuristic response if OpenAI is unavailable
- `actionCreate({ shop, shopifyOrderId, email?, type, note?, draft? })` → `{ actionId }`
  - Creates `Action` row and logs `action.created` event
- `actionApproveAndSend({ actionId, to, subject, body })` → `{ ok, status }`
  - Marks action approved and sends real email via Mailgun API
  - Falls back to stub if Mailgun is not configured
- `createEmailAlias({ userEmail, domain, shop })` → `{ ok, alias }`
  - Generates a unique email alias for a Shopify store with webhook secret
- `rotateAlias({ id })` → `{ ok }`
  - Regenerates alias and webhook secret for an existing email connection
- `setAliasStatus({ id, disabled })` → `{ ok }`
  - Enable or disable an email alias
- `assignMessageToOrder({ messageId, shopifyOrderId })` → `{ ok }`
  - Manually maps an unassigned email message to a specific order
- `refreshOrderFromShopify({ shop, orderId })` → `{ ok, error? }`
  - Fetches latest order data from Shopify API and updates the database
- `sendUnassignedReply({ messageId, body })` → `{ ok, status }`
  - Sends a reply to an unassigned email using Mailgun API
  - Extracts recipient from message thread and sends with proper headers

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
- `POST /api/webhooks/email/custom`
  - Mailgun inbound email webhook handler
  - Verifies signature, parses email, correlates to orders, generates AI suggestions
  - Rate limited (10/min per alias), size capped (25MB)
- `GET /api/trpc/[trpc]`
  - tRPC handler endpoint for the client hooks

### Auth

- NextAuth routes under `/api/auth/*` (provided by NextAuth)
  - `NEXTAUTH_URL` must be set to the tunnel URL during development
