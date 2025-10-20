## Integrations

### Shopify

**Capabilities**

- OAuth install, token stored in `Connection`
- Non-protected Admin API reads (recent orders, single order)
- Webhook receiver with HMAC verification

**Protected topics** (require Partner approval)

- `orders/create`, `refunds/create`, `orders/fulfilled`
- Controlled by `PROTECTED_WEBHOOKS` flag

**Non-protected topics**

- `app/uninstalled`, `shop/update`, `products/create`

**Env keys**

- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`

**Sequence (install)**

```mermaid
sequenceDiagram
  participant U as User
  participant Web as Next.js /integrations
  participant S as Shopify
  participant DB as Prisma
  U->>Web: Connect store
  Web->>S: Redirect to consent
  S->>Web: Callback with code+hmac
  Web->>S: Exchange for access_token
  Web->>DB: Create Connection(userId, shopDomain, accessToken)
  Web-->>U: Redirect to /integrations?connected=1
```

**Admin API usage**

- tRPC resolves `Connection` by `shop` and uses `X-Shopify-Access-Token` for:
  - `ordersRecent` — `/admin/api/2024-07/orders.json?status=any&limit=...`
  - `orderGet` — `/admin/api/2024-07/orders/{id}.json`

**Security/HMAC verification**

- OAuth callback: compute `sha256` HMAC using `SHOPIFY_API_SECRET` over the sorted query string (all params except `hmac`), compare to `hmac` param.
- Webhooks: verify `X-Shopify-Hmac-Sha256` header equals the base64-encoded `sha256` HMAC of the raw request body using `SHOPIFY_API_SECRET`.

### Email (planned)

**Outbound**

- Short-term: stub only (no delivery)
- Options: Resend API, Nodemailer + SMTP

**Inbound**

- Route forwarded support mail to app-managed domain (e.g., `mail.<app-domain>`) via provider (Mailgun/Postmark)
- Webhook: `POST /api/webhooks/email/custom`
  - Verify shared secret (header `x-email-webhook-secret`) and provider signature (Mailgun-style) when configured
  - Parse envelope, headers, subject, text/html, attachments
  - Identify tenant via alias in `Connection.metadata.alias` (e.g., `in+<tenant>-<id>@mail.<app-domain>`) and persist `Thread`/`Message`
  - Correlate to `Order` by customer email and heuristics (order number parsing)
  - Create `AISuggestion` stub (worker pipeline recommended)

**Security**

- Webhook signing (provider-specific): Mailgun-style signature supported via `MAILGUN_SIGNING_KEY`
- `x-email-webhook-secret` header must match the per-tenant secret stored in `Connection.accessToken`
- Provider credentials in env; encrypt at rest (future)
