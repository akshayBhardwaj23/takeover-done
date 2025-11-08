## Roadmap

> **MVP Status:** ✅ **READY FOR LAUNCH** - See [MVP Readiness Assessment](./MVP_READINESS_ASSESSMENT.md) for detailed status

---

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

- [x] **Background job processing setup** (COMPLETE ✅ - Using Inngest)
  - [x] Move AI suggestion generation to background worker (Inngest functions)
  - [x] Implement retry logic for OpenAI API failures (3 attempts, exponential backoff)
  - [x] Prevent webhook timeouts during high email volume
  - [x] Serverless scaling (Inngest handles scaling automatically)
  - [x] Setup: Inngest configured and deployed
  - [x] Benefits: Faster webhook responses, better reliability, production-ready architecture
  - **Note:** Using Inngest (serverless) instead of BullMQ/Redis for better scalability

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
- [x] **Store support email configuration** (COMPLETE ✅)
  - [x] Per-store support email and store name configuration
  - [x] Emails sent FROM store name with Reply-To to store's support email
  - [x] Works with Mailgun free tier (single domain)
  - [x] `updateConnectionSettings` tRPC mutation for configuration
- [ ] **SMTP integration (Gmail/Outlook)** (PLANNED)
  - [ ] OAuth flow for Gmail and Outlook
  - [ ] Store SMTP credentials securely (encrypted)
  - [ ] Switch email sending to store's SMTP when configured
  - [ ] Fallback to Mailgun if SMTP fails
  - [ ] Token refresh mechanism for OAuth
  - [ ] UI for connecting email accounts
- [ ] Outbound sending domain/identity management and DKIM alignment
- [x] Per-tenant guardrails (size cap) and alias disable/rotate controls
- [x] Per-store email aliases (unique forwarding address per Shopify store)
- [x] Email alias management (rotate, enable/disable, health monitoring)

### Phase 3 — Shopify deep ops

- Refunds, fulfillments, cancellations from the app (with safeguards)
- Background sync jobs, delta polling, resilience
- Product and customer lookups; RFM segmentation

### Phase 4 — Platform & scale

- [x] Multi-tenant isolation and RBAC (COMPLETE ✅)
  - [x] Complete data isolation by userId
  - [x] All queries scoped to user's connections
  - [x] Authentication required for all endpoints
  - [ ] Role-based access control (multi-user support - post-MVP)
- [x] Billing (Razorpay), plans, metering (COMPLETE ✅)
  - [x] Subscription management
  - [x] Usage tracking and limits
  - [x] Plan types (STARTER, GROWTH, PRO, ENTERPRISE, TRIAL)
  - [x] Upgrade prompts and limits enforcement
- [x] Observability: tracing, logs, metrics, dashboards (COMPLETE ✅)
  - [x] Sentry error tracking
  - [x] Event logging system
  - [x] Analytics dashboards
  - [x] Performance monitoring
- [x] Rate limiting and abuse prevention (COMPLETE ✅)
  - [x] API rate limiting (100 req/min)
  - [x] AI rate limiting (10 req/min)
  - [x] Email rate limiting (20 req/min)
  - [x] Webhook rate limiting (60 req/min)

### Phase 5 — Advanced AI

- Tool-augmented agents for automations (refund/replace with policies)
- Hallucination defenses and factuality checks
- Human-in-the-loop workflows and approvals
