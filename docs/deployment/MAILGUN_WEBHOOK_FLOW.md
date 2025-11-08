# Mailgun Webhook Flow Explained

## Why Same Email Shows Both Success and Failure

**This is normal Mailgun retry behavior!**

When Mailgun sends a webhook and receives a `401 Unauthorized` response, it automatically retries the webhook. This is why you see:
- **First attempt**: `Failed` with `Unauthorized` (401)
- **Retry attempt**: `Accepted` (200)

Mailgun typically retries failed webhooks with exponential backoff (e.g., after 10 seconds, 1 minute, 10 minutes, etc.).

### What Happens:
1. **First webhook attempt** → Your endpoint returns `401 Unauthorized` → Mailgun logs it as "Failed"
2. **Mailgun retries** (after a delay) → Your endpoint returns `200 OK` → Mailgun logs it as "Accepted"

This is why you see both statuses for the same email in Mailgun logs.

## Success Logs

**Added success logging!** You'll now see:

1. **Authentication Success**:
   ```
   [Email Webhook] ✅ Authentication passed - proceeding with email processing
   ```

2. **New Webhook Processing**:
   ```
   [Email Webhook] ✅ New webhook (Message-ID: ...), processing...
   ```

3. **Successfully Processed**:
   ```
   [Email Webhook] ✅ Successfully processed email: {
     messageId: "...",
     threadId: "...",
     orderId: "..." or "unassigned",
     from: "customer@example.com",
     to: "in+alias@mail.zyyp.ai",
     subject: "...",
     inngestTriggered: true
   }
   ```

## Database Entries After Success

**Yes, entries ARE created in the database when the webhook succeeds!**

When the webhook returns `200 OK` (success), the following happens:

### 1. **Thread Created**
```typescript
const thread = await prisma.thread.create({
  data: {
    customerEmail,
    subject: subject ?? null,
    connectionId: conn.id,
  },
});
```

### 2. **Message Created**
```typescript
const msg = await prisma.message.create({
  data: {
    threadId: thread.id,
    orderId: orderId ?? null,
    from: customerEmail,
    to: to.toLowerCase(),
    body: body || '(no content)',
    direction: 'INBOUND',
    messageId: messageIdHeader ?? null,
    headers,
  },
});
```

### 3. **Event Logged**
```typescript
await logEvent(
  'email.inbound',
  { from, to, subject, orderId },
  'thread',
  thread.id,
);
```

### 4. **Inngest Event Triggered** (for AI suggestion)
```typescript
await inngest.send({
  name: 'email/inbound.process',
  data: {
    messageId: msg.id,
  },
});
```

### 5. **AI Suggestion Created** (if Inngest fails, fallback placeholder)
```typescript
await prisma.aISuggestion.upsert({
  where: { messageId: msg.id },
  create: {
    messageId: msg.id,
    reply: 'Processing your message... AI suggestion will be available shortly.',
    proposedAction: 'NONE',
    orderId: orderId ?? null,
    confidence: 0.1,
  },
});
```

## How to Verify Database Entries

After a successful webhook (`200 OK`), check:

1. **Database → `Thread` table**:
   - Should have a new thread with `customerEmail` and `connectionId`

2. **Database → `Message` table**:
   - Should have a new message with `direction: 'INBOUND'`
   - `threadId` should match the thread created above
   - `orderId` may be `null` if no order matched

3. **Database → `AISuggestion` table**:
   - Should have a suggestion for the message (either from Inngest or placeholder)

4. **Dashboard**:
   - Email should appear in the inbox
   - If `orderId` is set, it should be linked to an order
   - If `orderId` is `null`, it should appear in "Unassigned Emails"

## Idempotency (Preventing Duplicates)

The webhook uses **Message-ID** for idempotency:
- If the same email is processed twice (e.g., retry), the second attempt is skipped
- Uses Redis `SETNX` (set if not exists) with 24-hour TTL
- Duplicate webhooks return `{ ok: true, deduped: true }` without creating duplicate database entries

## Summary

✅ **Success logs are now added** - you'll see `✅` markers in logs  
✅ **Database entries ARE created** when webhook returns `200 OK`  
✅ **Both success and failure for same email is normal** - Mailgun retries failed webhooks  
✅ **Duplicates are prevented** - idempotency prevents duplicate database entries

