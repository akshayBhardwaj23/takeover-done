# Documentation Index

Welcome to the documentation! All guides are organized by category for easy navigation.

---

## 📚 Categories

### 🚀 [Setup & Development](./setup/)
Getting started guides and development environment setup.

- **[Development Setup](./setup/DEVELOPMENT_SETUP.md)** - Complete guide for setting up your development environment
- **[Environment Variables](./setup/ENV_TEMPLATE.md)** - All environment variables explained

### 🏗️ [Architecture & Design](./architecture/)
Technical architecture, data models, and API documentation.

- **[Architecture](./architecture/ARCHITECTURE.md)** - High-level system architecture
- **[Project Overview](./architecture/PROJECT_OVERVIEW.md)** - Project structure and overview
- **[Solution Design](./architecture/SOLUTION_DESIGN.md)** - Design decisions and patterns
- **[Data Model](./architecture/DATA_MODEL.md)** - Database schema and relationships
- **[API Reference](./architecture/API_REFERENCE.md)** - Complete tRPC API documentation

### 🚢 [Deployment](./deployment/)
Production deployment guides and launch readiness.

- **[Deployment Guide](./deployment/README.md)** - Complete deployment documentation (Vercel + Inngest)
- **[Staging Setup Guide](./deployment/STAGING_SETUP_GUIDE.md)** - Staging environment setup
- **[Production Checklist](./deployment/PRODUCTION_CHECKLIST.md)** - Pre-launch checklist

### 🔴 [Redis & Background Jobs](./redis/)
Everything about Redis and background job processing. Note: The project now uses Inngest for background jobs (serverless), but Redis docs remain for optional caching use cases.

- **[Redis Setup Guide](./redis/REDIS_SETUP.md)** - Complete Redis setup (Upstash, local)
- **[Local Redis Setup](./redis/LOCAL_REDIS_SETUP.md)** - Detailed local Redis guide
- **[Manual Redis Control](./redis/MANUAL_REDIS_SETUP.md)** - Start/stop Redis manually
- **[Redis Command Optimization](./redis/REDIS_COMMAND_OPTIMIZATION.md)** - Command usage optimization
- **[How Redis Helps](./redis/HOW_REDIS_HELPS.md)** - Benefits of Redis in this app
- **[Background Jobs Implementation](./redis/BACKGROUND_JOBS_IMPLEMENTATION.md)** - Background job setup (legacy BullMQ docs, now using Inngest)

### 💳 [Payments & Pricing](./payments/)
Payment integration, pricing strategy, and cost analysis.

- **[Payment Solutions](./payments/PAYMENT_SOLUTIONS.md)** - Payment gateway options
- **[Pricing Strategy](./payments/PRICING_STRATEGY.md)** - Pricing models and tiers
- **[Indian Pricing Analysis](./payments/INDIAN_PRICING_ANALYSIS.md)** - India-specific pricing
- **[Razorpay Implementation](./payments/RAZORPAY_IMPLEMENTATION.md)** - Razorpay integration details
- **[Razorpay Setup](./payments/RAZORPAY_SETUP.md)** - Razorpay configuration
- **[Razorpay Webhook Config](./payments/RAZORPAY_WEBHOOK_CONFIG.md)** - Webhook setup
- **[Monthly Cost Estimate](./payments/MONTHLY_COST_ESTIMATE.md)** - Infrastructure cost analysis

### 🔌 [Integrations](./integrations/)
Third-party service integrations.

- **[Integrations Guide](./integrations/INTEGRATIONS.md)** - Shopify, email, and other integrations
- **[Mailgun Setup](./integrations/MAILGUN_SETUP.md)** - Email sending configuration

### 🛠️ [Operations](./operations/)
Runbooks, troubleshooting, security, and monitoring.

- **[Runbook](./operations/RUNBOOK.md)** - Operations guide and procedures
- **[Troubleshooting](./operations/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Sentry Setup](./operations/SENTRY_SETUP.md)** - Error monitoring configuration
- **[Security Implementation](./operations/SECURITY_IMPLEMENTATION_COMPLETE.md)** - Security implementation status
- **[Security Fixes](./operations/SECURITY_FIXES.md)** - Security fixes and requirements
- **[Database Migration](./operations/DATABASE_MIGRATION_NEEDED.md)** - Database migration guide

### 📋 [Planning](./planning/)
Roadmap, performance, and feature planning.

- **[PRD](./planning/PRD.md)** - Product Requirements Document
- **[Roadmap](./planning/ROADMAP.md)** - Feature roadmap and todos
- **[Usage Limits Implementation](./planning/USAGE_LIMITS_IMPLEMENTATION.md)** - Feature limits and quotas
- **[Performance Explained](./planning/PERFORMANCE_EXPLAINED.md)** - Performance optimizations

---

## 🗺️ Quick Navigation by Task

### First Time Setup
1. [Development Setup](./setup/DEVELOPMENT_SETUP.md)
2. [Environment Variables](./setup/ENV_TEMPLATE.md)
3. [Local Redis Setup](./redis/LOCAL_REDIS_SETUP.md)

### Deployment
1. [Deployment Guide](./deployment/README.md)
2. [Staging Setup Guide](./deployment/STAGING_SETUP_GUIDE.md)
3. [Production Checklist](./deployment/PRODUCTION_CHECKLIST.md)

### Understanding the System
1. [Architecture](./architecture/ARCHITECTURE.md)
2. [Project Overview](./architecture/PROJECT_OVERVIEW.md)
3. [API Reference](./architecture/API_REFERENCE.md)

### Troubleshooting
1. [Troubleshooting Guide](./operations/TROUBLESHOOTING.md)
2. [Runbook](./operations/RUNBOOK.md)

---

## 📝 Document Structure

```
docs/
├── README.md (this file)
├── setup/           # Getting started guides
├── architecture/    # Technical design docs
├── deployment/      # Production deployment
├── redis/          # Redis and background jobs
├── payments/       # Payment and pricing
├── integrations/   # Third-party services
├── operations/     # Runbooks and troubleshooting
└── planning/        # Roadmap and features
```

---

## 🔍 Finding Documents

Can't find what you're looking for? Check:

- **Setup issues?** → [Setup](./setup/)
- **Deployment questions?** → [Deployment](./deployment/)
- **Redis/background jobs?** → [Redis](./redis/)
- **Payment integration?** → [Payments](./payments/)
- **Architecture questions?** → [Architecture](./architecture/)
- **Operations/runbook?** → [Operations](./operations/)

---

## 💡 Contributing

When adding new documentation:

1. Place it in the appropriate category folder
2. Update this README with a link
3. Follow the naming convention: `UPPERCASE_WITH_UNDERSCORES.md`

