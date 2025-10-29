# AI E-Commerce Support Platform

AI-powered customer support automation for Shopify merchants. Automatically read support emails, map them to orders, and suggest intelligent actions.

## 🚀 Quick Start

### For Team Members

**Setting up for the first time?** → See [docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md)

### For Production

See [docs/RUNBOOK.md](./docs/RUNBOOK.md)

## 📚 Documentation

- [**DEVELOPMENT_SETUP.md**](./docs/DEVELOPMENT_SETUP.md) - Team member setup guide
- [**RUNBOOK.md**](./docs/RUNBOOK.md) - Operations and deployment guide
- [**PROJECT_OVERVIEW.md**](./docs/PROJECT_OVERVIEW.md) - Architecture and features
- [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - Technical architecture
- [**INTEGRATIONS.md**](./docs/INTEGRATIONS.md) - Shopify and email integration
- [**API_REFERENCE.md**](./docs/API_REFERENCE.md) - tRPC API documentation
- [**ROADMAP.md**](./docs/ROADMAP.md) - Feature roadmap and todos
- [**MAILGUN_SETUP.md**](./MAILGUN_SETUP.md) - Mailgun email configuration guide

## 🏗️ Architecture

```
ai-ecom-tool/
├── apps/
│   ├── web/          # Next.js frontend + API routes
│   └── worker/       # Background job processor (BullMQ)
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
- **Infrastructure**: Cloudflare Tunnel, BullMQ (Redis)

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
- ✅ Analytics dashboard with key metrics
- ✅ Skeleton loaders for improved perceived performance
- 🔄 Background job processing (Redis/BullMQ - planned for production)

## 🔐 Environment Setup

### Shared Resources (Same for All Developers)

- Database (Supabase/PostgreSQL)
- API Keys (Shopify, Mailgun, OpenAI, Google OAuth)

### Individual Resources (Each Developer Needs)

- Cloudflare Tunnel (your own subdomain: `yourname.zyyp.ai`)
- Local development server

See [DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md) for detailed instructions.

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
- Public: https://yourname.zyyp.ai

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

### "Can't access my subdomain"

- Check if your Cloudflare tunnel is running
- Verify DNS propagation (can take a few minutes)
- Check `~/.cloudflared/config.yml` has correct hostname

### "Database connection failed"

- Verify `DATABASE_URL` in `packages/db/.env`
- Test connection with `pnpm prisma studio`
- Check if database is accessible from your network

### "Webhooks not working"

- Ensure your Cloudflare tunnel is running
- Check `NEXTAUTH_URL` in `.env.local` points to your subdomain
- Verify Shopify/Mailgun webhook URLs are configured correctly

See [DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md) for more troubleshooting tips.

## 📄 License

[Add your license here]

## 👥 Team

[Add your team members here]

---

**Questions?** Check the [docs/](./docs/) folder or ask your team lead!
