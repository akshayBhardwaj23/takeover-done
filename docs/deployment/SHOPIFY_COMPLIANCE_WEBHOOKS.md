# Shopify Compliance Webhooks

**Status:** ✅ Implemented  
**Required:** YES (mandatory for Shopify App Store)  
**Documentation:** https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance

---

## Overview

Shopify requires all apps distributed through the App Store to implement three mandatory compliance webhooks for GDPR/CPRA compliance. These webhooks handle customer data requests and deletion.

---

## Implemented Webhooks

### 1. customers/data_request

**Trigger:** Customer requests their data from store owner

**Action Required:** Provide customer data to merchant within 30 days

**Implementation:** `/apps/web/app/api/webhooks/shopify/compliance/route.ts`

**What we collect:**
- Messages (from/to customer email)
- AI suggestions related to customer
- Orders and actions taken
- Thread history

**Response:** Logs data to Event table for manual processing

### 2. customers/redact

**Trigger:** Customer requests data deletion

**Action Required:** Delete customer data within 30 days

**Timing:** 
- Sent 10 days after request if no orders in last 6 months
- Otherwise delayed until 6 months have passed

**Implementation:** Automatically deletes:
- All messages from/to customer
- All threads for customer
- AI suggestions for customer messages
- Actions on customer orders
- Specified orders

### 3. shop/redact

**Trigger:** 48 hours after store owner uninstalls app

**Action Required:** Delete ALL shop data

**Implementation:** Automatically deletes:
- All Shopify connections
- All email aliases for shop
- All orders for shop
- All messages and threads
- All AI suggestions
- All actions
- Playbooks (if last store for user)
- Playbook executions

---

## Configuration

### Environment Variables

Required:
```bash
SHOPIFY_API_SECRET=your-secret-here  # Used for HMAC verification
```

### Webhook Endpoints

**Production:** `https://www.zyyp.ai/api/webhooks/shopify/compliance`  
**Staging:** `https://staging.zyyp.ai/api/webhooks/shopify/compliance`

### Shopify App Configuration

In your `shopify.app.toml`:

```toml
[webhooks]
api_version = "2024-10"

[[webhooks.subscriptions]]
compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "https://www.zyyp.ai/api/webhooks/shopify/compliance"
```

---

## Testing

### Using Shopify CLI

Test each webhook:

```bash
# Test customers/data_request
shopify app webhook trigger --topic customers/data_request

# Test customers/redact  
shopify app webhook trigger --topic customers/redact

# Test shop/redact
shopify app webhook trigger --topic shop/redact
```

### Manual Testing

Send a POST request with valid HMAC:

```bash
curl -X POST https://www.zyyp.ai/api/webhooks/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: customers/redact" \
  -H "X-Shopify-Shop-Domain: test-store.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: <valid-hmac>" \
  -d '{
    "shop_id": 12345,
    "shop_domain": "test-store.myshopify.com",
    "customer": {
      "id": 67890,
      "email": "customer@example.com",
      "phone": "555-123-4567"
    },
    "orders_to_redact": [123, 456, 789]
  }'
```

### Expected Responses

**Success:** 
- Status: 200
- Body: `{"success": true, "requestId": "uuid"}`

**Invalid HMAC:**
- Status: 401
- Body: `{"error": "Invalid HMAC"}`

**Server Error:**
- Status: 500
- Body: `{"error": "Processing error", "requestId": "uuid"}`

---

## Verification in Shopify Partners Dashboard

1. Go to your app in Shopify Partners
2. Navigate to **App setup** → **Compliance webhooks**
3. Verify all three webhooks are listed:
   - ✅ customers/data_request
   - ✅ customers/redact
   - ✅ shop/redact
4. Webhook URL should be: `https://www.zyyp.ai/api/webhooks/shopify/compliance`

---

## Security

### HMAC Verification

All requests are verified using HMAC-SHA256:

```typescript
const digest = crypto
  .createHmac('sha256', SHOPIFY_API_SECRET)
  .update(payload, 'utf8')
  .digest('base64');

if (digest !== hmac) {
  return 401; // Unauthorized
}
```

### Required Headers

- `X-Shopify-Hmac-Sha256`: HMAC signature
- `X-Shopify-Topic`: Webhook topic
- `X-Shopify-Shop-Domain`: Shop domain

---

## Monitoring

### Logs

All webhook events are logged:

```typescript
await logEvent('shopify.compliance.webhook', {
  topic,
  shop,
  requestId,
  success: true,
});
```

### Check Logs

```bash
# In Vercel dashboard
Functions → Select function → Logs

# Search for:
- "[Compliance Webhook]"
- "shopify.compliance.webhook"
- "shopify.customer.redact"
- "shopify.shop.redact"
```

