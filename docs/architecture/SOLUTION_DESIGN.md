## Solution Design

### Multi-Tenancy

- Tenants are users; `Connection.userId` associates integrations
- All requests that act on a shop resolve the `Connection` and implicitly scope by user
- Complete data isolation by `userId` across all entities

### AI Draft Generation

- **Implemented**: OpenAI GPT-4o-mini integration with order context
- Generates personalized replies with customer history, order details, and sentiment analysis
- Stores drafts in `AISuggestion` with confidence scores and proposed actions
- Async processing via Inngest to avoid webhook timeouts
- Fallback to heuristic responses if OpenAI is unavailable

### Actions and Events

- `actionCreate` persists intended operation with payload (e.g., email draft, refund request)
- `actionApproveAndSend` marks approved and sends real emails via Mailgun API
- Usage limits enforced before sending (plan-based quotas)
- All actions logged in `Event` model for audit trail

### Email Ingestion Strategy

- **Implemented**: Mailgun inbound webhooks for email ingestion
- Email parsing and normalization into `Thread`/`Message` model
- Order correlation by order number and customer email
- Per-store email aliases with environment-specific routing
- Webhook idempotency using Redis (24-hour TTL)
- Reply-To support using store's support email

### Analytics & AI Reviews

- **Google Analytics 4**: OAuth integration, property listing, comprehensive analytics data
  - AI Review feature: 24-hour cooldown, analyzes last 30 days of data
  - Structured insights: problems, suggestions, tips, remedial actions
- **Meta Ads**: OAuth integration, ad account management, performance insights
  - AI Review feature: 24-hour cooldown, analyzes last 30 days of campaigns
  - Structured insights: campaigns to stop/scale/optimize, budget recommendations
- Both use OpenAI GPT-4o-mini for analysis generation

### Subscription & Usage Tracking

- Razorpay integration for subscription management
- Plan-based usage limits (emails, AI suggestions, stores)
- Real-time usage tracking and enforcement
- Automatic trial period and upgrade prompts
- Multi-currency support (USD, INR)

### Automation Playbooks

- No-code builder with 6 categories
- 8 default playbooks (refund, exchange, re-engagement, etc.)
- AI-powered execution with confidence thresholds
- Manual approval workflows for high-value actions
- Real-time triggers: Shopify events, email intents, scheduled tasks

### Feature Flags

- `PROTECTED_WEBHOOKS`: avoids registering protected topics until approved
- `MOCK_WEBHOOKS`: seeds mock events after install (dev only)

### Error Handling

- Defensive try/catch around external calls; safe fallbacks in tRPC
- Event logging for critical failures (webhook register, email send, AI generation)
- Graceful degradation: fallback responses when services unavailable
- Retry logic in Inngest functions (3 attempts with exponential backoff)

### Security

- Shopify HMAC verification on callbacks and webhooks
- Mailgun signature verification for email webhooks
- OAuth `state` parameter for CSRF protection
- Encrypted OAuth tokens and secrets in database
- Rate limiting: API (100/min), AI (10/min), Email (20/min)
- GDPR-ready data deletion via compliance webhooks
- Secrets in environment variables; HTTPS required in production
