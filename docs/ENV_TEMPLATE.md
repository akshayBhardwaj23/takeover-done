# Environment Variables Template

## File Locations

1. `/apps/web/.env.local` - Web app environment variables
2. `/packages/db/.env` - Database connection for Prisma

## `/apps/web/.env.local`

```bash
# ============================================
# DATABASE (SHARED - get from team lead)
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&pgbouncer=true&connection_limit=1"

# ============================================
# NEXTAUTH
# ============================================
# SHARED: Same secret for all developers
NEXTAUTH_SECRET="your-secret-key-here"

# INDIVIDUAL: Your own subdomain
NEXTAUTH_URL="https://yourname.zyyp.ai"

# ============================================
# GOOGLE OAUTH (SHARED - get from team lead)
# ============================================
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# ============================================
# SHOPIFY (SHARED - get from team lead)
# ============================================
SHOPIFY_CLIENT_ID="xxxxx"
SHOPIFY_CLIENT_SECRET="xxxxx"
SHOPIFY_WEBHOOK_SECRET="xxxxx"

# INDIVIDUAL: Your own subdomain (same as NEXTAUTH_URL)
SHOPIFY_APP_URL="https://yourname.zyyp.ai"

# ============================================
# MAILGUN (SHARED - get from team lead)
# ============================================
MAILGUN_API_KEY="xxxxx"
MAILGUN_SIGNING_KEY="xxxxx"
MAILGUN_DOMAIN="mg.yourdomain.com"

# ============================================
# OPENAI (SHARED - get from team lead)
# ============================================
OPENAI_API_KEY="sk-xxxxx"

# ============================================
# REDIS (Optional - for background jobs)
# ============================================
REDIS_URL="redis://localhost:6379"
# Or use Upstash for cloud Redis:
# REDIS_URL="rediss://:password@host:port"

# ============================================
# SENTRY (Production Error Monitoring)
# ============================================
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"

# ============================================
# FEATURE FLAGS (Optional)
# ============================================
PROTECTED_WEBHOOKS=true
MOCK_WEBHOOKS=false
NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN="mg.yourdomain.com"
```

## `/packages/db/.env`

```bash
# Same DATABASE_URL as in apps/web/.env.local
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&pgbouncer=true&connection_limit=1"
```

## Getting the Values

### Shared Values (Ask Team Lead)

- `DATABASE_URL` - Supabase or PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for session encryption
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `SHOPIFY_CLIENT_ID` & `SHOPIFY_CLIENT_SECRET` - From Shopify Partner Dashboard
- `SHOPIFY_WEBHOOK_SECRET` - From Shopify app settings
- `MAILGUN_API_KEY`, `MAILGUN_SIGNING_KEY`, `MAILGUN_DOMAIN` - From Mailgun dashboard
- `OPENAI_API_KEY` - From OpenAI platform
- `NEXT_PUBLIC_SENTRY_DSN` - From Sentry project settings (only needed for production)

### Individual Values (You Set)

- `NEXTAUTH_URL` - Your Cloudflare tunnel URL (e.g., `https://john.zyyp.ai`)
- `SHOPIFY_APP_URL` - Same as your `NEXTAUTH_URL`

## Quick Setup

```bash
# 1. Create the env files
touch apps/web/.env.local
touch packages/db/.env

# 2. Copy the template above into each file
# 3. Ask your team lead for the SHARED values
# 4. Set your INDIVIDUAL values (your subdomain)
# 5. Save and restart your dev server
```

## Verification

Test your environment setup:

```bash
# Test database connection
cd packages/db
pnpm prisma studio
# Should open a browser with your database

# Test web app
cd apps/web
pnpm dev
# Should start without errors

# Test public access
curl https://yourname.zyyp.ai
# Should return HTML (not connection error)
```

## Troubleshooting

### "DATABASE_URL is not defined"

- Check that `DATABASE_URL` exists in both files
- Verify no typos in the variable name
- Restart your terminal/IDE

### "Invalid DATABASE_URL"

- Check the connection string format
- Verify credentials are correct
- Test connection with `psql` or a database client

### "NextAuth configuration error"

- Verify `NEXTAUTH_URL` matches your tunnel URL
- Check `NEXTAUTH_SECRET` is set (any random string works)
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### "Shopify OAuth fails"

- Verify `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`
- Check `SHOPIFY_APP_URL` matches your tunnel URL
- Ensure your tunnel is running

## Security Notes

1. **Never commit `.env.local` or `.env` files to Git**
2. **Never share credentials in public channels**
3. **Use a password manager to share credentials securely**
4. **Rotate secrets if they're accidentally exposed**

## Production Environment

For production deployment, set these environment variables in your hosting platform (Vercel, Railway, etc.). The values will be different from development:

- `NEXTAUTH_URL` → Your production domain (e.g., `https://app.yourdomain.com`)
- `DATABASE_URL` → Production database connection string
- All API keys should be production keys, not test/development keys
