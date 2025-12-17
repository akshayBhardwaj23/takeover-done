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
- `getGoogleAnalyticsProperties()` → `{ properties: Array<{ propertyId, propertyName, accountId }> }`
  - Returns all GA4 properties available for the authenticated user
  - Automatically refreshes OAuth tokens if needed
  - Falls back to metadata property if API call fails
- `getGoogleAnalyticsData({ propertyId?, startDate?, endDate? })` → `{ sessions, users, pageViews, bounceRate, avgSessionDuration, revenue?, transactions?, conversionRate?, avgOrderValue?, trafficSources, topPages, trend }`
  - Returns comprehensive Google Analytics data for the specified property and date range
  - Defaults to last 7 days if dates not provided
  - Uses property from connection metadata if `propertyId` not provided
  - Includes e-commerce metrics if available
- `getUserProfile()` → `{ user, stores }`
  - Returns current user profile and connected Shopify stores with support email configuration
- `getAggregatedInsights({ shop? })` → `{ shopifyMetrics, emailMetrics }`
  - Returns aggregated analytics for AI-powered insights
  - Includes revenue trends, email volume, sentiment analysis, and complaint topics

**Subscription & Usage:**

- `getUsageSummary({ currency? })` → `{ planType, status, emailsSent, emailLimit, aiSuggestions, aiLimit, percentage, remaining, trial, currency, price, formattedPrice }`
  - Returns current subscription plan, usage, and limits with pricing information
- `getUsageHistory()` → `{ history }`
  - Returns historical usage records per billing period
- `checkEmailLimit()` → `{ allowed, current, limit, percentage, remaining, planType, trial }`
  - Checks if user can send email based on current usage and plan limits
- `getAccountDetails()` → `{ user, subscription, billingCycle, billingHistory, usageSummary }`
  - Returns complete account information including billing and usage

**Playbook Management:**

- `getPlaybooks({ category?, seedDefaults? })` → `{ playbooks }`
  - Lists all playbooks with optional category filter
  - Seeds default playbooks if `seedDefaults=true` and user has none
- `createPlaybook({ name, description?, category, trigger, conditions, actions, confidenceThreshold?, requiresApproval?, enabled? })` → `{ playbook }`
  - Creates a new custom playbook
- `updatePlaybook({ id, name?, description?, trigger?, conditions?, actions?, confidenceThreshold?, requiresApproval?, enabled? })` → `{ playbook }`
  - Updates existing playbook (cannot edit default playbooks)
- `deletePlaybook({ id })` → `{ ok }`
  - Deletes playbook (cannot delete default playbooks)
- `clonePlaybook({ id })` → `{ playbook }`
  - Clones any playbook (including defaults) for customization
- `getPlaybookExecutions({ playbookId?, limit? })` → `{ executions }`
  - Returns execution history for playbooks

**Google Analytics:**

- `updateGoogleAnalyticsProperty({ propertyId, propertyName? })` → `{ success }`
  - Updates the selected GA4 property in connection metadata
  - Used when user switches between multiple properties
- `disconnectGoogleAnalytics()` → `{ success }`
  - Revokes OAuth tokens from Google and deletes the connection
  - Removes access from user's Google account
- `checkGA4AIReviewCooldown()` → `{ canGenerate, lastReviewAt?, nextAvailableAt?, hoursRemaining }`
  - Checks if user can generate a GA4 AI review (24-hour cooldown enforced)
  - Returns cooldown status and time until next available review
- `getGA4AIReviewHistory({ propertyId? })` → `{ reviews }`
  - Returns last 10 GA4 AI reviews for the user
  - Optional property filter
- `generateGA4AIReview()` → `{ id, summary, insights, createdAt }`
  - Generates AI-powered review of GA4 analytics data for last 30 days
  - Returns structured insights: problems, suggestions, tips, remedial actions
  - Enforces 24-hour cooldown between reviews
  - Uses OpenAI GPT-4o-mini for analysis

**Meta Ads:**

- `getMetaAdsData()` → `{ campaigns, adsets }`
  - Returns campaign and ad set data for connected Meta Ads account
  - Requires active Meta Ads connection with selected ad account
