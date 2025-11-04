import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import crypto from 'crypto';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

/**
 * Razorpay Webhook Handler
 * Handles subscription events from Razorpay
 *
 * Events handled:
 * - subscription.activated
 * - subscription.charged
 * - subscription.updated
 * - subscription.cancelled
 * - subscription.paused
 * - subscription.resumed
 * - subscription.completed
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 },
      );
    }

    const isValid = verifyRazorpayWebhookSignature(
      body,
      signature,
      webhookSecret,
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    console.log('Razorpay webhook event:', eventType, event.payload);

    // Handle different event types
    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.updated': {
        await handleSubscriptionUpdate(event.payload);
        break;
      }

      case 'subscription.cancelled': {
        await handleSubscriptionCancelled(event.payload);
        break;
      }

      case 'subscription.completed': {
        await handleSubscriptionCompleted(event.payload);
        break;
      }

      case 'subscription.paused': {
        await handleSubscriptionPaused(event.payload);
        break;
      }

      case 'subscription.resumed': {
        await handleSubscriptionResumed(event.payload);
        break;
      }

      case 'payment.failed': {
        await handlePaymentFailed(event.payload);
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

async function handleSubscriptionUpdate(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;
  const status = subscriptionEntity.status;

  // Find subscription by Razorpay subscription ID
  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: subscriptionId },
  });

  if (!subscription) {
    console.error('Subscription not found for Razorpay ID:', subscriptionId);
    return;
  }

  // Update subscription status
  const updateData: any = {
    status: mapRazorpayStatus(status),
    metadata: {
      ...((subscription.metadata as any) || {}),
      razorpaySubscription: subscriptionEntity,
      lastWebhookEvent: new Date().toISOString(),
    },
  };

  // Update billing period if available
  if (subscriptionEntity.current_start && subscriptionEntity.current_end) {
    updateData.currentPeriodStart = new Date(
      subscriptionEntity.current_start * 1000,
    );
    updateData.currentPeriodEnd = new Date(
      subscriptionEntity.current_end * 1000,
    );
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: updateData,
  });

  await logEvent(
    'subscription.updated',
    {
      subscriptionId,
      status,
      razorpayStatus: status,
    },
    'subscription',
    subscription.id,
  );
}

async function handleSubscriptionCancelled(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'cancelled',
      canceledAt: new Date(),
      metadata: {
        ...((subscription.metadata as any) || {}),
        cancelledAt: new Date().toISOString(),
      } as any,
    },
  });

  await logEvent(
    'subscription.cancelled',
    { subscriptionId },
    'subscription',
    subscription.id,
  );
}

async function handleSubscriptionCompleted(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'expired',
      metadata: {
        ...((subscription.metadata as any) || {}),
        completedAt: new Date().toISOString(),
      } as any,
    },
  });

  await logEvent(
    'subscription.completed',
    { subscriptionId },
    'subscription',
    subscription.id,
  );
}

async function handleSubscriptionPaused(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'paused',
      metadata: {
        ...((subscription.metadata as any) || {}),
        pausedAt: new Date().toISOString(),
      } as any,
    },
  });
}

async function handleSubscriptionResumed(payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  if (!subscriptionEntity) return;

  const subscriptionId = subscriptionEntity.id;

  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'active',
      metadata: {
        ...((subscription.metadata as any) || {}),
        resumedAt: new Date().toISOString(),
      } as any,
    },
  });
}

async function handlePaymentFailed(payload: any) {
  const paymentEntity = payload.payment?.entity;
  if (!paymentEntity) return;

  const subscriptionId = paymentEntity.subscription_id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'past_due',
      metadata: {
        ...((subscription.metadata as any) || {}),
        paymentFailed: true,
        lastFailedPayment: new Date().toISOString(),
      } as any,
    },
  });

  await logEvent(
    'subscription.payment_failed',
    { subscriptionId, paymentId: paymentEntity.id },
    'subscription',
    subscription.id,
  );
}

/**
 * Verify Razorpay webhook signature
 */
function verifyRazorpayWebhookSignature(
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
 * Map Razorpay subscription status to our status
 */
function mapRazorpayStatus(
  razorpayStatus: string,
): 'active' | 'cancelled' | 'expired' | 'paused' | 'past_due' {
  switch (razorpayStatus) {
    case 'active':
    case 'authenticated':
      return 'active';
    case 'cancelled':
      return 'cancelled';
    case 'completed':
    case 'expired':
      return 'expired';
    case 'paused':
      return 'paused';
    case 'pending':
    case 'halted':
      return 'past_due';
    default:
      return 'active';
  }
}
