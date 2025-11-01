import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PLAN_LIMITS, type PlanType } from '@ai-ecom/db';
import { PLAN_PRICING, type Currency } from './currency';
import { getRazorpayPlanConfig } from './planMapping';

// Initialize Razorpay instance
export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Get or create Razorpay customer
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  contact?: string,
) {
  const razorpay = getRazorpayInstance();

  // Try to find existing customer by email
  try {
    // Razorpay customers.all() doesn't support email filter directly
    // We'll need to fetch all and filter, or create new if not found
    // For now, we'll create a new customer if lookup fails
    const customersResponse = await razorpay.customers.all({
      count: 100, // Fetch recent customers
    });

    const customers = (customersResponse as any).items || [];
    const matchingCustomer = customers.find(
      (c: any) => c.email === email.toLowerCase(),
    );

    if (matchingCustomer) {
      return matchingCustomer;
    }
  } catch (error) {
    console.error('Error fetching customer:', error);
    // Continue to create new customer
  }

  // Create new customer
  try {
    const customer = await razorpay.customers.create({
      name,
      email,
      contact: contact || undefined,
    });
    return customer;
  } catch (error: any) {
    console.error('Error creating Razorpay customer:', error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

/**
 * Create Razorpay subscription
 */
export async function createSubscription(
  customerId: string,
  planType: PlanType,
  userId: string,
  currency: Currency = 'INR',
) {
  const razorpay = getRazorpayInstance();
  const planConfig = getRazorpayPlanConfig(planType, currency);

  if (!planConfig) {
    throw new Error(
      `Razorpay plan not found for plan: ${planType}, currency: ${currency}`,
    );
  }

  try {
    // Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planConfig.planId,
      customer_notify: 1,
      total_count: 12, // 12 months (yearly subscription, monthly billing)
      start_at: Math.floor(Date.now() / 1000) + 60, // Start in 60 seconds
      notes: {
        userId,
        planType,
        currency,
      },
      // Optional: add coupon support
      // offer_id: offerId,
    });

    return subscription;
  } catch (error: any) {
    console.error('Error creating Razorpay subscription:', error);
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
}

/**
 * Create Razorpay plan (one-time setup, can be done via dashboard)
 * This is a helper function to create plans programmatically if needed
 */
export async function createPlan(
  planType: PlanType,
  amount: number,
  currency: Currency = 'INR',
  interval: 'monthly' | 'yearly' = 'monthly',
) {
  const razorpay = getRazorpayInstance();
  const planDetails = PLAN_LIMITS[planType];

  try {
    const plan = await razorpay.plans.create({
      period: interval === 'monthly' ? 'monthly' : 'yearly',
      interval: 1,
      item: {
        name: `${planDetails.name} Plan (${currency})`,
        description: `${planDetails.name} plan - ${planDetails.emailsPerMonth} emails/month`,
        amount: Math.round(amount * 100), // Convert to smallest currency unit (paise for INR, cents for USD)
        currency: currency,
      },
      notes: {
        planType,
        currency,
        emailsPerMonth: String(planDetails.emailsPerMonth),
        stores: String(planDetails.stores),
      },
    });

    return plan;
  } catch (error: any) {
    console.error('Error creating Razorpay plan:', error);
    throw new Error(`Failed to create plan: ${error.message}`);
  }
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Get subscription details from Razorpay
 */
export async function getSubscription(subscriptionId: string) {
  const razorpay = getRazorpayInstance();

  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }
}

/**
 * Cancel Razorpay subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = false,
) {
  const razorpay = getRazorpayInstance();

  try {
    if (cancelAtPeriodEnd) {
      // Cancel at period end - Razorpay API: cancel accepts boolean for cancel_at_period_end
      const subscription = await razorpay.subscriptions.cancel(
        subscriptionId,
        true, // cancel_at_period_end
      );
      return subscription;
    } else {
      // Cancel immediately
      const subscription = await razorpay.subscriptions.cancel(subscriptionId);
      return subscription;
    }
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

/**
 * Update subscription (upgrade/downgrade)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlanId: string,
  prorate: boolean = true,
) {
  const razorpay = getRazorpayInstance();

  try {
    // Razorpay doesn't support direct plan changes
    // We need to cancel current and create new subscription
    // This is a simplified version - you may want to handle proration manually
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Cancel current subscription
    await cancelSubscription(subscriptionId, true); // Cancel at period end

    // Get the end date for the current subscription period
    const currentEnd =
      subscription.current_end || subscription.end_at || Date.now() / 1000;

    // Create new subscription for the customer
    const newSubscription = await razorpay.subscriptions.create({
      plan_id: newPlanId,
      customer_notify: 1,
      total_count: 12,
      start_at: Math.floor(
        typeof currentEnd === 'number' ? currentEnd : currentEnd / 1000,
      ), // Start when current ends
      notes: subscription.notes,
    });

    return newSubscription;
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}
