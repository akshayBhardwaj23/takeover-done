# 🎯 Automation Playbooks Hub

## Overview

The Playbooks Hub is a no-code automation builder that enables store owners to create, manage, and run intelligent automation workflows for their Shopify store. Think of it as "Zapier + Shopify + AI" - where every repetitive task can be automated with AI-powered intelligence.

## 🌟 Features

### **Main Features**
- ✅ **6 Pre-built Categories**: Refund/Return, Marketing, Fulfillment, Support, Inventory, Custom
- ✅ **8 Default Playbooks**: Pre-configured templates ready to enable
- ✅ **Visual Builder**: Multi-step form to create custom playbooks
- ✅ **AI-Powered Execution**: Automatic execution based on confidence scores
- ✅ **Approval Workflows**: Option for human approval before execution
- ✅ **Real-time Triggers**: Shopify events, email intents, scheduled tasks
- ✅ **Execution History**: Track all playbook runs and results

### **Automation Categories**

1. **🧾 Refund / Return**
   - Auto-refund damaged products
   - Auto-exchange size issues
   - Process returns based on reason

2. **📈 Marketing & Promotions**
   - Re-engage inactive customers
   - Recover abandoned carts
   - Birthday/anniversary campaigns

3. **📦 Fulfillment & Orders**
   - Delayed order escalation
   - VIP customer fast-track
   - Auto-fulfill digital products

4. **💬 Customer Support**
   - Auto-respond to negative reviews
   - Route urgent inquiries
   - Send satisfaction surveys

5. **🏪 Inventory Management**
   - Low stock alerts
   - Auto-restock notifications
   - Out-of-stock customer notifications

6. **⚙️ Custom Playbooks**
   - Build any workflow you need
   - Combine multiple triggers and actions

## 🏗️ Architecture

### **Database Schema**

```typescript
model Playbook {
  id                  String            // Unique ID
  userId              String            // Owner
  name                String            // Display name
  description         String?           // Optional description
  category            PlaybookCategory  // Category enum
  trigger             Json              // Trigger configuration
  conditions          Json              // Array of conditions
  actions             Json              // Array of actions
  confidenceThreshold Float             // 0.0 - 1.0
  requiresApproval    Boolean           // Force manual approval
  enabled             Boolean           // Active/inactive
  isDefault           Boolean           // System-provided template
  executionCount      Int               // Total runs
  lastExecutedAt      DateTime?         // Last execution time
}

model PlaybookExecution {
  id          String   // Unique ID
  playbookId  String   // Reference to playbook
  status      String   // pending, executed, rejected, failed
  confidence  Float?   // AI confidence score
  triggerData Json     // Data that triggered execution
  result      Json?    // Execution result
  error       String?  // Error message if failed
}
```

### **API Endpoints**

#### tRPC Procedures
- `getPlaybooks` - List all playbooks (with optional category filter)
- `createPlaybook` - Create new playbook
- `updatePlaybook` - Update existing playbook
- `deletePlaybook` - Delete playbook (cannot delete defaults)
- `clonePlaybook` - Clone any playbook (including defaults)
- `getPlaybookExecutions` - View execution history

#### REST Endpoints
- `POST /api/playbooks/execute` - Execute matching playbooks for a trigger
- `POST /api/playbooks/seed` - Seed default playbooks for user

### **Playbook Structure**

```json
{
  "name": "Damaged Product – Auto Refund",
  "category": "REFUND_RETURN",
  "trigger": {
    "type": "email_intent",
    "config": { "intent": "refund_request" }
  },
  "conditions": [
    { "field": "email_body", "operator": "contains", "value": "broken|defective|damaged" },
    { "field": "order_total", "operator": "<", "value": "100" }
  ],
  "actions": [
    { "type": "auto_refund", "config": { "full_amount": true } },
    { "type": "send_email", "config": { "template": "refund_confirmation" } }
  ],
  "confidenceThreshold": 0.85,
  "requiresApproval": false
}
```

## 🎨 Components

### **1. PlaybookBuilder** (`/app/components/PlaybookBuilder.tsx`)
Multi-step wizard for creating/editing playbooks:

**Step 1: Category Selection**
- Visual grid of 6 categories
- Color-coded with emojis

