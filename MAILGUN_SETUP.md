# Mailgun Email Sending Setup

To enable real email sending through Mailgun, add these environment variables to your `.env.local` file:

## Required Environment Variables

```bash
# Mailgun API Configuration
MAILGUN_API_KEY=your-mailgun-api-key-here
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=support@your-domain.com  # Optional, defaults to support@{MAILGUN_DOMAIN}

# Already configured (for receiving emails)
MAILGUN_SIGNING_KEY=your-mailgun-signing-key-here
```

## How to Get These Values

### 1. Mailgun API Key

1. Go to your [Mailgun Dashboard](https://app.mailgun.com/)
2. Navigate to **Settings** → **API Keys**
3. Copy your **Private API Key** (starts with `key-...`)
4. Use this as `MAILGUN_API_KEY`

### 2. Mailgun Domain

1. In your Mailgun dashboard, go to **Sending** → **Domains**
2. Copy your verified domain (e.g., `mg.yourdomain.com` or `yourdomain.com`)
3. Use this as `MAILGUN_DOMAIN`

### 3. From Email Address

**Important:** You don't need to create an actual email account/mailbox for this!

1. Choose any email address from your verified domain
2. Common options: `support@yourdomain.com`, `noreply@yourdomain.com`, `hello@yourdomain.com`
3. Use this as `MAILGUN_FROM_EMAIL`
4. Mailgun will send emails that appear to come from this address
5. **No mailbox creation needed** - it's just a "From" identifier

**Example:**

```bash
# If your verified domain is "zyyp.ai"
MAILGUN_DOMAIN="zyyp.ai"
MAILGUN_FROM_EMAIL="support@zyyp.ai"  # This doesn't need to exist as a real mailbox
```

**Pro Tip:** You can also use a display name:

```bash
MAILGUN_FROM_EMAIL="ZYYP Support <support@zyyp.ai>"
```

This will show "ZYYP Support" as the sender name in email clients.

## Testing

Once configured:

1. Restart your development server
2. Try sending a reply from the inbox
3. Check your Mailgun logs to confirm delivery

## Fallback Behavior

If Mailgun is not configured:

- Emails will be logged as "stub" sends
- Actions will be marked as `APPROVED` instead of `EXECUTED`
- You'll see "Reply logged (Mailgun not configured)" message
