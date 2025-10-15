## Architecture

### High-Level Components

- Web (Next.js): UI, NextAuth, API routes (OAuth/webhooks), tRPC handler
- API (tRPC server): business logic, Shopify Admin API calls
- DB (PostgreSQL via Prisma): multi-tenant data
- Worker (BullMQ): async jobs (planned)
- External: Shopify Admin API, Webhooks, Email providers

### Component Diagram

```mermaid
flowchart LR
  U[User Browser] --> W[Next.js Web]
  W <--> A[tRPC API]
  A <--> D[(PostgreSQL)]
  W -->|NextAuth| GA[Google OAuth]
  W -->|Install| S[Shopify]
  S -->|Callback| W
  S -.->|Webhooks| W
  W -.->|Queue Jobs| Q[Worker]
  Q <--> R[(Redis)]
```

### Shopify OAuth Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant W as Next.js Web
  participant S as Shopify
  participant D as DB
  U->>W: /api/shopify/install?shop=...
  W->>S: Redirect to authorization screen
  S->>W: Callback with code + hmac
  W->>S: Exchange code for access_token
  W->>D: Save Connection(shop, access_token, userId)
  W-->>U: Redirect /integrations?connected=1
```

### Data Access

- tRPC reads Connection for a shop to call Shopify Admin API (non-protected endpoints)
- Prisma handles multi-tenant scoping via `userId` on `Connection`

### Webhooks

- HMAC verified endpoint receives Shopify webhooks
- `PROTECTED_WEBHOOKS` gate prevents registering protected topics unless approved
- `MOCK_WEBHOOKS` can seed `Event` rows for local/dev

### Security Considerations

- Validate Shopify HMAC on callback and webhooks
- OAuth `state` cookie for CSRF protection
- Host over HTTPS with a tunnel during development

### Scaling Notes

- Move Shopify fetches to background worker for polling/sync
- Cache hot reads (orders) with Redis
- Add per-tenant rate limiting and isolation