**Step 2: Trigger Definition**
- Choose trigger type (Shopify event, Email intent, Scheduled)
- Configure trigger-specific settings

**Step 3: Add Conditions**
- Visual condition builder
- Field, operator, value inputs
- Support for AND logic (all conditions must match)

**Step 4: Define Actions**
- Select from 7 action types
- Configure action-specific settings
- Multiple actions supported

**Step 5: Confidence & Approval**
- Slider for AI confidence threshold (50-100%)
- Toggle for requiring manual approval

**Step 6: Name & Enable**
- Set playbook name and description
- Choose to enable immediately
- View summary of configuration

### **2. PlaybookCard** (`/app/components/PlaybookCard.tsx`)
Individual playbook display:
- Category badge with emoji
- Enable/disable toggle
- Stats (trigger type, condition count, action count)
- Confidence threshold and approval status
- Execution count and last run time
- Actions: Edit, Clone, Delete

### **3. PlaybooksPage** (`/app/playbooks/page.tsx`)
Main hub interface:
- Stats overview (total, active, executions)
- Category filter tabs
- Grid of playbook cards
- Create button
- Empty states

## 🚀 Trigger Types

### **1. Shopify Events**
Triggered by Shopify webhooks:
- `order_created` - New order placed
- `order_updated` - Order modified
- `order_refunded` - Refund issued
- `order_cancelled` - Order cancelled
- `cart_abandoned` - Customer left items in cart
- `product_out_of_stock` - Inventory depleted

### **2. Email Intent**
Triggered by customer email analysis:
- `refund_request` - Customer wants refund
- `exchange_request` - Customer wants exchange
- `shipping_inquiry` - Asking about shipping
- `product_complaint` - Product issue
- `discount_inquiry` - Asking about deals
- `general_question` - General inquiry

### **3. Scheduled/Time-Based**
Triggered by cron jobs:
- Daily, Weekly, Monthly frequencies
- Specific time of day
- Check conditions on all relevant data

## ⚡ Action Types

### Available Actions

1. **auto_refund** - Process refund via Shopify API
2. **auto_exchange** - Create exchange order
3. **send_email** - Send AI-generated customer email
4. **create_discount** - Generate unique discount code
5. **add_tag** - Tag customer in Shopify
6. **send_notification** - Alert team via Slack/Email
7. **restock_product** - Trigger restock alert

## 🎮 Execution Flow

```
1. Trigger Detected (webhook/email/cron)
   ↓
2. Find Matching Playbooks
   - Match trigger type
   - Match trigger config
   - Only enabled playbooks
   ↓
3. Evaluate Conditions
   - Check all condition rules
   - Skip if not met
   ↓
4. Calculate AI Confidence
   - Analyze trigger data
   - Generate confidence score (0-100%)
   ↓
5. Decision: Auto-Execute or Request Approval
   - If requiresApproval = true → Create pending execution
   - If confidence < threshold → Create pending execution
   - Else → Auto-execute
   ↓
6. Execute Actions (if approved)
   - Run each action in sequence
   - Log results
   ↓
7. Update Statistics
   - Increment execution count
   - Record last executed time
   - Store execution result
```

## 📊 Default Playbooks

### 1. Damaged Product – Auto Refund
- **Category**: Refund/Return
- **Trigger**: Email mentions "broken", "defective", or "damaged"
- **Condition**: Order total < $100
- **Actions**: Auto-refund + send confirmation email
- **Confidence**: 85%
- **Approval**: Not required

### 2. Size Issue – Auto Exchange
- **Category**: Refund/Return
- **Trigger**: Email mentions size problems
- **Actions**: Confirm new size + create exchange
- **Confidence**: 80%

### 3. Inactive Customer Re-Engagement
- **Category**: Marketing
- **Trigger**: Daily at 10:00 AM
- **Condition**: Customer inactive > 30 days
- **Actions**: Create 10% discount + send AI email
- **Confidence**: 90%

### 4. Cart Abandonment Recovery
- **Category**: Marketing
- **Trigger**: Shopify cart_abandoned event
- **Condition**: Cart value > $50 + 2+ hours elapsed
- **Actions**: Create 15% discount + send recovery email
- **Confidence**: 85%

