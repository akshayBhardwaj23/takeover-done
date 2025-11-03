# Environment Variables Template - Production

**Copy these templates and fill in your actual values**

---

## 🌐 Vercel - Production Web App

```bash
# ============================================
# Environment
# ============================================
NODE_ENV=production
ENVIRONMENT=production
NEXTAUTH_URL=https://your-app.com

# ============================================
# Database (Supabase Production)
# ============================================
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# ============================================
# Redis (Upstash Production)
# ============================================
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# ============================================
# Authentication
# ============================================
NEXTAUTH_SECRET=[GENERATE: openssl rand -base64 32]
GOOGLE_CLIENT_ID=[FROM_GOOGLE_CLOUD_CONSOLE]
GOOGLE_CLIENT_SECRET=[FROM_GOOGLE_CLOUD_CONSOLE]

# ============================================
# Shopify (Production App)
# ============================================
SHOPIFY_API_KEY=[FROM_SHOPIFY_PARTNERS_DASHBOARD]
SHOPIFY_API_SECRET=[FROM_SHOPIFY_PARTNERS_DASHBOARD]
SHOPIFY_APP_URL=https://your-app.com
SHOPIFY_SCOPES=read_orders,write_orders,read_products
SHOPIFY_WEBHOOK_SECRET=[GENERATE: openssl rand -hex 32]

# ============================================
# Mailgun (Production)
# ============================================
MAILGUN_API_KEY=key-[FROM_MAILGUN_DASHBOARD]
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=support@your-domain.com
MAILGUN_SIGNING_KEY=[FROM_MAILGUN_SETTINGS_API_SECURITY]

# ============================================
# OpenAI
# ============================================
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_KEY]

# ============================================
# Sentry (Optional but Recommended)
# ============================================
SENTRY_DSN=https://[PROJECT_ID]@[ORG].ingest.sentry.io/[PROJECT_ID]
SENTRY_AUTH_TOKEN=[FROM_SENTRY_SETTINGS]
NEXT_PUBLIC_SENTRY_DSN=https://[PROJECT_ID]@[ORG].ingest.sentry.io/[PROJECT_ID]

# ============================================
# Feature Flags
# ============================================
PROTECTED_WEBHOOKS=true
MOCK_WEBHOOKS=false
```

---

## 🌐 Vercel - Staging/Preview Web App

```bash
# ============================================
# Environment
# ============================================
NODE_ENV=production
ENVIRONMENT=staging
NEXTAUTH_URL=https://staging-your-app.vercel.app

# ============================================
# Database (Supabase Staging)
# ============================================
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@[STAGING-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# ============================================
# Redis (Upstash - Same or Separate)
# ============================================
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# ============================================
# Authentication (Can Use Same Google OAuth)
# ============================================
NEXTAUTH_SECRET=[DIFFERENT_FROM_PRODUCTION: openssl rand -base64 32]
GOOGLE_CLIENT_ID=[SAME_OR_DIFFERENT]
GOOGLE_CLIENT_SECRET=[SAME_OR_DIFFERENT]

# ============================================
# Shopify (Staging/Test App)
# ============================================
SHOPIFY_API_KEY=[FROM_STAGING_SHOPIFY_APP]
SHOPIFY_API_SECRET=[FROM_STAGING_SHOPIFY_APP]
SHOPIFY_APP_URL=https://staging-your-app.vercel.app
SHOPIFY_SCOPES=read_orders,write_orders,read_products
SHOPIFY_WEBHOOK_SECRET=[DIFFERENT_FROM_PRODUCTION: openssl rand -hex 32]

# ============================================
# Mailgun (Staging - Can Use Same Domain or Separate)
# ============================================
MAILGUN_API_KEY=key-[FROM_MAILGUN]
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=staging@your-domain.com
MAILGUN_SIGNING_KEY=[FROM_MAILGUN]

# ============================================
# OpenAI (Can Use Same Key)
# ============================================
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_KEY]

# ============================================
# Sentry (Can Use Same Project or Separate)
# ============================================
SENTRY_DSN=https://[PROJECT_ID]@[ORG].ingest.sentry.io/[PROJECT_ID]
SENTRY_AUTH_TOKEN=[FROM_SENTRY]

# ============================================
# Feature Flags
# ============================================
PROTECTED_WEBHOOKS=true
MOCK_WEBHOOKS=false
```