- `updateMetaAdsAccount({ adAccountId, adAccountName? })` → `{ success }`
  - Updates the selected Meta Ads account in connection metadata
  - Used when user switches between multiple ad accounts
- `disconnectMetaAds()` → `{ success }`
  - Revokes OAuth tokens from Meta and deletes the connection
- `checkMetaAdsAIReviewCooldown()` → `{ canGenerate, lastReviewAt?, nextAvailableAt?, hoursRemaining }`
  - Checks if user can generate a Meta Ads AI review (24-hour cooldown enforced)
  - Returns cooldown status and time until next available review
- `getMetaAdsAIReviewHistory({ adAccountId? })` → `{ reviews }`
  - Returns last 10 Meta Ads AI reviews for the user
  - Optional ad account filter
- `generateMetaAdsAIReview()` → `{ id, summary, insights, createdAt }`
  - Generates AI-powered review of Meta Ads performance for last 30 days
  - Returns structured insights: campaigns to stop/scale/optimize, ad set performance, budget recommendations
  - Enforces 24-hour cooldown between reviews
  - Uses OpenAI GPT-4o-mini for analysis
- `updateCampaignStatus({ campaignId, status })` → `{ success }`
  - Updates campaign status (PAUSED, ACTIVE, etc.) via Meta Ads API
  - Requires Meta Ads connection with active ad account

**Payment Management:**

- `getAvailablePlans({ currency?, country? })` → `{ currency, plans }`
  - Returns available subscription plans with pricing
- `createCheckoutSession({ planType, currency?, country? })` → `{ subscriptionId, checkoutUrl, status }`
  - Creates Razorpay subscription and returns checkout URL
- `getSubscriptionStatus()` → `{ status, subscriptionId?, planType?, currentPeriodEnd?, razorpayStatus? }`
  - Returns current subscription status from Razorpay
- `cancelSubscription({ cancelAtPeriodEnd? })` → `{ ok, subscription }`
  - Cancels active subscription (immediately or at period end)

Notes:

- Both `ordersRecent` and `orderGet` resolve the `Connection` by `shop` (domain) and require an existing connection; otherwise they return an empty list/null safely.
- All queries and mutations (except public ones) require authentication via NextAuth
- Rate limiting applied: API (100/min), AI (10/min), Email (20/min)

#### Mutations

**AI & Actions:**

- `aiSuggestReply({ customerMessage, orderSummary?, tone, customerEmail?, orderId? })` → `{ suggestion: string }`
  - Uses OpenAI API to generate personalized replies with order context
  - Falls back to heuristic response if OpenAI is unavailable
  - Includes store name and support email in signature
- `actionCreate({ shop, shopifyOrderId, email?, type, note?, draft? })` → `{ actionId }`
  - Creates `Action` row and logs `action.created` event
- `actionApproveAndSend({ actionId, to, subject, body })` → `{ ok, status, messageId? }`
  - Marks action approved and sends real email via Mailgun API
  - Checks usage limits before sending
  - Increments email usage counter
  - Removes placeholder text and ensures proper signature

**Email Management:**

- `createEmailAlias({ userEmail, domain, shop })` → `{ id, alias }`
  - Generates a unique email alias for a Shopify store with webhook secret
  - Includes environment-specific suffix (local/staging/production)
- `rotateAlias({ id })` → `{ ok, connection }`
  - Regenerates alias and webhook secret for an existing email connection
- `setAliasStatus({ id, disabled })` → `{ ok, connection }`
  - Enable or disable an email alias
- `sendUnassignedReply({ messageId, replyBody })` → `{ ok, messageId?, error? }`
  - Sends a reply to an unassigned email using Mailgun API
  - Checks usage limits before sending
  - Increments email usage counter
  - Uses store's support email for Reply-To

**Order Management:**

- `assignMessageToOrder({ messageId, shopifyOrderId })` → `{ ok }`
  - Manually maps an unassigned email message to a specific order
- `refreshOrderFromShopify({ shop, orderId })` → `{ ok, error? }`
  - Fetches latest order data from Shopify API and updates the database
  - Updates order name, email, total amount, and status

**Store Management:**

