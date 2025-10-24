## Roadmap

### Phase 1 — MVP hardening

- [ ] Replace AI stub with OpenAI (responses with order context)
- [ ] Real email send (Resend/Nodemailer/SMTP)
- [ ] Basic audit UI: actions/events timeline per order
- [x] Allowed dev origins config and production env hardening

### Phase 2 — Inbox maturity

- [x] Inbound email via parse webhooks (Mailgun Routes)
- [x] Threading: `Thread`/`Message` storage, conversation context
- [x] Modern inbox UI with order details, AI suggestions, and email threads
- [x] Refresh order data from Shopify (sync latest status and amounts)
- [ ] Smart templates, tone control, multi-language support
- [ ] SLA timers, reminders, collision prevention

Optional enhancements (Email & AI)

- [ ] Provider signature verification alternatives (Postmark) alongside Mailgun
- [ ] Attachment ingestion: store in object storage (S3/R2), preview in UI
- [ ] Async AI pipeline via worker: summarize, classify, suggest action
- [x] Better order correlation heuristics (regex, recent-window)
- [ ] Outbound sending domain/identity management and DKIM alignment
- [x] Per-tenant guardrails (size cap) and alias disable/rotate controls
- [x] Per-store email aliases (unique forwarding address per Shopify store)
- [x] Email alias management (rotate, enable/disable, health monitoring)

### Phase 3 — Shopify deep ops

- Refunds, fulfillments, cancellations from the app (with safeguards)
- Background sync jobs, delta polling, resilience
- Product and customer lookups; RFM segmentation

### Phase 4 — Platform & scale

- Multi-tenant isolation and RBAC
- Billing (Stripe), plans, metering
- Observability: tracing, logs, metrics, dashboards
- Rate limiting and abuse prevention

### Phase 5 — Advanced AI

- Tool-augmented agents for automations (refund/replace with policies)
- Hallucination defenses and factuality checks
- Human-in-the-loop workflows and approvals
