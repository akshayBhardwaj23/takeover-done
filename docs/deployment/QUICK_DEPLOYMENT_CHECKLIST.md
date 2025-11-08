# Quick Deployment Checklist

**Use this checklist alongside the [Complete Deployment Guide](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md)**

---

## ⚡ Pre-Flight (Day 0)

### Accounts Setup

- [ ] Vercel account created (Pro plan recommended)
- [ ] Supabase account created
- [ ] Upstash account created
- [ ] Inngest account created
- [ ] Shopify Partners account ready
- [ ] Mailgun account ready
- [ ] Domain purchased (if needed)
- [ ] All credentials saved in password manager

### Code Preparation

- [ ] Code pushed to GitHub
- [ ] `main` branch is production-ready
- [ ] `staging` branch exists
- [ ] `pnpm build` passes locally
- [ ] Database migrations ready
- [ ] All environment variables documented

---

## 🗄️ Day 1: Infrastructure Setup

### Database (Supabase)

- [ ] Production database created
- [ ] Staging database created (or separate schema)
- [ ] Connection strings copied
- [ ] Migrations run: `pnpm db:migrate` (production)
- [ ] Migrations run: `pnpm db:migrate` (staging)
- [ ] Prisma Studio can connect to both

### Redis (Upstash)

- [ ] Production Redis instance created
- [ ] Connection details copied (REST URL, Token, Redis URL)
- [ ] Test connection: `redis-cli -u "rediss://..." ping` returns PONG
- [ ] Staging: Same instance OR separate instance created

---

## ☁️ Day 2: Application Deployment

### Vercel (Web Apps)

#### Production

- [ ] Repository connected to Vercel
- [ ] Root directory: `apps/web`
- [ ] Build command configured
- [ ] Production branch: `main`
- [ ] Production environment variables added
- [ ] Custom domain added: `your-app.com`
- [ ] DNS records added
- [ ] First deployment successful
- [ ] SSL certificate active

#### Staging

- [ ] Staging branch: `staging` (or create it)
- [ ] Preview deployments enabled
- [ ] Staging environment variables added
- [ ] Preview URL: `staging-your-app.vercel.app`
- [ ] First staging deployment successful

### Inngest (Background Jobs)

- [ ] Inngest app created (https://app.inngest.com)
- [ ] Event Key generated and stored securely
- [ ] `INNGEST_EVENT_KEY` set in Vercel (Preview + Production)
- [ ] Web app deployed so `/api/inngest` endpoint is live
- [ ] In Inngest dashboard → select app → click **Sync** to register functions
- [ ] Trigger test event → confirm successful run in Inngest dashboard

---

## 🔌 Day 3: Integrations

### Shopify

#### Production App

- [ ] Shopify app created in Partners Dashboard
- [ ] App URL: `https://your-app.com`
- [ ] Callback URL: `https://your-app.com/api/shopify/callback`
- [ ] API Key copied → `SHOPIFY_API_KEY`
- [ ] API Secret copied → `SHOPIFY_API_SECRET`
- [ ] Webhook secret generated → `SHOPIFY_WEBHOOK_SECRET`
- [ ] Scopes configured
- [ ] Test installation successful
- [ ] Webhooks registered automatically

#### Staging App

- [ ] Separate staging app created
- [ ] App URL: `https://staging-your-app.vercel.app`
- [ ] Staging credentials added to Vercel Preview variables
- [ ] Test installation successful

### Mailgun

#### Production

- [ ] Domain added to Mailgun: `your-domain.com`
- [ ] DNS records added (MX, TXT, CNAME)
- [ ] Domain verified (24-48 hours)
- [ ] API Key copied → `MAILGUN_API_KEY`
- [ ] Signing Key copied → `MAILGUN_SIGNING_KEY`
- [ ] From email set: `support@your-domain.com`
- [ ] Route created: Forward to `https://your-app.com/api/webhooks/email/custom`
- [ ] Test email sent and received

#### Staging

- [ ] Staging domain/subdomain added (OR use same domain)
- [ ] Staging route created
- [ ] Test email sent and received

---

## ✅ Day 4: Testing & Verification

### Production Testing

- [ ] Web app loads: `https://your-app.com`
- [ ] Authentication works
- [ ] Shopify OAuth flow works
- [ ] Test order created in Shopify
- [ ] Webhook received and processed
- [ ] Inngest function processes event
- [ ] Email sent to support address
- [ ] Email webhook received
- [ ] AI suggestion generated
- [ ] "Approve & Send" works
- [ ] Email delivered via Mailgun

### Staging Testing

- [ ] All production tests repeated on staging
- [ ] No data leakage between environments

### Monitoring

- [ ] Sentry DSN configured
- [ ] Test error appears in Sentry
- [ ] Vercel Analytics visible
- [ ] Railway logs accessible
- [ ] Database monitoring active
- [ ] Redis monitoring active

---

## 🚀 Day 5: Going Live

### Final Checks

- [ ] All tests passed
- [ ] No critical errors in logs
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Support channels ready

### Launch

- [ ] Production deployment confirmed
- [ ] Inngest dashboard shows healthy runs
- [ ] First real user test
- [ ] Monitor closely for 24 hours

---

## 📊 Post-Launch (First Week)

### Daily Checks

- [ ] Error rates (Sentry)
- [ ] Inngest run success rate
- [ ] Database performance
- [ ] API usage (OpenAI, Mailgun)
- [ ] Cost monitoring (all platforms)

### Weekly Review

- [ ] Usage metrics
- [ ] User feedback
- [ ] Performance optimizations needed
- [ ] Cost review

---

## 🔧 Quick Troubleshooting Guide

| Issue                  | Quick Fix                                        |
| ---------------------- | ------------------------------------------------ |
| Build fails            | Check `transpilePackages` in `next.config.mjs`   |
| DB connection fails    | Verify connection pooler URL (port 6543)         |
| Inngest not processing | Check Event Key, sync status, and dashboard logs |
| Webhooks not received  | Verify `SHOPIFY_APP_URL` matches actual URL      |
| Email not received     | Check Mailgun route configuration                |
| Env vars not loading   | Verify environment (Production vs Preview)       |

---

## 📞 Emergency Contacts

- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **Railway Support:** [railway.app/support](https://railway.app/support)
- **Supabase Support:** [supabase.com/support](https://supabase.com/support)

---

## ✅ Success Criteria

**Ready to launch when:**

- ✅ All services deployed
- ✅ All integrations working
- ✅ End-to-end test passes
- ✅ Monitoring configured
- ✅ No critical errors

**You're ready! 🎉**
