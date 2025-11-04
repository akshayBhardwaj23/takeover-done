# Email Configuration Guide

This document describes how email sending works in the application, including the current Mailgun implementation and future SMTP integration plans.

## Current Implementation (Phase 1): Mailgun with Store Support Email

### Overview

The application uses Mailgun to send customer support emails. Each Shopify store can configure its own support email address, which appears in the Reply-To header. This allows customers to reply directly to the store's support email while emails are sent through Mailgun's infrastructure.

### How It Works

1. **Email Sending:**
   - Emails are sent FROM: `"Store Name <support@mail.zyyp.ai>"`
   - Reply-To header is set to: `support@theirstore.com` (store's configured support email)
   - This allows customers to see the store name but reply to the store's actual email

2. **Store Configuration:**
   - Each Shopify connection can have a `supportEmail` and `storeName` in its metadata
   - Configured via `updateConnectionSettings` tRPC mutation
   - If not configured, defaults to generic `support@mail.zyyp.ai`

3. **Email Routes:**
   - Uses environment-specific aliases for routing:
     - Local: `in+shop-xxx-local@mail.zyyp.ai`
     - Staging: `in+shop-xxx-staging@mail.zyyp.ai`
     - Production: `in+shop-xxx@mail.zyyp.ai`
   - Mailgun routes forward emails to appropriate webhook URLs based on alias pattern

### Configuration

**Store Support Email:**

```typescript
// Via tRPC mutation
updateConnectionSettings({
  connectionId: 'connection-id',
  supportEmail: 'support@theirstore.com',
  storeName: 'Their Store Name', // Optional
});
```

**Email Format:**

- FROM: `"Their Store Name <support@mail.zyyp.ai>"`
- Reply-To: `support@theirstore.com`
- TO: `customer@example.com`

### Benefits

- **Professional appearance:** Store name appears in FROM field
- **Direct replies:** Customers can reply directly to store's email
- **Single domain:** Works with Mailgun free tier (one domain limit)
- **Brand consistency:** Each store appears to send from their own brand

### Limitations

- FROM address must use verified Mailgun domain (`mail.zyyp.ai`)
- Store's support email domain does not need to be verified in Mailgun
- Free tier has 5,000 emails/month limit

---

## Future Implementation (Phase 2): SMTP Integration

### Overview

Allow stores to connect their own Gmail/Outlook SMTP accounts to send emails directly from their own email addresses. This provides better deliverability and allows stores to use their own domain.

### Architecture

**Connection Metadata Schema:**

```typescript
Connection.metadata = {
  // Current fields
  supportEmail: string,
  storeName: string,

  // Future SMTP fields
  smtpProvider: 'MAILGUN' | 'GMAIL' | 'OUTLOOK',
  smtpConfig?: {
    host: string,        // e.g., smtp.gmail.com
    port: number,        // e.g., 587
    user: string,        // encrypted
    password: string,    // encrypted (or OAuth token)
    secure: boolean,     // TLS/SSL
    authMethod: 'password' | 'oauth2'
  }
}
```

### Implementation Plan

#### 1. Add SMTP Provider Selection

**File:** `packages/api/src/index.ts`

- Add `smtpProvider` field to Connection metadata
- Default to `'MAILGUN'` for existing connections
- Allow switching between providers

#### 2. SMTP Credential Storage

**Encryption:**

- Use existing `encryptSecure` function for SMTP passwords
- Store OAuth tokens encrypted in `smtpConfig`
- Never store credentials in plain text

**Storage:**

- Store in `Connection.metadata.smtpConfig`
- Encrypt sensitive fields: `user`, `password`, `refreshToken`

#### 3. OAuth Flow for Gmail/Outlook

**Gmail OAuth:**

- Use Google OAuth 2.0
- Request `https://www.googleapis.com/auth/gmail.send` scope
- Store access token and refresh token (encrypted)

**Outlook OAuth:**

- Use Microsoft Graph OAuth 2.0
- Request `https://graph.microsoft.com/Mail.Send` scope
- Store access token and refresh token (encrypted)

**Similar to Shopify OAuth:**

- Create `/api/gmail/oauth/start` and `/api/gmail/oauth/callback` routes
- Create `/api/outlook/oauth/start` and `/api/outlook/oauth/callback` routes
- Store tokens in Connection metadata

#### 4. Email Sending Logic

**File:** `packages/api/src/index.ts`

**Update `approveSend` and `sendUnassignedReply` mutations:**

```typescript
// Check provider
const smtpProvider = metadata.smtpProvider || 'MAILGUN';

if (smtpProvider === 'MAILGUN') {
  // Existing Mailgun logic
} else if (smtpProvider === 'GMAIL' || smtpProvider === 'OUTLOOK') {
  // Use nodemailer with SMTP config
  await sendViaSMTP({
    from: storeSupportEmail, // Can use actual store email
    to: toEmail,
    subject,
    body,
    smtpConfig: metadata.smtpConfig,
  });
}
```

**SMTP Sending Function:**

```typescript
import nodemailer from 'nodemailer';

async function sendViaSMTP({ from, to, subject, body, smtpConfig }) {
  const decryptedConfig = {
    ...smtpConfig,
    user: decryptSecure(smtpConfig.user),
    password: decryptSecure(smtpConfig.password),
  };

  const transporter = nodemailer.createTransport({
    host: decryptedConfig.host,
    port: decryptedConfig.port,
    secure: decryptedConfig.secure,
    auth: {
      user: decryptedConfig.user,
      pass: decryptedConfig.password,
    },
  });

  return transporter.sendMail({
    from,
    to,
    subject,
    text: body,
  });
}
```

#### 5. OAuth Token Refresh

**Background Job:**

- Check token expiration before sending
- Refresh if expired using refresh token
- Update Connection metadata with new tokens
- Handle refresh failures gracefully (fallback to Mailgun or notify user)

#### 6. UI Integration

**Files to modify:**

- `apps/web/app/integrations/page.tsx`

**Add:**

- "Connect Email Account" button for each Shopify store
- OAuth flow UI
- SMTP provider selector (Mailgun/Gmail/Outlook)
- Settings to configure support email and store name

#### 7. Fallback Logic

**When SMTP fails:**

- Log error
- Optionally fallback to Mailgun
- Notify user of failure
- Store error for debugging

**Error Handling:**

- Invalid credentials
- Network issues
- Rate limits
- OAuth token expiration

### Benefits of SMTP Integration

1. **Better Deliverability:**
   - Emails sent from store's own domain
   - Better sender reputation
   - Lower spam rates

2. **Brand Consistency:**
   - FROM address shows store's actual email
   - No mention of `mail.zyyp.ai`

3. **No Mailgun Limits:**
   - Stores use their own email quotas
   - No per-month email limits from Mailgun

4. **Existing Infrastructure:**
   - Stores may already have Gmail/Outlook setup
   - No need to configure Mailgun

### Migration Path

1. **Phase 1 (Current):** Mailgun with Reply-To
2. **Phase 2:** Add SMTP option (optional, opt-in)
3. **Phase 3:** Make SMTP default for new stores
4. **Phase 4:** Migrate existing stores gradually

### Testing Considerations

- Test Gmail OAuth flow
- Test Outlook OAuth flow
- Test SMTP sending with various providers
- Test token refresh mechanism
- Test fallback to Mailgun
- Test error handling

### Security Considerations

- Encrypt all SMTP credentials
- Never log passwords or tokens
- Use secure OAuth flows
- Implement token refresh securely
- Validate email domains before sending

---

## Environment Variables

### Current (Mailgun)

```bash
MAILGUN_API_KEY=key-xxx
MAILGUN_DOMAIN=mail.zyyp.ai
MAILGUN_FROM_EMAIL=support@mail.zyyp.ai
MAILGUN_SIGNING_KEY=xxx
```

### Future (OAuth - Optional)

```bash
# Gmail OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Outlook OAuth
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
```

---

## API Reference

### Current Mutations

**`updateConnectionSettings`**

- Configure support email and store name for a connection
- Input: `connectionId`, `supportEmail?`, `storeName?`
- Updates `Connection.metadata`

### Future Mutations (Planned)

**`connectSMTP`**

- Connect Gmail/Outlook account via OAuth
- Input: `connectionId`, `provider` ('GMAIL' | 'OUTLOOK')
- Returns OAuth URL

**`updateSMTPConfig`**

- Manually configure SMTP (for non-OAuth providers)
- Input: `connectionId`, `smtpConfig`
- Encrypts credentials before storing

**`testSMTP`**

- Test SMTP configuration
- Input: `connectionId`
- Sends test email to verify setup

---

## Troubleshooting

### Emails not sending

1. Check Mailgun configuration (env vars)
2. Verify store support email is configured
3. Check Mailgun dashboard for errors
4. Verify webhook routes are set up correctly

### SMTP Issues (Future)

1. Verify OAuth tokens are valid
2. Check token expiration
3. Test SMTP connection
4. Verify credentials are correct
5. Check provider rate limits

---

## Related Documentation

- [STAGING_SETUP_GUIDE.md](../deployment/STAGING_SETUP_GUIDE.md) - Mailgun setup for staging
- [MAILGUN_SETUP.md](../../MAILGUN_SETUP.md) - Basic Mailgun configuration
