import { prisma } from './index';
import { PlaybookCategory } from '@prisma/client';

const DEFAULT_PLAYBOOKS = [
  {
    name: 'Damaged Product – Auto Refund',
    description: 'Automatically refund orders under $100 when customer reports damaged or defective products',
    category: 'REFUND_RETURN' as PlaybookCategory,
    trigger: {
      type: 'email_intent',
      config: { intent: 'refund_request' },
    },
    conditions: [
      { field: 'email_body', operator: 'contains', value: 'broken|defective|damaged' },
      { field: 'order_total', operator: '<', value: '100' },
    ],
    actions: [
      { type: 'auto_refund', config: { full_amount: true, reason: 'Product damaged' } },
      { type: 'send_email', config: { template: 'refund_confirmation' } },
    ],
    confidenceThreshold: 0.85,
    requiresApproval: false,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'Size Issue – Auto Exchange',
    description: 'Detect size complaints and offer automatic exchange to correct size',
    category: 'REFUND_RETURN' as PlaybookCategory,
    trigger: {
      type: 'email_intent',
      config: { intent: 'exchange_request' },
    },
    conditions: [
      { field: 'email_body', operator: 'contains', value: 'wrong size|too small|too large|doesn\'t fit' },
    ],
    actions: [
      { type: 'auto_exchange', config: { confirm_size: true } },
      { type: 'send_email', config: { template: 'exchange_confirmation', ai_generated: true } },
    ],
    confidenceThreshold: 0.8,
    requiresApproval: false,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'Inactive Customer Re-Engagement',
    description: 'Send personalized re-engagement email with 10% discount to customers inactive for 30+ days',
    category: 'MARKETING' as PlaybookCategory,
    trigger: {
      type: 'scheduled',
      config: { frequency: 'daily', time: '10:00' },
    },
    conditions: [
      { field: 'customer_inactive_days', operator: '>', value: '30' },
      { field: 'customer_ltv', operator: '>', value: '50' },
    ],
    actions: [
      { type: 'create_discount', config: { percentage: 10, expiry_days: 7 } },
      { type: 'send_email', config: { template: 'reengagement', ai_generated: true } },
      { type: 'add_tag', config: { tag: 'reengagement_sent' } },
    ],
    confidenceThreshold: 0.9,
    requiresApproval: false,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'Cart Abandonment Recovery',
    description: 'Follow up with customers who abandoned carts with personalized discount',
    category: 'MARKETING' as PlaybookCategory,
    trigger: {
      type: 'shopify_event',
      config: { event: 'cart_abandoned' },
    },
    conditions: [
      { field: 'cart_value', operator: '>', value: '50' },
      { field: 'hours_since_abandonment', operator: '>', value: '2' },
    ],
    actions: [
      { type: 'create_discount', config: { percentage: 15, expiry_days: 3 } },
      { type: 'send_email', config: { template: 'cart_recovery', ai_generated: true } },
    ],
    confidenceThreshold: 0.85,
    requiresApproval: false,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'Negative Review Auto-Response',
    description: 'Automatically respond to negative feedback with empathy and create support ticket',
    category: 'SUPPORT' as PlaybookCategory,
    trigger: {
      type: 'email_intent',
      config: { intent: 'product_complaint' },
    },
    conditions: [
      { field: 'sentiment', operator: '<', value: '-0.5' },
    ],
    actions: [
      { type: 'send_email', config: { template: 'empathy_response', ai_generated: true } },
      { type: 'send_notification', config: { channel: 'slack', message: 'Negative review received' } },
      { type: 'add_tag', config: { tag: 'needs_follow_up' } },
    ],
    confidenceThreshold: 0.75,
    requiresApproval: false,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'Delayed Order Escalation',
    description: 'Alert team and send apology email for orders unfulfilled after 5 days',
    category: 'FULFILLMENT' as PlaybookCategory,
    trigger: {
      type: 'scheduled',
      config: { frequency: 'daily', time: '09:00' },
    },
    conditions: [
      { field: 'days_since_order', operator: '>', value: '5' },
      { field: 'fulfillment_status', operator: '==', value: 'unfulfilled' },
    ],
    actions: [
      { type: 'send_notification', config: { channel: 'slack', priority: 'high' } },
      { type: 'send_email', config: { template: 'delay_apology', ai_generated: true } },
    ],
    confidenceThreshold: 0.95,
    requiresApproval: true,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'Low Stock Auto Restock Alert',
    description: 'Send alert when product inventory falls below threshold',
    category: 'INVENTORY' as PlaybookCategory,
    trigger: {
      type: 'shopify_event',
      config: { event: 'product_out_of_stock' },
    },
    conditions: [
      { field: 'current_stock', operator: '<', value: '10' },
    ],
    actions: [
      { type: 'send_notification', config: { channel: 'email', to: 'inventory@example.com' } },
      { type: 'restock_product', config: { auto_order: false } },
    ],
    confidenceThreshold: 1.0,
    requiresApproval: true,
    enabled: false,
    isDefault: true,
  },
  {
    name: 'VIP Customer Fast Track',
    description: 'Automatically prioritize and fast-track orders from high-value customers',
    category: 'FULFILLMENT' as PlaybookCategory,
    trigger: {
      type: 'shopify_event',
      config: { event: 'order_created' },
    },
    conditions: [
      { field: 'customer_ltv', operator: '>', value: '1000' },
    ],
    actions: [
      { type: 'add_tag', config: { tag: 'vip_priority' } },
      { type: 'send_notification', config: { channel: 'slack', message: 'VIP order received' } },
      { type: 'send_email', config: { template: 'vip_thank_you', ai_generated: true } },
    ],
    confidenceThreshold: 0.9,
    requiresApproval: false,
    enabled: false,
    isDefault: true,
  },
];

export async function seedDefaultPlaybooks(userId: string) {
  console.log(`Seeding default playbooks for user ${userId}...`);
  
  // Check if user already has default playbooks
  const existing = await prisma.playbook.findFirst({
    where: { userId, isDefault: true },
  });

  if (existing) {
    console.log('Default playbooks already exist for this user');
    return;
  }

  // Create default playbooks
  for (const playbookData of DEFAULT_PLAYBOOKS) {
    await prisma.playbook.create({
      data: {
        ...playbookData,
        userId,
      },
    });
  }

  console.log(`Created ${DEFAULT_PLAYBOOKS.length} default playbooks`);
}

