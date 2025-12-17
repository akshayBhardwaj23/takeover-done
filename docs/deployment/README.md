# Deployment Documentation

**Complete guides for deploying your AI E-Commerce Tool - Staging First, Then Production**

**Setup:** Vercel (Web Apps) + Inngest (Background Jobs)

---

## 🚀 Quick Start - Staging First

**New to deployment?** Follow this staging-first approach:

### Step 1: Set Up Staging (Start Here!)
1. 📋 **[Staging Setup Guide](./STAGING_SETUP_GUIDE.md)** - Complete staging environment setup (2-3 hours)
2. 🔑 **[Environment Variables Template](./ENV_TEMPLATE_PRODUCTION.md)** - Copy-paste ready templates

### Step 2: After Staging Works
3. 📖 **[Complete Deployment Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md)** - Detailed instructions for production
4. 📋 **[Quick Deployment Checklist](./QUICK_DEPLOYMENT_CHECKLIST.md)** - Day-by-day checklist (can use for both staging and production)

---

## 📚 Documentation Index

### Main Guides (In Order of Use)

| Document | Description | When to Use |
|----------|-------------|-------------|
| **[STAGING_SETUP_GUIDE.md](./STAGING_SETUP_GUIDE.md)** | Complete staging setup guide | **START HERE** - Set up staging first |
| **[VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md)** | Complete deployment guide (staging + production) | Detailed reference for all deployment steps |
| **[QUICK_DEPLOYMENT_CHECKLIST.md](./QUICK_DEPLOYMENT_CHECKLIST.md)** | Day-by-day checklist with tasks | Use alongside guides for tracking progress |
| **[ENV_TEMPLATE_PRODUCTION.md](./ENV_TEMPLATE_PRODUCTION.md)** | Environment variables templates | When setting up environment variables |

### Supporting Documents

| Document | Description | When to Use |
|----------|-------------|-------------|
| **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** | Pre-launch verification checklist | Before going to production |
| **[SHOPIFY_COMPLIANCE_WEBHOOKS.md](./SHOPIFY_COMPLIANCE_WEBHOOKS.md)** | Mandatory compliance webhooks documentation | Understanding GDPR/CPRA compliance |
| **[SHOPIFY_COMPLIANCE_TROUBLESHOOTING.md](./SHOPIFY_COMPLIANCE_TROUBLESHOOTING.md)** | Setup & troubleshooting for compliance webhooks | Debugging compliance webhook issues |
| **[SHOPIFY_APP_STORE_SUBMISSION.md](./SHOPIFY_APP_STORE_SUBMISSION.md)** | Complete checklist for Shopify App Store submission | Submitting app to Shopify App Store |
| **[INNGEST_SETUP.md](./INNGEST_SETUP.md)** | Inngest setup guide for background jobs | Setting up Inngest (migrated from Redis/BullMQ) |
| **[INNGEST_TESTING_GUIDE.md](./INNGEST_TESTING_GUIDE.md)** | Testing Inngest functionality | Testing Inngest functions |
| **[DASHBOARD_401_TROUBLESHOOTING.md](./DASHBOARD_401_TROUBLESHOOTING.md)** | Troubleshooting 401 errors when sending emails | Fixing authentication issues |
| **[MAILGUN_API_401_FIX.md](./MAILGUN_API_401_FIX.md)** | Fix Mailgun API 401 errors | Fixing Mailgun authentication |
| **[MAILGUN_WEBHOOK_FLOW.md](./MAILGUN_WEBHOOK_FLOW.md)** | Mailgun webhook flow explanation | Understanding email webhook behavior |
| **[WEBHOOK_DEBUG_GUIDE.md](./WEBHOOK_DEBUG_GUIDE.md)** | General webhook debugging guide | Debugging webhook issues |
| **[MIGRATION_STAGING.md](./MIGRATION_STAGING.md)** | Staging environment migration guide | Migrating to staging |
| **[SENTRY_STAGING_SETUP.md](./SENTRY_STAGING_SETUP.md)** | Sentry error tracking setup | Setting up error monitoring |
| **[VERCEL_LOGGING.md](./VERCEL_LOGGING.md)** | Vercel logging guide | Understanding Vercel logs |

---