### 5. Negative Review Auto-Response
- **Category**: Support
- **Trigger**: Email with negative sentiment
- **Condition**: Sentiment < -0.5
- **Actions**: Send empathy email + Slack alert + tag customer
- **Confidence**: 75%

### 6. Delayed Order Escalation
- **Category**: Fulfillment
- **Trigger**: Daily at 9:00 AM
- **Condition**: Unfulfilled > 5 days
- **Actions**: Slack alert + apology email
- **Confidence**: 95%
- **Approval**: Required

### 7. Low Stock Auto Restock Alert
- **Category**: Inventory
- **Trigger**: Product out of stock event
- **Condition**: Stock < 10 units
- **Actions**: Email alert + restock notification
- **Approval**: Required

### 8. VIP Customer Fast Track
- **Category**: Fulfillment
- **Trigger**: New order created
- **Condition**: Customer LTV > $1000
- **Actions**: Add VIP tag + Slack alert + thank you email
- **Confidence**: 90%

## 🔧 Integration Points

### **1. Shopify Webhooks**
Configure Shopify app to send webhooks to:
```
POST /api/playbooks/execute
{
  "type": "shopify_event",
  "event": "order_created",
  "data": { ...order data... },
  "userId": "user_123",
  "shopDomain": "store.myshopify.com"
}
```

### **2. Email Processing**
When email is received and intent is detected:
```typescript
await fetch('/api/playbooks/execute', {
  method: 'POST',
  body: JSON.stringify({
    type: 'email_intent',
    intent: 'refund_request',
    data: {
      email_body: message.body,
      order_total: order.totalAmount,
      customer_email: message.from,
    },
    userId: connection.userId,
  }),
});
```

### **3. Scheduled Tasks**
Set up cron job to trigger time-based playbooks:
```bash
# Daily at configured times
0 * * * * curl -X POST /api/playbooks/execute -d '{"type": "scheduled", "frequency": "daily"}'
```

## 🎯 Usage

### **Creating a Playbook**

1. Navigate to `/playbooks`
2. Click "Create New Playbook"
3. Follow the 6-step wizard:
   - Select category
   - Define trigger
   - Add conditions (optional)
   - Define actions
   - Set confidence & approval
   - Name and enable

### **Using Default Playbooks**

1. View default playbooks (marked with "Default" badge)
2. Clone a default to customize it
3. Enable directly to start using
4. Cannot edit or delete defaults (only disable)

### **Monitoring Executions**

- View execution count on each playbook card
- See last executed timestamp
- Filter by category to focus on specific areas

## 🔐 Security & Permissions

- All playbooks are scoped to user (multi-tenant)
- Cannot edit or delete default playbooks
- Can only clone and customize
- Authentication required for all playbook operations
- Rate limiting: 10 AI-powered operations per minute

## 🚀 Future Enhancements

### Phase 2
- [ ] Visual flow builder (drag-and-drop)
- [ ] A/B testing for playbook variations
- [ ] Advanced analytics per playbook
- [ ] Playbook templates marketplace
- [ ] Multi-condition logic (OR, NOT)
- [ ] Action branching (if/else)

### Phase 3
- [ ] AI-suggested playbook creation
- [ ] Auto-optimize confidence thresholds
- [ ] Playbook performance scoring
- [ ] Collaboration (share playbooks between team members)
- [ ] Version history and rollback
- [ ] Playbook dependencies (trigger one from another)

## 📝 Notes

- Default playbooks are created via `/api/playbooks/seed` endpoint
- Execution engine is modular - easy to add new action types
- All actions are currently stubs - need Shopify API integration
- Condition evaluation supports nested fields (dot notation)
- AI confidence calculation is simplified - integrate with OpenAI for production

## 🔗 Related Files

- Schema: `/packages/db/prisma/schema.prisma`
- Migration: `/packages/db/prisma/migrations/add_playbooks/`
- tRPC API: `/packages/api/src/index.ts` (playbook procedures)
- Components: `/apps/web/app/components/Playbook*.tsx`
- Main Page: `/apps/web/app/playbooks/page.tsx`
- Execution Engine: `/apps/web/app/api/playbooks/execute/route.ts`
- Seeder: `/packages/db/src/seedPlaybooks.ts`