- `updateUserProfile({ name? })` → `{ user }`
  - Updates current user's profile information
- `updateStoreName({ connectionId, storeName })` → `{ ok }`
  - Updates the display name for a connected Shopify store
- `updateConnectionSettings({ connectionId, supportEmail?, storeName? })` → `{ ok, connection }`
  - Updates support email and store name for email branding
- `disconnectStore({ connectionId })` → `{ ok, shopDomain }`
  - Removes Shopify connection and all related data (orders, messages, actions, threads)

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

**Shopify Integration:**

- `GET /api/shopify/install?shop=...`
  - Generates `state` cookie, redirects to Shopify OAuth
- `GET /api/shopify/callback?code=...&hmac=...&shop=...&state=...`
  - Verifies HMAC + state, exchanges token, saves `Connection`, registers webhooks (flagged)
  - On `MOCK_WEBHOOKS=true`, seeds mock events via `logEvent`
  - Redirects to `/integrations?connected=1&shop=...`
- `GET /api/shopify/webhooks/register?shop=...` (dev utility)
  - Re-registers webhooks for an existing connection and returns the current list

**Webhooks:**

- `POST /api/webhooks/shopify`
  - Verifies Shopify webhook HMAC signature
  - Handles events: `orders/create`, `orders/fulfilled`, `refunds/create`, `app/uninstalled`
  - Uses Redis for idempotency (24-hour TTL)
- `POST /api/webhooks/shopify/compliance`
  - **MANDATORY** compliance webhooks for Shopify App Store
  - Handles GDPR/CPRA compliance events: `customers/data_request`, `customers/redact`, `shop/redact`
  - Verifies HMAC signature
  - Automatically deletes customer/shop data on redaction requests
  - Logs data requests for merchant follow-up (30-day response required)
- `POST /api/webhooks/email/custom`
  - Mailgun inbound email webhook handler
  - Verifies Mailgun signature (optional MAILGUN_SIGNING_KEY)
  - Parses email (JSON and form-data formats)
  - Correlates to orders by order number and email
  - Triggers Inngest event for AI suggestion generation
  - Rate limited, size capped (25MB)
  - Uses Redis for idempotency (24-hour TTL)
- `POST /api/webhooks/razorpay`
  - Razorpay payment webhook handler
  - Verifies webhook signature
  - Handles events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment.failed`
  - Updates subscription status in database

**Playbook Execution:**

- `POST /api/playbooks/execute`
  - Executes matching playbooks for a trigger event
  - Evaluates conditions and confidence scores
  - Handles auto-execution or manual approval
- `POST /api/playbooks/parse-intent`
  - Parses email intent using AI for playbook trigger matching
- `POST /api/playbooks/seed`
  - Seeds default playbooks for a user

**AI Insights:**

- `POST /api/ai/generate-insight`
  - Generates AI-powered business insights from analytics data

**Google Analytics Integration:**

- `GET /api/google-analytics/install`
  - Initiates Google OAuth 2.0 flow for Google Analytics
  - Redirects to Google consent screen with required scopes
- `GET /api/google-analytics/callback?code=...&state=...`
  - Handles OAuth callback from Google
  - Exchanges authorization code for access and refresh tokens
  - Fetches GA4 properties and stores connection in database
  - Redirects to `/integrations?ga_connected=1` on success

**Meta Ads Integration:**

- `GET /api/meta-ads/install`
  - Initiates Meta OAuth 2.0 flow for Meta Ads API
  - Redirects to Meta consent screen with required scopes
- `GET /api/meta-ads/callback?code=...&state=...`
  - Handles OAuth callback from Meta
  - Exchanges authorization code for access and refresh tokens
  - Fetches ad accounts and stores connection in database
  - Redirects to `/integrations?meta_ads_connected=1` on success

**Inngest:**

- `POST /api/inngest`
  - Inngest webhook endpoint for function invocation

**tRPC & Auth:**

- `GET /api/trpc/[trpc]`
  - tRPC handler endpoint for the client hooks
- `GET /api/auth/*`
  - NextAuth routes (provided by NextAuth)
  - `NEXTAUTH_URL` must be set to the tunnel URL during development
