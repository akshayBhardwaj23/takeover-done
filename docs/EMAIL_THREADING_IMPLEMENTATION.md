# Email Threading Implementation

## Overview
Emails sent from the dashboard now appear as proper replies to customer emails in email clients (Gmail, Outlook, etc.) rather than as separate, unrelated emails. This is achieved through:

1. **Email Threading Headers** - Using standard email headers (`In-Reply-To` and `References`)
2. **Quoted Original Email** - Including the customer's original message as quoted text in the reply

## Technical Implementation

### 1. Email Threading Headers

Email clients use specific headers to group related emails into conversation threads:

- **`In-Reply-To`**: Contains the Message-ID of the email being replied to
- **`References`**: Contains a chain of all Message-IDs in the conversation thread

#### Implementation Details

When a customer sends an email to your support address:
1. The email webhook captures the `Message-ID` header from the inbound email
2. This is stored in the `Message.messageId` field in the database
3. The headers are also stored as JSON in `Message.headers`

When you send a reply from the dashboard:
1. The system fetches the original inbound message's `messageId` and `headers`
2. It sets the `In-Reply-To` header to the original message's ID
3. It builds a `References` chain by:
   - Taking any existing `References` from the original message
   - Appending the original message's ID
4. These headers are sent to Mailgun using the `h:` prefix (custom headers)

**Code Location**: `packages/api/src/index.ts`
- Lines 1257-1268 (for order-linked emails in `actionApproveAndSend`)
- Lines 1528-1539 (for unassigned emails in `sendUnassignedReply`)

### 2. Quoted Original Email

To provide context and make the email look like a proper reply, the original customer email is included at the bottom of your reply, prefixed with `>` (standard email quoting format).

#### Format Example

```
Hello John,

Thank you for reaching out about your order #1234...

Warm Regards,

Your Store Name Support Team

---

On Mon, Dec 16, 2024 at 10:30 AM, john@example.com wrote:

> Hi, I have a question about my order #1234.
> When will it be shipped?
```

#### Implementation Details

The `formatEmailWithQuotedOriginal()` helper function:
1. Takes the reply body, original sender, date, and original message body
2. Formats the date in a readable format
3. Prefixes each line of the original email with `>` (standard email quote marker)
4. Combines them with a separator line

**Code Location**: `packages/api/src/index.ts`
- Lines 224-254 (helper function definition)
- Lines 1236-1243 (applied in `actionApproveAndSend`)
- Lines 1507-1514 (applied in `sendUnassignedReply`)

## Database Schema

The relevant fields in the `Message` model:

```prisma
model Message {
  id           String           @id @default(cuid())
  messageId    String?          @unique  // Stores the email's Message-ID header
  headers      Json?                     // Stores all email headers as JSON
  from         String
  body         String
  direction    MessageDirection
  createdAt    DateTime         @default(now())
  // ... other fields
}
```

## How It Works: Full Flow

### Inbound Email
1. Customer sends email to `support@yourdomain.com`
2. Mailgun forwards it to webhook: `/api/webhooks/email/custom`
3. Webhook extracts the `Message-ID` header (e.g., `<abc123@mail.example.com>`)
4. Creates `Message` record with:
   - `messageId`: `"<abc123@mail.example.com>"`
   - `headers`: `{ "message-id": "...", "from": "...", ... }`
   - `direction`: `"INBOUND"`

### Outbound Reply
1. You compose a reply in the dashboard
2. Click "Send email"
3. System queries the original inbound message
4. Builds email with:
   - `In-Reply-To: <abc123@mail.example.com>`
   - `References: <abc123@mail.example.com>` (or full chain if multi-message thread)
   - Body includes quoted original at the bottom
5. Sends via Mailgun API
6. Creates `Message` record with `direction`: `"OUTBOUND"`

### Customer's Email Client
When the customer receives your reply:
- Their email client (Gmail, Outlook, etc.) sees the `In-Reply-To` header
- It matches it to the original email they sent
- It groups both emails into the same conversation thread
- The reply appears nested under the original email

## Benefits

1. **Better UX**: Customers see replies in context, not as separate emails
2. **Easier Tracking**: All communication about an order stays in one thread
3. **Professional**: Matches how normal email conversations work
4. **Context Preservation**: Quoted text shows what the customer originally asked

## Testing

To test email threading:

1. Send an email from your personal email to your support address
2. Wait for it to appear in the dashboard's inbox
3. Reply to it from the dashboard
4. Check your personal email inbox
5. Verify that:
   - The reply appears in the same conversation thread
   - The original email is quoted at the bottom
   - The subject line is "Re: [original subject]"

## Notes

- Threading only works if the original email has a `Message-ID` header (all modern email systems provide this)
- If no original `Message-ID` is found, the email is sent normally (without threading headers)
- The quoted original is always included for context, even if threading headers aren't available
- Mailgun's custom header prefix `h:` allows setting any standard email header

## Future Enhancements

Possible improvements:
1. Store the outbound message's `Message-ID` from Mailgun's response
2. Support multi-level threading for ongoing conversations
3. Add HTML email support with better formatting for quoted text
4. Allow users to toggle quoted original on/off per reply

