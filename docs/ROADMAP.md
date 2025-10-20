## Roadmap

### Phase 1 — MVP hardening

- Replace AI stub with OpenAI (responses with order context)
- Real email send (Resend/Nodemailer/SMTP)
- Basic audit UI: actions/events timeline per order
- Allowed dev origins config and production env hardening

### Phase 2 — Inbox maturity

- Inbound email via parse webhooks and/or IMAP
- Threading: `Thread`/`Message` storage, conversation context
- Smart templates, tone control, multi-language support
- SLA timers, reminders, collision prevention

Optional enhancements (Email & AI)

- Provider signature verification alternatives (Postmark) alongside Mailgun
- Attachment ingestion: store in object storage (S3/R2), preview in UI
- Async AI pipeline via worker: summarize, classify, suggest action
- Better order correlation heuristics (regex, fuzzy, recent-window ranking)
- Outbound sending domain/identity management and DKIM alignment
- Per-tenant rate limits and abuse detection for inbound

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