### Common Log Messages

✅ **Success:**
- `[Compliance Webhook] Successfully processed`
- `[Compliance] Customer data redacted successfully`
- `[Compliance] Shop data redacted successfully`

❌ **Errors:**
- `[Compliance Webhook] HMAC verification failed`
- `[Compliance] Error redacting customer data`
- `[Compliance] Error redacting shop data`

---

## Data Retention Policy

### Customer Data Requests (customers/data_request)

**Timeline:** 30 days to provide data

**Process:**
1. Webhook received
2. Data collected from database
3. Logged to Event table
4. Merchant notified (TODO: implement email notification)
5. Merchant provides data to customer

### Customer Redaction (customers/redact)

**Timeline:** 30 days to delete (unless legally required to retain)

**Process:**
1. Webhook received (10 days or 6 months after request)
2. Customer data automatically deleted:
   - Messages
   - Threads
   - AI suggestions
   - Actions
   - Orders (if specified)
3. Deletion logged to Event table

### Shop Redaction (shop/redact)

**Timeline:** Triggered 48 hours after uninstall

**Process:**
1. Webhook received 48 hours after uninstall
2. ALL shop data automatically deleted:
   - Connections (Shopify + email aliases)
   - Orders
   - Messages and threads
   - AI suggestions
   - Actions
   - Playbooks (if last store for user)
3. Deletion logged to Event table

---

## Troubleshooting

### Webhook Not Registered

**Problem:** Compliance webhooks not showing in Partners dashboard

**Solution:**
1. Ensure `shopify.app.toml` has compliance_topics configured
2. Deploy app to production
3. Run: `shopify app config push`
4. Check Partners dashboard → App setup → Compliance webhooks

### HMAC Verification Failing

**Problem:** Getting 401 Unauthorized responses

**Solution:**
1. Verify `SHOPIFY_API_SECRET` is correct in environment variables
2. Check secret matches Shopify Partners dashboard
3. Ensure reading raw request body (not parsed JSON)
4. Test with Shopify CLI webhook trigger

### Data Not Being Deleted

**Problem:** Customer/shop data still in database after webhook

**Solution:**
1. Check webhook was received (look for logs)
2. Verify HMAC passed
3. Check for errors in function logs
4. Verify foreign key constraints aren't blocking deletion
5. Check Event table for redaction logs

### Webhook Endpoint Not Accessible

**Problem:** Shopify can't reach webhook endpoint

**Solution:**
1. Ensure production URL is publicly accessible
2. Check SSL certificate is valid
3. Verify no firewall blocking Shopify IPs
4. Test with: `curl https://www.zyyp.ai/api/webhooks/shopify/compliance`

---

## Legal Compliance

### GDPR Requirements

✅ **Right to Access:** Handled by `customers/data_request`  
✅ **Right to Erasure:** Handled by `customers/redact`  
✅ **Right to be Forgotten:** Handled by `shop/redact`

### CPRA Requirements

✅ **Data Access:** Handled by `customers/data_request`  
✅ **Data Deletion:** Handled by `customers/redact`  
✅ **Do Not Sell:** Not applicable (we don't sell customer data)

### Data Processing Agreement

Required fields handled:
- ✅ Data subject requests (access + deletion)
- ✅ Timely response (within 30 days)
- ✅ Complete data removal on request
- ✅ Audit trail (Event logs)

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Automatic data deletion
- ✅ Event logging
- ✅ HMAC verification

### Phase 2 (Planned)
- [ ] Email notifications to merchants for data requests
- [ ] Admin UI to view/download customer data
- [ ] Bulk data export functionality
- [ ] Data retention policy dashboard

### Phase 3 (Future)
- [ ] Automated merchant workflow for data requests
- [ ] Customer self-service data portal
- [ ] Compliance reporting dashboard
- [ ] Data anonymization options

---

## Support

For compliance webhook issues:
- Check logs in Vercel dashboard
- Review Event table in database
- Test with Shopify CLI webhook trigger
- Contact Shopify Partner Support if webhook registration fails

For legal/compliance questions:
- Consult with legal counsel
- Review Shopify's privacy policies
- Check regional data protection laws

---

## References

- [Shopify Compliance Webhooks Documentation](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [GDPR Overview](https://gdpr.eu/)
- [CPRA Overview](https://oag.ca.gov/privacy/ccpa)
- [Shopify App Store Requirements](https://shopify.dev/docs/apps/launch/review-requirements)

---

**Last Updated:** 2024-11-13  
**Implementation Status:** ✅ Production Ready  
**Maintained by:** Development Team

