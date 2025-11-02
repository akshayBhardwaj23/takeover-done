## Solution Design

### Multi-Tenancy

- Tenants are users; `Connection.userId` associates integrations
- All requests that act on a shop resolve the `Connection` and implicitly scope by user

### AI Draft Generation

- MVP: stubbed tRPC `aiSuggestReply`
- Future: OpenAI function with order context, safety guardrails, and prompt templates
- Optional: store drafts in `AISuggestion` with trace metadata

### Actions and Events

- `actionCreate` persists intended operation with payload (e.g., email draft)
- `actionApproveAndSend` marks approved and logs `email.sent.stub` event
- Future: true email send, Shopify operations (refund/fulfillment) via worker

### Feature Flags

- `PROTECTED_WEBHOOKS`: avoids registering protected topics until approved
- `MOCK_WEBHOOKS`: seeds mock events after install

### Email Ingestion Strategy

- Short term: outbound-only stub (no delivery)
- Mid term: integrate Resend or Nodemailer + SMTP provider
- Long term: inbound parse webhooks (Mailgun/Postmark) and/or IMAP polling for custom domains; normalize into `Thread`/`Message`

### Error Handling

- Defensive try/catch around external calls; safe fallbacks in tRPC
- Event logging for critical failures (webhook register, email send)

### Security

- Shopify HMAC verification, OAuth state validation
- Secrets in env; HTTPS via tunnel; least-privilege scopes in Shopify
