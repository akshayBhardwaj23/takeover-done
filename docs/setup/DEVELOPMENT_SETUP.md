# Development Setup Guide

This guide will help team members set up their own development environment.

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Git installed

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ai-ecom-tool
pnpm install
```

### 2. Environment Variables

Create `.env.local` files in the appropriate locations:

#### `/apps/web/.env.local`

```bash
# Database (SHARED - same for all developers)
DATABASE_URL="postgresql://..."  # Get from team lead

# NextAuth
NEXTAUTH_SECRET="..."  # Get from team lead
NEXTAUTH_URL="https://YOUR-SUBDOMAIN.zyyp.ai"  # Each dev has their own subdomain

# Google OAuth (SHARED)
GOOGLE_CLIENT_ID="..."  # Get from team lead
GOOGLE_CLIENT_SECRET="..."  # Get from team lead

# Shopify (SHARED)
SHOPIFY_CLIENT_ID="..."  # Get from team lead
SHOPIFY_CLIENT_SECRET="..."  # Get from team lead
SHOPIFY_WEBHOOK_SECRET="..."  # Get from team lead

# Mailgun (SHARED)
MAILGUN_API_KEY="..."  # Get from team lead
MAILGUN_SIGNING_KEY="..."  # Get from team lead
MAILGUN_DOMAIN="..."  # Get from team lead

# OpenAI (SHARED)
OPENAI_API_KEY="..."  # Get from team lead
```

#### `/packages/db/.env`

```bash
DATABASE_URL="postgresql://..."  # Same as above
```

### 3. Database Setup

Since we're sharing the database, you only need to generate the Prisma client:

```bash
cd packages/db
pnpm prisma generate
```

**Note:** DO NOT run `prisma migrate dev` unless coordinating with the team, as it will affect the shared database.

### 4. Set Up Your Own Cloudflare Tunnel (Optional)

**Note**: With Custom App connections, a tunnel is **NOT required** for Shopify integration! Orders sync via API calls, not webhooks.

A tunnel is only needed if you want to:
- Receive email webhooks (Mailgun) in localhost
- Test real-time Shopify webhooks (optional - manual sync works fine)

#### Install Cloudflare Tunnel (cloudflared)

**macOS:**

```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux:**

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**Windows:**
Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

#### Create Your Tunnel

```bash
# 1. Login to Cloudflare
cloudflared tunnel login

# 2. Create a new tunnel (use your name, e.g., "john-dev")
cloudflared tunnel create john-dev

# 3. Note the tunnel ID that gets created
# It will be saved to ~/.cloudflared/<TUNNEL_ID>.json

# 4. Create DNS record (ask team lead for subdomain)
# Example: john.zyyp.ai
cloudflared tunnel route dns john-dev john.zyyp.ai

# 5. Create config file
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

#### Config File Template (`~/.cloudflared/config.yml`)

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<YOUR_USERNAME>/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: john.zyyp.ai # Your subdomain
    service: http://localhost:3000
  - service: http_status:404
```

#### Start Your Tunnel

```bash
cloudflared tunnel run john-dev
```

**Pro Tip:** Keep this running in a separate terminal, or install as a service:

```bash
# macOS/Linux
sudo cloudflared service install
```

### 5. Start Development Servers

Now that your tunnel is running, start the app:

#### Terminal 1: Web App

```bash
cd apps/web
pnpm dev
```

#### Terminal 2: Worker (Optional - for background jobs)

```bash
cd apps/worker
pnpm dev
```

### 6. Access Your Development Environment

Your app should now be accessible at:

- Local: http://localhost:3000
- Public: https://john.zyyp.ai (via your Cloudflare tunnel)

## Important Notes

### Shared Resources

- **Database**: All developers share the same database
- **API Keys**: Shopify, Mailgun, OpenAI keys are shared
- **Auth**: Google OAuth app is shared

### Individual Resources

- **Cloudflare Tunnel**: Each developer has their own
- **Subdomain**: Each developer has their own (john.zyyp.ai, sarah.zyyp.ai, etc.)
- **NEXTAUTH_URL**: Set to your own subdomain

### Webhooks Configuration

For Shopify and Mailgun webhooks to work with your tunnel:

1. **Development Mode**: Webhooks will go to whichever tunnel is configured in the Shopify app settings
2. **Testing Webhooks**: You can use your own test Shopify store, or coordinate with the team

## Troubleshooting

### Issue: "Tunnel not working"

```bash
# Check if cloudflared is running
ps aux | grep cloudflared

# Check tunnel status
cloudflared tunnel info john-dev

# Restart tunnel
cloudflared tunnel run john-dev
```

### Issue: "Database connection failed"

```bash
# Test database connection
cd packages/db
pnpm prisma studio
```

### Issue: "Can't access subdomain"

- Check DNS propagation (can take a few minutes)
- Verify tunnel is running
- Check config.yml has correct hostname

## Team Coordination

### When to Coordinate:

1. **Database Migrations**: Only one person should run migrations at a time
2. **Shopify App Settings**: Coordinate webhook URL changes
3. **Schema Changes**: Discuss before modifying Prisma schema

### Independent Work:

1. **Frontend changes**: Can work independently
2. **Testing**: Each dev has their own tunnel for testing webhooks
3. **Local development**: No conflicts with other developers

## Alternative: Quick Testing Without Tunnel

You can develop and test the full Shopify integration **without a tunnel** using Custom App connections:

```bash
# Just run the app
cd apps/web
pnpm dev

# Visit http://localhost:3000
```

**What Works Without Tunnel:**
- ✅ Connect Shopify stores (Custom App method)
- ✅ Sync orders manually or on initial connection
- ✅ View orders in dashboard
- ✅ All Shopify functionality via API calls

**What Requires Tunnel:**
- ❌ Email webhooks (Mailgun) - only if you want to receive customer emails
- ❌ Real-time Shopify webhooks - optional, manual sync available

## Getting Help

- Database URL: Ask team lead
- API Keys: Ask team lead
- Subdomain setup: Ask team lead to create DNS record
- Cloudflare access: Ask team lead to add you to Cloudflare team

---

## Summary

**What's Shared:**
✅ Database
✅ API Keys (Shopify, Mailgun, OpenAI)
✅ Google OAuth

**What's Individual:**
✅ Cloudflare Tunnel
✅ Subdomain (yourname.zyyp.ai)
✅ Local development server

This setup allows everyone to work independently without blocking each other!
