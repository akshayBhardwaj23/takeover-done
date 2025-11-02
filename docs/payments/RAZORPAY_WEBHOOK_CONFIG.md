# Razorpay Webhook Configuration Guide

## Webhook Setup in Razorpay Dashboard

When setting up your webhook in Razorpay, use these settings:

### 1. Webhook URL

**For Development:**

```
https://your-tunnel-url.ngrok.io/api/webhooks/razorpay
```

_(Use Cloudflare Tunnel or ngrok for local testing)_

**For Production:**

```
https://yourdomain.com/api/webhooks/razorpay
```

### 2. Secret

1. **Generate or copy the webhook secret** from Razorpay
   - You can use the "Show Secret" link to view it
   - Or generate a new secret if needed
2. **Copy the secret** and add it to your `.env` file:

   ```env
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **Important:** Keep this secret secure and never commit it to git!

### 3. Active Events - Subscription Events (NOT Payment Events)

**⚠️ Important:** Don't select "Payment Events" - those are for one-time payments.

Instead, expand and select these **Subscription Events**:

#### Required Events (Check these):

- ✅ `subscription.activated` - When subscription is first activated
- ✅ `subscription.charged` - When monthly payment succeeds
- ✅ `subscription.updated` - When subscription details change
- ✅ `subscription.cancelled` - When user cancels subscription
- ✅ `subscription.completed` - When subscription expires/completes
- ✅ `subscription.paused` - When subscription is paused
- ✅ `subscription.resumed` - When paused subscription resumes

#### Optional but Recommended:

- ✅ `payment.failed` - When subscription payment fails (useful for handling failures)

**Note:** Our webhook handler processes all these events. The `payment.failed` event helps track when subscription renewals fail.

### 4. Alert Email

Use your business email(s) to receive notifications when webhooks fail to deliver. This helps you know if there are delivery issues.

**Example:**

```
your-email@domain.com,support@domain.com
```

## Visual Guide

In the Razorpay webhook setup form:

```
Webhook URL*: https://yourdomain.com/api/webhooks/razorpay
Secret: [Copy the secret shown and add to .env]
Alert Email: your-email@domain.com

Active Events*:
  [x] subscription.activated
  [x] subscription.charged
  [x] subscription.updated
  [x] subscription.cancelled
  [x] subscription.completed
  [x] subscription.paused
  [x] subscription.resumed
  [x] payment.failed
```

## Testing the Webhook

### 1. Test Webhook Delivery

After creating the webhook:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click on your webhook
3. Use "Send Test Webhook" option
4. Select event type: `subscription.activated`
5. Check your server logs to see if webhook was received

### 2. Verify in Your Application

Check that:

- Webhook endpoint is accessible (returns 200 status)
- Signature verification passes
- Subscription status updates in database

### 3. Check Webhook Logs

In Razorpay dashboard:

- Go to Webhooks → Your Webhook → Logs
- See delivery status (success/failure)
- View request/response details

## Troubleshooting

### Webhook Not Receiving Events

1. **Check URL is accessible:**
   - Test: `curl https://yourdomain.com/api/webhooks/razorpay`
   - Should return 200 (even if error, shows endpoint exists)

2. **Verify Secret:**
   - Ensure `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
   - Check for extra spaces/newlines

3. **Check Events Selected:**
   - Ensure subscription events are selected (not just payment events)
   - Verify all required events are checked

4. **Check Server Logs:**
   - Look for webhook requests in your application logs
   - Check for signature verification errors

### Webhook Returns Error

1. **Check Webhook Logs in Razorpay:**
   - See what error message is returned
   - Check response status code

2. **Common Issues:**
   - Signature verification failing → Check secret matches
   - Endpoint not found → Verify URL path is correct
   - Timeout → Check if endpoint responds within 30 seconds

### Events Not Updating Subscription

1. **Verify Event Handling:**
   - Check webhook handler processes the event type
   - Ensure database update logic is correct

2. **Check Database:**
   - Verify subscription record exists
   - Check `gatewaySubscriptionId` matches Razorpay subscription ID

## Security Notes

1. **Always use HTTPS** for webhook URLs in production
2. **Keep webhook secret secure** - never expose in client-side code
3. **Verify webhook signature** - our handler does this automatically
4. **Rate limiting** - Consider adding rate limiting to webhook endpoint

## Next Steps After Setup

1. ✅ Create a test subscription
2. ✅ Verify webhook receives events
3. ✅ Check subscription status updates
4. ✅ Test subscription cancellation
5. ✅ Monitor webhook delivery logs

Once webhook is configured, your subscription management will be fully automated! 🎉

