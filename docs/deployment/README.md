# Deployment Documentation

**Complete guides for deploying your AI E-Commerce Tool - Staging First, Then Production**

**Setup:** Vercel (Web Apps) + Railway (Workers)

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

| Document | Description |
|----------|-------------|
| **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** | Pre-launch verification checklist | Before going to production |

---

## 🏗️ Deployment Architecture

### Overview

```
Production:
├── Web App → Vercel (main branch) → https://your-app.com
├── Worker → Railway (main branch) → Background jobs
├── Database → Supabase PostgreSQL
├── Redis → Upstash
└── External: Shopify, Mailgun, OpenAI

Staging:
├── Web App → Vercel Preview (staging branch) → https://staging-your-app.vercel.app
├── Worker → Railway (staging branch) → Background jobs
├── Database → Supabase (separate or same with different schema)
├── Redis → Upstash (shared with production, different queue prefixes)
└── External: Shopify Test App, Mailgun, OpenAI
```

### Cost Breakdown (Monthly)

```
Vercel Pro Plan:            $20/month
Railway Production Worker:   $5-10/month
Railway Staging Worker:      $5/month (optional)
Supabase:                   Free tier or $25/month
Upstash Redis:              Free tier or $10/month
────────────────────────────────────────────
Total:                      $30-60/month
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
- [ ] Deploy workers (Railway)
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
| **Railway** | Worker hosting | $5-10/month | [railway.app](https://railway.app) |
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
   - Set up staging database, Redis, Vercel, Railway
   - Configure staging environment variables
   - Test everything in staging

2. **Verify Staging Works**
   - Test Shopify OAuth
   - Test email webhooks
   - Test worker processing
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
4. Deploy worker (Railway)
5. Configure environment variables
6. Set up integrations (Shopify, Mailgun)
7. Test end-to-end

### Updating Environment Variables

1. Go to platform dashboard (Vercel/Railway)
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

### Testing Worker Connection

1. Check Railway logs
2. Should see "Connected to Redis"
3. Should see "Worker started successfully"
4. Queue a test job from web app
5. Verify worker processes it

---

## 🔧 Troubleshooting

### Quick Fixes

| Issue | Solution | Reference |
|-------|----------|-----------|
| Build fails | Check `transpilePackages` in `next.config.mjs` | [Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#troubleshooting) |
| DB connection fails | Verify connection pooler URL | [Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#database-setup-postgresql) |
| Worker not processing | Check Redis connection | [Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#troubleshooting) |
| Webhooks not received | Verify URLs and secrets | [Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md#shopify-app-configuration) |

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
- ✅ Worker processing jobs successfully
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
- **Railway:** [railway.app/support](https://railway.app/support)
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
- Consider pausing staging worker when not actively testing

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