## 🏗️ Deployment Architecture

### Overview

```
Production:
├── Web App → Vercel (main branch) → https://www.zyyp.ai
├── Background Jobs → Inngest (serverless, event-driven) → Zero Redis polling
├── Database → Supabase PostgreSQL
├── Redis → Upstash (optional, only for webhook idempotency)
└── External: Shopify, Mailgun, OpenAI

Staging:
├── Web App → Vercel Preview (staging branch) → https://staging.zyyp.ai
├── Background Jobs → Inngest (serverless, event-driven) → Zero Redis polling
├── Database → Supabase (separate or same with different schema)
├── Redis → Upstash (optional, only for webhook idempotency)
└── External: Shopify Test App, Mailgun, OpenAI
```

### Cost Breakdown (Monthly)

```
Vercel Pro Plan:            $20/month (or free for staging)
Inngest:                    FREE (50K events/month) or $20/month for more
Supabase:                   Free tier or $25/month
Upstash Redis:              FREE (optional, minimal usage ~1-2K commands/month)
────────────────────────────────────────────
Staging Total:              FREE (all free tiers)
Production Total:           $20-45/month (depending on Inngest/Supabase usage)
```

---

## 📋 Deployment Process Overview

### Phase 1: Preparation (Day 0)
- [ ] Set up all required accounts
- [ ] Prepare code and branches
- [ ] Document all credentials

### Phase 2: Infrastructure (Day 1)
- [ ] Set up databases (Supabase)
- [ ] Set up Redis (Upstash)
- [ ] Run database migrations

### Phase 3: Application Deployment (Day 2)
- [ ] Deploy web apps (Vercel)
- [ ] Set up Inngest for background jobs
- [ ] Configure environment variables

### Phase 4: Integrations (Day 3)
- [ ] Configure Shopify apps
- [ ] Set up Mailgun
- [ ] Test all integrations

### Phase 5: Testing (Day 4)
- [ ] End-to-end testing
- [ ] Verify all services
- [ ] Set up monitoring

### Phase 6: Launch (Day 5)
- [ ] Final verification
- [ ] Go live
- [ ] Monitor closely

---

## 🔑 Key Services & Accounts Needed

### Required Accounts

