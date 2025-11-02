# Troubleshooting Guide

Common issues and their solutions based on recent fixes and improvements.

## Webhook Issues

### Shopify Orders Not Appearing

**Symptoms**: Orders created in Shopify are not saved to the database or don't appear in the frontend.

**Solutions**:

1. **Verify webhooks are registered**:
   ```bash
   # Re-register webhooks for your shop
   GET /api/shopify/webhooks/register?shop=your-shop.myshopify.com
   ```

2. **Check webhook handler logs**:
   - Look for `[Shopify Webhook] Saving order:` messages in terminal
   - Check for `[Shopify Webhook] No connection found for shop:` warnings

3. **Verify connection exists**:
   - Ensure your Shopify store is connected via `/integrations`
   - Check that `shopDomain` matches exactly (case-insensitive matching is supported)

4. **Check access token decryption**:
   - The webhook registration route now properly decrypts access tokens
   - If you see errors about invalid tokens, re-connect your store

### Email Webhook 404 Errors

**Symptoms**: Mailgun webhooks return 404 when posting to `/api/webhooks/email/custom`.

**Solutions**:

1. **Check route file exists**: Ensure `apps/web/app/api/webhooks/email/custom/route.ts` is present

2. **Verify dynamic export**: The route includes `export const dynamic = 'force-dynamic'` which is required

3. **Check server logs**: Look for any module import errors related to `isomorphic-dompurify` (this has been fixed, but if you see it, the route isn't loading)

4. **Restart dev server**: After fixes, fully restart your Next.js dev server:
   ```bash
   # Stop the server (Ctrl+C), then:
   pnpm --filter @ai-ecom/web dev
   ```

## tRPC Errors

### 500 Errors on tRPC Endpoints

**Symptoms**: All tRPC queries return 500 errors, router fails to load.

**Solutions**:

1. **Check for jsdom errors**: The error should show something about missing CSS files. This was caused by `isomorphic-dompurify` and has been fixed by replacing it with a simple HTML sanitizer.

2. **Clear Next.js cache**:
   ```bash
   rm -rf apps/web/.next
   pnpm --filter @ai-ecom/web dev
   ```

3. **Verify API package builds**:
   ```bash
   pnpm --filter @ai-ecom/api build
   ```

4. **Check terminal logs**: Look for `[tRPC]` prefixed messages that show what's failing

### Router Import Failures

**Symptoms**: `[tRPC] Failed to import appRouter:` errors in logs.

**Solutions**:

1. **Check for TypeScript errors**: Ensure `packages/api` compiles without errors
2. **Verify dependencies**: All required packages should be installed
3. **Check for circular dependencies**: Look for import cycles in the API package

## Database Issues

### Payment Gateway Column Missing

**Symptoms**: `Subscription.paymentGateway does not exist` errors.

**Solutions**:

1. **Apply pending migrations**:
   ```bash
   cd packages/db
   pnpm prisma migrate deploy
   ```

2. **Regenerate Prisma client**:
   ```bash
   pnpm prisma generate
   ```

3. **Restart dev server** to pick up new client

### Thread Creation Errors

**Symptoms**: `Argument 'connection' is missing` when creating threads.

**Solutions**:

1. **This has been fixed**: Thread creation now includes `connectionId`
2. **Verify your email connection exists**: Check that the alias is properly configured
3. **Re-process emails**: If old emails failed, new ones should work correctly

## Order Matching Issues

### Wrong Order Matched to Email

**Symptoms**: Email mentioning "Order 1003" gets matched to "Order 1004".

**Solutions**:

1. **This has been fixed**: Order matching now prioritizes order numbers from subject/body over email matching
2. **Check email content**: The system extracts order numbers from patterns like:
   - "Order 1003"
   - "#1003"
   - "order 1003"
3. **Email matching is fallback**: If no order number is found, it falls back to matching by customer email

## Redis Issues

### Upstash Redis URL Errors

**Symptoms**: `Upstash Redis client was passed an invalid URL` errors.

**Solutions**:

1. **Redis is optional**: Webhooks work without Redis (you just lose idempotency protection)
2. **Fix environment variable**: Ensure `UPSTASH_REDIS_REST_URL` is a valid URL (not a placeholder like `"https://..."`)
3. **Or leave it unset**: If you don't need idempotency, you can leave Redis env vars unset

## UI Issues

### Email Subject Not Showing

**Symptoms**: Email cards in the inbox don't show subject lines.

**Solutions**:

1. **This has been fixed**: The `messagesByOrder` query now includes `thread.subject`
2. **Refresh the page**: If you're on an old page, refresh to get updated data
3. **Check message has thread**: Ensure the email was processed correctly with a thread

### Messages Not Expanding

**Symptoms**: Clicking on email messages doesn't expand them.

**Solutions**:

1. **This has been fixed**: Messages now expand on click
2. **Clear browser cache**: If you're seeing cached JavaScript, clear your browser cache
3. **Check console**: Look for JavaScript errors that might prevent click handlers

## Environment Variables

### Required Variables

Make sure these are set in `apps/web/.env.local`:

```bash
# Database
DATABASE_URL=...

# Shopify
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_APP_URL=...

# Auth
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email (optional)
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_SIGNING_KEY=...

# Redis (optional)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# AI (optional)
OPENAI_API_KEY=...

# Encryption (optional)
ENCRYPTION_KEY=...
```

## Getting Help

If you encounter issues not covered here:

1. Check the terminal logs for detailed error messages
2. Look for `[tRPC]`, `[Shopify Webhook]`, or `[Email Webhook]` prefixed logs
3. Verify all recent migrations have been applied
4. Ensure your dependencies are up to date: `pnpm install`
5. Check the main [README.md](../README.md) for general setup instructions