---

## 🚂 Railway - Production Worker

```bash
# ============================================
# Environment
# ============================================
NODE_ENV=production
ENVIRONMENT=production

# ============================================
# Database (Same as Production Web)
# ============================================
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# ============================================
# Redis (Same as Production Web)
# ============================================
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# ============================================
# OpenAI
# ============================================
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_KEY]

# ============================================
# Feature Flags (Optional)
# ============================================
PROTECTED_WEBHOOKS=true
```

---

## 🚂 Railway - Staging Worker

```bash
# ============================================
# Environment
# ============================================
NODE_ENV=production
ENVIRONMENT=staging

# ============================================
# Database (Staging Database)
# ============================================
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@[STAGING-REF].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# ============================================
# Redis (Same or Separate)
# ============================================
REDIS_URL=rediss://default:[TOKEN]@[ENDPOINT].upstash.io:6379
UPSTASH_REDIS_REST_URL=https://[ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=AX[TOKEN]

# ============================================
# OpenAI
# ============================================
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_KEY]

# ============================================
# Feature Flags
# ============================================
PROTECTED_WEBHOOKS=true
```

---

## 🔑 How to Generate Secrets

### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### Generate SHOPIFY_WEBHOOK_SECRET
```bash
openssl rand -hex 32
```

### Generate Any Random Secret
```bash
openssl rand -hex 32
# or
openssl rand -base64 32
```

---

## 📝 Variable Reference

| Variable | Where to Get It | Required For |
|----------|----------------|--------------|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database | Web + Worker |
| `REDIS_URL` | Upstash Dashboard → Database Details | Web + Worker |
| `UPSTASH_REDIS_REST_URL` | Upstash Dashboard → REST URL | Web (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Dashboard → REST Token | Web (rate limiting) |
| `SHOPIFY_API_KEY` | Shopify Partners → App → API Credentials | Web |
| `SHOPIFY_API_SECRET` | Shopify Partners → App → API Credentials | Web |
| `SHOPIFY_WEBHOOK_SECRET` | Generate yourself (`openssl rand -hex 32`) | Web |
| `MAILGUN_API_KEY` | Mailgun Dashboard → Settings → API Keys | Web |
| `MAILGUN_SIGNING_KEY` | Mailgun Dashboard → Settings → API Security | Web |
| `OPENAI_API_KEY` | OpenAI Dashboard → API Keys | Web + Worker |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth Client | Web |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth Client | Web |
| `NEXTAUTH_SECRET` | Generate yourself (`openssl rand -base64 32`) | Web |
| `SENTRY_DSN` | Sentry Dashboard → Settings → Client Keys | Web |

---

## ✅ Verification Checklist

After adding all variables:

- [ ] All `[PLACEHOLDER]` values replaced with actual values
- [ ] No trailing spaces in variable values
- [ ] Production and staging use different secrets (where applicable)
- [ ] Database URLs use connection pooler (port 6543) for Vercel
- [ ] Redis URLs start with `rediss://` (secure connection)
- [ ] All URLs are HTTPS (except local development)
- [ ] Secrets generated are unique per environment

---

## 🔒 Security Notes

1. **Never commit these values to Git**
2. **Use different secrets for production and staging**
3. **Rotate secrets periodically** (especially if compromised)
4. **Store production secrets in password manager**
5. **Limit access** - only team members who need them
6. **Use environment-specific values** - don't mix production and staging

---

## 📞 Need Help?

- Check [VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md](./VERCEL_RAILWAY_DEPLOYMENT_GUIDE.md) for detailed setup
- See [QUICK_DEPLOYMENT_CHECKLIST.md](./QUICK_DEPLOYMENT_CHECKLIST.md) for step-by-step

