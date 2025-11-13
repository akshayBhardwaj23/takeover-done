# Testing Guide

Complete guide for testing the AI E-Commerce Support Platform across all environments and features.

---

## Table of Contents

- [Environment Setup](#environment-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Testing Checklist](#testing-checklist)
- [Common Issues](#common-issues)

---

## Environment Setup

### Prerequisites

- Development environment running (see [DEVELOPMENT_SETUP.md](../setup/DEVELOPMENT_SETUP.md))
- Test Shopify store
- Mailgun account (or use staging)
- OpenAI API key

### Test Accounts

**Shopify Partner Account:**
- Create test stores in Shopify Partners dashboard
- Use development stores for testing OAuth flow
- Enable "Test on development stores"

**Mailgun Testing:**
- Use test mode for webhook testing
- Set up forwarding rules for email testing
- Monitor logs in Mailgun dashboard

**Payment Testing (Razorpay):**
- Use test API keys
- Test card: `4111 1111 1111 1111`
- Any future date, any CVV

---

## Unit Testing

### Database Functions

**Test Usage Tracking:**

```bash
# Test via Prisma Studio
cd packages/db
pnpm prisma studio

# Check:
1. ensureSubscription creates default TRIAL
2. canSendEmail enforces limits correctly
3. incrementEmailSent updates counters
4. getUsageSummary returns accurate data
```

**Test Plan Limits:**

```typescript
// In packages/db/src/index.ts
// Verify PLAN_LIMITS configuration:
TRIAL: 50 emails/month
STARTER: 500 emails/month
GROWTH: 2000 emails/month
PRO: 10000 emails/month
```

### API Endpoints (tRPC)

**Test Protected Procedures:**

```bash
# Use tRPC panel or Postman
# All protected procedures should return 401 if not authenticated
```

**Test Rate Limiting:**

```bash
# Send 101 requests in 1 minute
# Should return 429 TOO_MANY_REQUESTS
```

---

## Integration Testing

### Shopify OAuth Flow

**Test Steps:**

1. Go to `/integrations`
2. Enter development store domain
3. Click "Connect Store"
4. Should redirect to Shopify OAuth page
5. Approve permissions
6. Should redirect back to `/integrations?connected=1&shop=...`
7. Verify store appears in "Connected Stores" section
8. Verify Connection record created in database

**Expected Results:**
- ✅ State cookie set and verified
- ✅ HMAC signature validated
- ✅ Access token stored (encrypted)
- ✅ Webhooks registered (if PROTECTED_WEBHOOKS=true)
- ✅ No duplicate stores created
- ✅ Event logged: `shopify.connection.created`

**Common Issues:**
- ❌ Redirect to localhost instead of tunnel: Check `SHOPIFY_APP_URL`
- ❌ HMAC verification failed: Check `SHOPIFY_API_SECRET`
- ❌ State mismatch: Cookie not preserved (check domain)

### Email Webhooks (Mailgun)

**Test Inbound Email:**

1. Create email alias for store
2. Copy alias address (e.g., `in+shop-xxx-staging@mail.zyyp.ai`)
3. Send test email to alias from customer email
4. Check Mailgun logs (should show 200 response)
5. Verify in database:
   - Thread created
   - Message created (INBOUND)
   - Order matched (if order number in email)
6. Check Inngest dashboard for AI suggestion job

**Test Email Matching:**

Send email with subject: "Order #1001 - Need help"

Expected:
- ✅ Order number extracted: "1001"
- ✅ Order matched by name field
- ✅ Message linked to order
- ✅ AI suggestion generated with order context

**Test Unassigned Emails:**

Send email without order number

Expected:
- ✅ Thread created
- ✅ Message created with orderId=null
- ✅ Appears in "Unassigned Emails" section
- ✅ AI suggestion still generated

**Test Idempotency:**

Send same email twice (same Message-ID)

Expected:
- ✅ First: Processed normally
- ✅ Second: Returns 200 but skips processing
- ✅ Only one message in database

### Shopify Webhooks

**Test Order Creation:**

1. Create order in Shopify admin
2. Check app logs for webhook received
3. Verify in database:
   - Order created with correct data
   - shopifyId, name, status, email, totalAmount

**Test HMAC Verification:**

Send webhook with invalid HMAC

Expected:
- ❌ 401 Unauthorized
- ❌ Logged error

**Test Idempotency:**

Send same webhook twice (same webhook-id)

Expected:
- ✅ First: Processed normally
- ✅ Second: Returns 200 but skips processing

### Payment Webhooks (Razorpay)

**Test Subscription Activation:**

1. Create checkout session via UI
2. Complete payment with test card
3. Check Razorpay webhook logs
4. Verify in database:
   - Subscription status = 'active'
   - gatewaySubscriptionId populated
   - currentPeriodEnd set correctly

**Test Failed Payment:**

Trigger payment failure in Razorpay dashboard

Expected:
- ✅ Webhook received
- ✅ Subscription status updated to 'past_due'
- ✅ User notified (future)

---

## End-to-End Testing

### Complete Customer Support Flow

**Scenario: Customer requests refund**

1. **Setup:**
   - Create test order in Shopify
   - Note order number (e.g., #1001)

2. **Customer sends email:**
   - Send email to store alias
   - Subject: "Refund request for order #1001"
   - Body: "I received a damaged product and would like a refund"

3. **Email Processing:**
   - ✅ Webhook receives email
   - ✅ Order matched by number
   - ✅ Thread and message created
   - ✅ Inngest triggers AI suggestion

4. **AI Suggestion:**
   - ✅ OpenAI generates response
   - ✅ Detects REFUND action
   - ✅ Suggestion saved with confidence score

5. **Support Staff Review:**
   - Go to `/inbox?shop=your-store.myshopify.com`
   - ✅ Order appears in left panel
   - ✅ Click order to view details
   - ✅ Email appears in "Email Matches" section
   - ✅ AI suggestion displayed

6. **Generate and Send Reply:**
   - ✅ Click "Generate AI Reply"
   - ✅ Review generated response
   - ✅ Edit if needed
   - ✅ Click "Send Reply"
   - ✅ Check usage limits enforced
   - ✅ Email sent via Mailgun
   - ✅ Success toast appears
   - ✅ Usage counter incremented

7. **Customer Receives Response:**
   - ✅ Email delivered to customer
   - ✅ FROM shows store name
   - ✅ Reply-To set to store support email
   - ✅ Professional signature included

### Automation Playbook Flow

**Scenario: Auto-refund damaged product**

1. **Setup:**
   - Go to `/playbooks`
   - Enable "Damaged Product – Auto Refund" playbook

2. **Customer sends email:**
   - Subject: "Broken product"
   - Body: "My order #1001 arrived damaged"
   - Order total < $100

3. **Playbook Execution:**
   - ✅ Email triggers playbook check
   - ✅ Conditions evaluated (damaged keywords + order < $100)
   - ✅ AI confidence calculated
   - ✅ Auto-refund action executed (stub)
   - ✅ Confirmation email sent
   - ✅ Execution logged

4. **Verification:**
   - ✅ Check playbook execution count incremented
   - ✅ View execution history
   - ✅ Verify customer received email

### Analytics Dashboard Testing

**Test AI Support Analytics:**

1. Go to `/analytics`
2. Verify metrics:
   - ✅ Total emails count matches database
   - ✅ Average response time calculated
   - ✅ AI accuracy percentage shown
   - ✅ Volume trend chart displays 7 days
   - ✅ Customer satisfaction score shown

**Test Shopify Analytics:**

1. Go to `/shopify-analytics`
2. Select store from dropdown
3. Verify metrics:
   - ✅ Total revenue matches Shopify
   - ✅ Order counts accurate
   - ✅ Average order value correct
   - ✅ Customer counts match
   - ✅ Revenue trend chart displays

### Subscription & Usage Testing

**Test Trial Limits:**

1. New user signs up
2. ✅ TRIAL subscription created automatically
3. ✅ 50 email limit enforced
4. Send 50 emails
5. ✅ 51st email blocked with upgrade prompt
6. ✅ Usage dashboard shows 100% usage

**Test Upgrade Flow:**

1. Go to `/usage`
2. Click "Upgrade" on STARTER plan
3. ✅ Redirected to Razorpay checkout
4. Complete payment with test card
5. ✅ Redirected back to app
6. ✅ Plan upgraded to STARTER
7. ✅ Email limit increased to 500
8. ✅ Can send emails again

**Test Cancellation:**

1. Go to `/account` (future)
2. Click "Cancel Subscription"
3. Choose "Cancel at period end"
4. ✅ Status remains 'active' until period end
5. ✅ canceledAt timestamp set
6. ✅ No further charges

---

## Testing Checklist

### Pre-Deployment Testing

#### Authentication
- [ ] Sign in with Google works
- [ ] Sign out redirects correctly
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect to sign in

#### Shopify Integration
- [ ] OAuth flow completes successfully
- [ ] Store connection appears in integrations page
- [ ] Duplicate stores prevented
- [ ] Webhooks registered correctly
- [ ] Orders sync from Shopify
- [ ] Disconnect store removes all data

#### Email System
- [ ] Email alias creation works
- [ ] Inbound emails received and processed
- [ ] Order matching by number works
- [ ] Unassigned emails appear in correct section
- [ ] AI suggestions generated
- [ ] Email sending via Mailgun works
- [ ] Reply-To header set correctly
- [ ] Store support email used in signature

#### Analytics
- [ ] AI Support Analytics displays data
- [ ] Shopify Analytics displays data
- [ ] Charts render correctly
- [ ] Metrics calculate accurately
- [ ] Store selector works

#### Playbooks
- [ ] Default playbooks seeded
- [ ] Playbook builder wizard works
- [ ] Playbook execution works
- [ ] Clone playbook works
- [ ] Cannot edit/delete default playbooks
- [ ] Execution history displays

#### Subscription & Billing
- [ ] Trial subscription created for new users
- [ ] Usage limits enforced
- [ ] Upgrade prompts appear
- [ ] Razorpay checkout works
- [ ] Payment webhooks process correctly
- [ ] Subscription cancellation works

#### Security
- [ ] Rate limiting works
- [ ] HMAC verification works (Shopify)
- [ ] Signature verification works (Mailgun)
- [ ] Data isolation by userId
- [ ] Encrypted tokens stored
- [ ] No sensitive data in logs

---

## Common Issues

### Email Not Received

**Check:**
1. Mailgun route configured correctly
2. Alias matches environment (local/staging/production)
3. Webhook URL accessible (not localhost)
4. Mailgun signature verification (if enabled)
5. Check Mailgun logs for errors

### AI Suggestion Not Generated

**Check:**
1. Inngest function synced
2. OPENAI_API_KEY set correctly
3. Check Inngest dashboard for failures
4. Verify message created in database
5. Check for OpenAI API errors

### Order Not Matching

**Check:**
1. Order exists in database
2. Order name matches (case-sensitive)
3. shopDomain matches
4. Connection scoping correct
5. Check email subject/body for order number

### Payment Webhook Failed

**Check:**
1. RAZORPAY_WEBHOOK_SECRET correct
2. Webhook URL matches Razorpay dashboard
3. Signature verification passing
4. Check Razorpay webhook logs

### Rate Limit Hit

**Check:**
1. Usage limits for plan
2. Current usage counter
3. Trial period expired
4. Upgrade required

---

## Automated Testing (Future)

### Unit Tests
- Jest for business logic
- Prisma mock for database tests
- tRPC procedure tests

### Integration Tests
- Webhook simulation tests
- OAuth flow tests
- Email processing tests

### E2E Tests
- Playwright for UI testing
- Full user journey tests
- Critical path validation

---

## Monitoring & Debugging

### Production Testing

**After Deployment:**

1. **Smoke Tests:**
   - [ ] Homepage loads
   - [ ] Sign in works
   - [ ] Integrations page accessible
   - [ ] Inbox loads for connected store
   - [ ] Email sending works
   - [ ] Analytics display

2. **Check Services:**
   - [ ] Vercel deployment status
   - [ ] Inngest functions synced
   - [ ] Supabase database responding
   - [ ] Upstash Redis connected (optional)
   - [ ] Sentry receiving events

3. **Monitor Logs:**
   - [ ] Vercel function logs
   - [ ] Inngest execution logs
   - [ ] Sentry error tracking
   - [ ] Mailgun delivery logs
   - [ ] Razorpay webhook logs

### Debug Tools

**Vercel:**
- Functions → View logs
- Deployments → Check build logs
- Environment Variables → Verify values

**Inngest:**
- Functions → Check sync status
- Runs → View execution history
- Events → Monitor event stream

**Mailgun:**
- Logs → Email delivery status
- Routes → Verify forwarding rules
- Webhooks → Check delivery logs

**Razorpay:**
- Payment Links → View status
- Webhooks → Check delivery
- Logs → Debug issues

---

## Test Data Cleanup

### After Testing

**Database:**
```sql
-- Clean test data (be careful in production!)
DELETE FROM "AISuggestion" WHERE ...;
DELETE FROM "Message" WHERE ...;
DELETE FROM "Thread" WHERE ...;
DELETE FROM "Action" WHERE ...;
DELETE FROM "Order" WHERE ...;
DELETE FROM "PlaybookExecution" WHERE ...;
DELETE FROM "Event" WHERE ...;
```

**Shopify:**
- Delete test orders
- Uninstall development app
- Remove webhooks

**Mailgun:**
- Check email quota usage
- Clear test routes

---

## Support

For testing issues:
- Check [TROUBLESHOOTING.md](../operations/TROUBLESHOOTING.md)
- Review [RUNBOOK.md](../operations/RUNBOOK.md)
- Contact development team

---

**Last Updated:** 2024  
**Maintained by:** Development Team

