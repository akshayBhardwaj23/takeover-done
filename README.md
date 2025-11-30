# AI E-Commerce Support Platform

AI-powered customer support automation for Shopify merchants. Automatically read support emails, map them to orders, and suggest intelligent actions.

## 🚀 Quick Start

### For Team Members

**Setting up for the first time?** → See [docs/setup/DEVELOPMENT_SETUP.md](./docs/setup/DEVELOPMENT_SETUP.md)

### For Production

See [docs/operations/RUNBOOK.md](./docs/operations/RUNBOOK.md)

## 📚 Documentation

**📖 [Full Documentation Index](./docs/README.md)** - All documentation organized by category

### 🎯 Main Reference Document

**👉 [PRD (Product Requirements Document)](./docs/planning/PRD.md)** - **This is the primary reference document for all features and functionality of the application.** It contains a comprehensive list of all implemented features, integrations, analytics dashboards, automation playbooks, subscription plans, and more.

### Quick Links

- **[Development Setup](./docs/setup/DEVELOPMENT_SETUP.md)** - Team member setup guide
- **[Architecture](./docs/architecture/ARCHITECTURE.md)** - Technical architecture
- **[Project Overview](./docs/architecture/PROJECT_OVERVIEW.md)** - Project structure and current status
- **[Deployment Guide](./docs/deployment/README.md)** - Production deployment
- **[Runbook](./docs/operations/RUNBOOK.md)** - Operations and deployment guide
- **[API Reference](./docs/architecture/API_REFERENCE.md)** - tRPC API documentation
- **[Roadmap](./docs/planning/ROADMAP.md)** - Feature roadmap and todos
- **[PRD](./docs/planning/PRD.md)** - **Product Requirements Document (Main Reference)**
- **[Integrations Guide](./docs/integrations/INTEGRATIONS.md)** - All integrations (Shopify, Mailgun, Google Analytics, Meta Ads)
- **[Shopify Setup Guide](./docs/integrations/SHOPIFY_SETUP.md)** - Detailed Shopify Custom App connection guide
- **[Playbooks Documentation](./docs/PLAYBOOKS.md)** - Automation playbooks guide
- **[Mailgun Setup](./docs/integrations/MAILGUN_SETUP.md)** - Mailgun email configuration guide

## 🏗️ Architecture

```
ai-ecom-tool/
├── apps/
│   ├── web/          # Next.js frontend + API routes + Inngest functions
│   └── worker/       # Background worker (legacy placeholder, using Inngest now)
├── packages/
│   ├── api/          # tRPC API definitions
│   └── db/           # Prisma schema + migrations
├── docs/             # All documentation
└── infra/            # Infrastructure configs (Cloudflare tunnel, etc.)
```

## 🔧 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: tRPC, Prisma ORM, PostgreSQL
- **Auth**: NextAuth.js (Google OAuth), Google Analytics OAuth, Meta Ads OAuth
- **Shopify**: Custom App connections (no OAuth required - works on localhost)
- **Integrations**: Shopify Admin API, Mailgun (email), OpenAI (AI suggestions), Google Analytics 4, Meta Ads (Facebook Ads)
- **Payments**: Razorpay (subscription management)
- **Infrastructure**: Cloudflare Tunnel, Inngest (background jobs), Upstash Redis (optional)
- **Monitoring**: Sentry (error tracking)

## 🌟 Key Features

### Core Support Features

- ✅ Shopify Custom App integration (works on localhost, no tunnel needed)
- ✅ Custom email ingestion (Mailgun)
- ✅ AI-powered email-to-order mapping (hybrid heuristic + AI)
- ✅ AI-suggested replies and actions (OpenAI-powered)
- ✅ Modern inbox UI with order management
- ✅ Per-store email aliases with rotation and disable features
- ✅ Real-time order sync from Shopify
- ✅ Real email sending via Mailgun API
- ✅ Store support email configuration (per-store support email and store name)

### Analytics & Insights

- ✅ **AI Support Analytics Dashboard**: Response time, ROI, customer satisfaction, volume trends
- ✅ **Shopify Business Analytics Dashboard**: Revenue, orders, customers, AOV, growth metrics
- ✅ **Google Analytics 4 Dashboard**: Sessions, users, page views, bounce rate, e-commerce metrics, traffic sources, top pages
- ✅ **Meta Ads Dashboard**: Spend, impressions, clicks, CTR, CPC, CPM, conversions, ROAS, CPA, reach, frequency, campaign breakdowns