| Service | Purpose | Cost | Sign Up |
|---------|---------|------|---------|
| **Vercel** | Web app hosting | $20/month (Pro) | [vercel.com](https://vercel.com) |
| **Inngest** | Background jobs (serverless) | FREE (50K events/month) | [inngest.com](https://www.inngest.com) |
| **Supabase** | PostgreSQL database | Free tier available | [supabase.com](https://supabase.com) |
| **Upstash** | Redis cache/queues | Free tier available | [upstash.com](https://upstash.com) |
| **Shopify Partners** | App management | Free | [partners.shopify.com](https://partners.shopify.com) |
| **Mailgun** | Email sending/receiving | Pay-as-you-go | [mailgun.com](https://mailgun.com) |
| **Domain Registrar** | Custom domain | ~$10-15/year | Any registrar |

---

## 📖 Step-by-Step Process (Staging First!)

### Phase 1: Set Up Staging (Do This First!)

1. **Follow the Staging Guide**
   - Start with **[STAGING_SETUP_GUIDE.md](./STAGING_SETUP_GUIDE.md)**
   - Set up staging database, Redis (optional), Vercel, Inngest
   - Configure staging environment variables
   - Test everything in staging

2. **Verify Staging Works**
   - Test Shopify OAuth
   - Test email webhooks
   - Test Inngest background jobs
   - Verify all integrations

### Phase 2: Move to Production (After Staging Works)

3. **Follow the Production Guide**
   - Use **[VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md)** for production setup
   - Repeat same steps but with production environment
   - Use **[ENV_TEMPLATE_PRODUCTION.md](./ENV_TEMPLATE_PRODUCTION.md)** for production env vars

4. **Production Verification**
   - Use **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** before launch
   - Test everything end-to-end

---

## 🎯 Common Tasks

### Setting Up a New Environment

1. Create database (Supabase)
2. Create Redis instance (Upstash) or use existing with different prefixes
3. Deploy web app (Vercel)
4. Set up Inngest for background jobs
5. Configure environment variables
6. Set up integrations (Shopify, Mailgun)
7. Test end-to-end

### Updating Environment Variables

1. Go to platform dashboard (Vercel/Inngest)
2. Navigate to Environment Variables
3. Add or update variable
4. Redeploy service (automatic or manual)

### Running Database Migrations

```bash
# Set DATABASE_URL for target environment
export DATABASE_URL="postgresql://..."

# Run migrations
pnpm db:migrate

# Verify
cd packages/db
pnpm prisma studio
```

### Testing Inngest Functions

1. Check Inngest Dashboard → Functions
2. Should see functions synced
3. Trigger a test event (send test email)
4. Check Inngest Dashboard → Runs
5. Verify function executes successfully

---

## 🔧 Troubleshooting

### Quick Fixes

| Issue | Solution | Reference |
|-------|----------|-----------|
| Build fails | Check `transpilePackages` in `next.config.mjs` | [Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#troubleshooting) |
| DB connection fails | Verify connection pooler URL | [Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#database-setup-postgresql) |
| Inngest functions not running | Check `INNGEST_EVENT_KEY` and sync status | [Guide](./INNGEST_SETUP.md) |
| Webhooks not received | Verify URLs and secrets | [Guide](./WEBHOOK_DEBUG_GUIDE.md) |
| 401 when sending emails | Authentication/session issue | [Guide](./DASHBOARD_401_TROUBLESHOOTING.md) |
| Mailgun 401 errors | API key configuration | [Guide](./MAILGUN_API_401_FIX.md) |
| Compliance webhook issues | HMAC verification | [Guide](./SHOPIFY_COMPLIANCE_TROUBLESHOOTING.md) |

### Getting Help

1. Check the troubleshooting section in the [complete guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#troubleshooting)
2. Review logs in each platform's dashboard
3. Check service-specific documentation
4. Contact support if needed

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ All services deployed and running
- ✅ Database migrations complete
- ✅ Inngest functions processing events successfully
- ✅ Shopify OAuth flow works end-to-end
- ✅ Email webhooks receiving and processing
- ✅ Monitoring configured and alerting
- ✅ End-to-end test passes
- ✅ SSL certificates valid
- ✅ No critical errors in logs

---

## 📞 Support Resources

### Platform Documentation

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Supabase Docs](https://supabase.com/docs)
- [Upstash Docs](https://docs.upstash.com/)
- [Shopify App Development](https://shopify.dev/docs/apps)
- [Mailgun Docs](https://documentation.mailgun.com/)

### Platform Support

- **Vercel:** [vercel.com/support](https://vercel.com/support)
- **Inngest:** [inngest.com/docs](https://www.inngest.com/docs)
- **Supabase:** [supabase.com/support](https://supabase.com/support)
- **Upstash:** [upstash.com/support](https://upstash.com/support)

---

## 🎉 Ready to Deploy?

### For Staging (Start Here):
1. ✅ Read the [Staging Setup Guide](./STAGING_SETUP_GUIDE.md)
2. ✅ Set up staging infrastructure
3. ✅ Configure staging environment variables
4. ✅ Test everything in staging
5. ✅ Verify staging works end-to-end

### For Production (After Staging):
1. ✅ Follow the [Complete Deployment Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md)
2. ✅ Use the [Environment Templates](./ENV_TEMPLATE_PRODUCTION.md)
3. ✅ Review the [Production Checklist](./PRODUCTION_CHECKLIST.md)
4. ✅ Test thoroughly
5. ✅ Launch! 🚀

**Remember: Always test in staging first!**

---

## 📝 Additional Notes

### Staging vs Production

- **Staging:** Use for testing before production
- **Production:** Live environment for real users
- Always test in staging first
- Use different credentials where possible
- Monitor both environments

### Cost Optimization

- Use free tiers where possible
- Share Redis between environments (with different prefixes)
- Use same database for staging if isolation not critical
- Inngest scales automatically - no need to pause (serverless)

### Security Best Practices

- Use different secrets for production and staging
- Never commit secrets to Git
- Rotate secrets periodically
- Use strong passwords
- Enable 2FA on all accounts
- Limit access to production credentials

---

**Last Updated:** Current Date  
**Maintained by:** Development Team

