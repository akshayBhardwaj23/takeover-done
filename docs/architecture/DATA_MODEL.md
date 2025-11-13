## Data Model (Prisma)

Prisma schema lives in `packages/db/prisma/schema.prisma`. Key entities:

### User

- `id`, `email`, `name?`, timestamps
- 1:N with `Connection`
- 1:1 with `Subscription`
- 1:N with `Playbook`

### Subscription

- User's subscription plan and billing information
- `planType` enum: `STARTER | GROWTH | PRO | ENTERPRISE | TRIAL`
- `status`: `active | cancelled | expired | past_due`
- `currentPeriodStart`, `currentPeriodEnd`: billing cycle dates
- Payment gateway fields:
  - `paymentGateway`: `razorpay | paddle | etc`
  - `gatewaySubscriptionId`: external subscription ID
  - `gatewayCustomerId`: external customer ID
  - `gatewayPlanId`: external plan ID
  - `metadata`: additional payment metadata
- 1:N with `UsageRecord`

### UsageRecord

- Tracks usage metrics per billing period
- `periodStart`, `periodEnd`: billing period dates
- `emailsSent`, `emailsReceived`, `aiSuggestions`: usage counters
- Relation: belongs to `Subscription`

### Connection

- Integrations linked to a user
- `type` enum: `SHOPIFY | GMAIL | CUSTOM_EMAIL`
- `accessToken`, `refreshToken?`, `shopDomain?`, `metadata?`
- Metadata for `CUSTOM_EMAIL` includes:
  - `alias`: unique forwarding email address
  - `domain`: email domain
  - `shopDomain`: associated Shopify store
  - `disabled`: enable/disable flag
  - `supportEmail`: store's support email for Reply-To
  - `storeName`: store's display name

### Order

- Represents an order (primarily Shopify at present)
- `shopifyId` unique, `status`, `email?`, `totalAmount`
- `name`: customer-facing order number (e.g., #1001)
- `shopDomain`: Shopify store domain
- `connectionId`: link to Shopify connection
- Relations: 1:N `messages`, 1:N `actions`

### Thread / Message

- Email threading model for inbox conversations
- `Thread`: groups messages by customer email and subject
- `Message` has `direction` enum: `INBOUND | OUTBOUND`
- Optional relation to `Order`
- `messageId`: unique email identifier for idempotency
- `headers`: JSON with email metadata

### AISuggestion

- Generated AI reply attached to a `Message`
- Stores `reply`, `proposedAction`, `orderId?`, `confidence`
- Generated via Inngest background jobs (async processing)

### Action

- User-approved actions (e.g., send reply, refund)
- `type` enum: `REFUND | CANCEL | REPLACE_ITEM | ADDRESS_CHANGE | INFO_REQUEST | NONE`
- `status` enum: `PENDING | APPROVED | REJECTED | EXECUTED`
- `payload`: contextual data (shop, note, draft, etc.)
- `executedAt`: timestamp of execution

### Event

- Audit log for operations
- `type`, optional `entity`, `entityId`, `payload`
- Used for tracking all system events and debugging

### Playbook

- Automation workflow configuration
- `userId`: owner of playbook
- `name`, `description`: playbook metadata
- `category` enum: `REFUND_RETURN | MARKETING | FULFILLMENT | SUPPORT | INVENTORY | CUSTOM`
- `trigger`: JSON config for trigger type and settings
- `conditions`: JSON array of condition rules
- `actions`: JSON array of actions to execute
- `confidenceThreshold`: AI confidence threshold (0.0 - 1.0)
- `requiresApproval`: manual approval flag
- `enabled`: active/inactive status
- `isDefault`: system-provided template flag
- `executionCount`: total runs
- `lastExecutedAt`: last execution timestamp
- 1:N with `PlaybookExecution`

### PlaybookExecution

- Record of playbook execution
- `playbookId`: reference to parent playbook
- `status`: `pending | approved | executed | rejected | failed`
- `confidence`: AI confidence score for execution
- `triggerData`: JSON data that triggered execution
- `result`: JSON execution result
- `error`: error message if failed
- Timestamps: `createdAt`, `executedAt`

### Helpers

- `packages/db/src/index.ts` exports:
  - `prisma`: singleton Prisma client
  - `logEvent`: helper to append `Event` rows
  - `getUsageSummary`: get user's current usage and limits
  - `getUsageHistory`: get historical usage records
  - `canSendEmail`: check if user can send email based on limits
  - `incrementEmailSent`: increment email usage counter
  - `ensureSubscription`: create default trial subscription for user
  - `PLAN_LIMITS`: plan limits configuration
  - `seedDefaultPlaybooks`: seed default playbooks for user
