# AI E-Commerce Support Platform

AI-powered customer support automation for Shopify merchants. Automatically read support emails, map them to orders, and suggest intelligent actions.

## 🚀 Quick Start

### For Team Members

**Setting up for the first time?** → See [docs/setup/DEVELOPMENT_SETUP.md](./docs/setup/DEVELOPMENT_SETUP.md)

### For Production

See [docs/operations/RUNBOOK.md](./docs/operations/RUNBOOK.md)

## 📚 Documentation

**📖 [Full Documentation Index](./docs/README.md)** - All documentation organized by category

### Quick Links

- **[Development Setup](./docs/setup/DEVELOPMENT_SETUP.md)** - Team member setup guide
- **[Architecture](./docs/architecture/ARCHITECTURE.md)** - Technical architecture
- **[Deployment Guide](./docs/deployment/README.md)** - Production deployment
- **[Runbook](./docs/operations/RUNBOOK.md)** - Operations and deployment guide
- **[API Reference](./docs/architecture/API_REFERENCE.md)** - tRPC API documentation
- **[Roadmap](./docs/planning/ROADMAP.md)** - Feature roadmap and todos
- **[PRD](./docs/planning/PRD.md)** - Product Requirements Document
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
- **Auth**: NextAuth.js (Google OAuth)
- **Integrations**: Shopify OAuth, Mailgun (email), OpenAI (AI suggestions)
- **Infrastructure**: Cloudflare Tunnel, Inngest (background jobs), Upstash Redis (optional)
- **Monitoring**: Sentry (error tracking)

## 🌟 Key Features

- ✅ Shopify OAuth integration
- ✅ Custom email ingestion (Mailgun)
- ✅ AI-powered email-to-order mapping (hybrid heuristic + AI)
- ✅ AI-suggested replies and actions (OpenAI-powered)
- ✅ Modern inbox UI with order management
- ✅ Per-store email aliases with rotation and disable features
- ✅ Real-time order sync from Shopify
- ✅ Real email sending via Mailgun API
- ✅ Toast notifications and loading states for better UX
- ✅ **Dual Analytics Dashboards**:
  - AI Support Analytics (response time, ROI, customer satisfaction, volume trends)
  - Shopify Business Analytics (revenue, orders, customers, AOV, growth metrics)
- ✅ Skeleton loaders for improved perceived performance
- ✅ Background job processing (Inngest - serverless, event-driven)
- ✅ Per-store email aliases with rotation and disable features
- ✅ Store support email configuration (per-store support email and store name)

## 🔐 Environment Setup

### Shared Resources (Same for All Developers)

- Database (Supabase/PostgreSQL)
- API Keys (Shopify, Mailgun, OpenAI, Google OAuth)

### Individual Resources (Each Developer Needs)

- Cloudflare Tunnel (your own subdomain: `yourname.zyyp.ai`)
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

# Start your Cloudflare tunnel (in another terminal)
cloudflared tunnel run yourname-dev
```

Your app will be available at:

- Local: http://localhost:3000
- Staging: https://staging.zyyp.ai
- Production: https://www.zyyp.ai

## 🤝 Team Development

### Key Points:

1. **Database is shared** - all developers use the same database
2. **Each developer needs their own Cloudflare tunnel** - this is critical!
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
- **Orders not appearing**: Re-register Shopify webhooks via `/api/shopify/webhooks/register?shop=...`
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