### Automation & Workflows

- ✅ **Automation Playbooks**: No-code builder with 6-step wizard
- ✅ **8 Default Playbooks**: Pre-configured templates across 6 categories (Refund/Return, Marketing, Fulfillment, Support, Inventory, Custom)
- ✅ **AI-Powered Execution**: Automatic execution based on confidence scores
- ✅ **Approval Workflows**: Manual approval option before execution
- ✅ **Real-time Triggers**: Shopify events, email intents, scheduled tasks
- ✅ **Execution History**: Track all playbook runs and results

### Subscription & Billing

- ✅ **Multiple Subscription Plans**: TRIAL, STARTER, GROWTH, PRO, ENTERPRISE
- ✅ **Razorpay Payment Integration**: Secure payment processing
- ✅ **Usage Tracking & Limits**: Per-plan limits for emails, AI requests, stores
- ✅ **Upgrade Prompts**: Automatic notifications when approaching limits
- ✅ **Subscription Management**: View status, upgrade, cancel subscriptions
- ✅ **Multi-Currency Support**: Automatic currency detection and pricing

### Infrastructure & UX

- ✅ Background job processing (Inngest - serverless, event-driven)
- ✅ Toast notifications and loading states for better UX
- ✅ Skeleton loaders for improved perceived performance
- ✅ Rate limiting (API, AI, Email, Webhooks)
- ✅ Complete data isolation by userId (multi-tenancy)

## 🔐 Environment Setup

### Shared Resources (Same for All Developers)

- Database (Supabase/PostgreSQL)
- API Keys (Shopify, Mailgun, OpenAI, Google OAuth)

### Individual Resources (Each Developer Needs)

- Cloudflare Tunnel (optional - only for email webhooks testing; Shopify works without it)
- Local development server

See [docs/setup/DEVELOPMENT_SETUP.md](./docs/setup/DEVELOPMENT_SETUP.md) for detailed instructions.

## 🏃 Running Locally

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your values

# Generate Prisma client
cd packages/db && pnpm prisma generate

# Start development server
cd apps/web && pnpm dev

# Start your Cloudflare tunnel (optional - only needed for email webhooks)
cloudflared tunnel run yourname-dev
```

Your app will be available at:

- Local: http://localhost:3000
- Staging: https://staging.zyyp.ai
- Production: https://www.zyyp.ai

## 🤝 Team Development

### Key Points:

1. **Database is shared** - all developers use the same database
2. **Cloudflare tunnel is optional** - Only needed for email webhooks; Shopify Custom App connections work on localhost
3. **API keys are shared** - get them from team lead
4. **Coordinate on database migrations** - don't run migrations without telling the team

### Common Commands:

```bash
# Start web app
cd apps/web && pnpm dev

# Start worker
cd apps/worker && pnpm dev

# Run Prisma Studio (database GUI)
cd packages/db && pnpm prisma studio

# Generate Prisma client (after schema changes)
cd packages/db && pnpm prisma generate
```

## 📝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally with your tunnel
4. Commit: `git commit -m "feat: your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## 🐛 Troubleshooting

### Quick Fixes

- **tRPC 500 errors**: Clear `.next` cache and restart dev server
- **Orders not appearing**: Click the sync button (🔄) on the Integrations page, or check that the store connection has the correct API scopes
- **Email webhook 404**: Check that route file exists and restart dev server
- **Wrong order matched**: Order matching now prioritizes order numbers from email subject/body

### Common Issues

See [docs/operations/TROUBLESHOOTING.md](./docs/operations/TROUBLESHOOTING.md) for detailed solutions to:

- Webhook configuration and registration
- tRPC/router import failures
- Database migration issues
- Order matching problems
- Redis configuration
- UI display issues

Or check [docs/setup/DEVELOPMENT_SETUP.md](./docs/setup/DEVELOPMENT_SETUP.md) for general setup help.

## 📄 License

[Add your license here]

## 👥 Team

[Add your team members here]

---

**Questions?** Check the [docs/](./docs/) folder or ask your team lead!
