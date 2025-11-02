## Data Model (Prisma)

Prisma schema lives in `packages/db/prisma/schema.prisma`. Key entities:

### User

- `id`, `email`, `name?`, timestamps
- 1:N with `Connection`

### Connection

- Integrations linked to a user
- `type` enum: `SHOPIFY` | `GMAIL`
- `accessToken`, `refreshToken?`, `shopDomain?`, `metadata?`

### Order

- Represents an order (primarily Shopify at present)
- `shopifyId` unique, `status`, `email?`, `totalAmount`
- Relations: 1:N `messages`, 1:N `actions`

### Thread / Message

- Basic inbox threading model (future expansion)
- `Message` has `direction` enum: `INBOUND` | `OUTBOUND`
- Optional relation to `Order`

### AISuggestion

- Generated AI reply attached to a `Message`
- Stores `reply`, `proposedAction`, `orderId?`, `confidence`

### Action

- User-approved actions (e.g., send reply, refund)
- `type` enum: `REFUND | CANCEL | REPLACE_ITEM | ADDRESS_CHANGE | INFO_REQUEST | NONE`
- `status` enum: `PENDING | APPROVED | REJECTED | EXECUTED`
- Arbitrary `payload` for contextual data

### Event

- Audit log for operations
- `type`, optional `entity`, `entityId`, `payload`

### Helpers

- `packages/db/src/index.ts` exports a singleton `prisma` client and `logEvent` helper to append `Event` rows.
