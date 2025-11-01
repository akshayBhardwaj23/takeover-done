## Roadmap

### Phase 1 — MVP hardening

- [x] Replace AI stub with OpenAI (responses with order context)
- [x] Real email send (Mailgun API with fallback for unassigned emails)
- [x] Toast notifications for user feedback (success, error, warning)
- [x] Loading states and skeleton loaders across UI
- [x] **Comprehensive analytics dashboards**:
  - [x] AI Support Analytics (response time, customer satisfaction, ROI, volume trends)
  - [x] Shopify Business Analytics (revenue, orders, customers, AOV, trends)
- [ ] Basic audit UI: actions/events timeline per order
- [x] Allowed dev origins config and production env hardening

### Pre-Production Requirements

- [x] **Redis/BullMQ setup for async job processing** (COMPLETE ✅)
  - [x] Move AI suggestion generation to background worker
  - [x] Implement retry logic for OpenAI API failures (3 attempts, exponential backoff)
  - [x] Prevent webhook timeouts during high email volume
  - [x] Enable horizontal scaling with multiple worker instances
  - [x] Setup: Upstash Redis configured
  - [x] Update `REDIS_URL` in environment variables
  - [x] Benefits: Faster webhook responses (~350ms), better reliability, production-ready architecture

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
- [x] Better order correlation heuristics (regex, recent-window, AI-based matching)
- [x] Order name field for customer-facing order numbers (#1001 vs internal ID)
- [x] Email-to-order mapping by order name, email, and internal ID
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
