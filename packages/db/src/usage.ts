import { prisma } from './index.js';

// Base plan limits (without pricing - pricing is currency-dependent)
export const PLAN_LIMITS = {
  TRIAL: {
    emailsPerMonth: 100,
    stores: 1,
    name: 'Free Trial',
  },
  STARTER: {
    emailsPerMonth: 500,
    stores: 1,
    name: 'Starter',
  },
  GROWTH: {
    emailsPerMonth: 2500,
    stores: 3,
    name: 'Growth',
  },
  PRO: {
    emailsPerMonth: 10000,
    stores: 10,
    name: 'Pro',
  },
  ENTERPRISE: {
    emailsPerMonth: -1, // unlimited
    stores: -1, // unlimited
    name: 'Enterprise',
  },
} as const;

// Legacy support - default to USD pricing for backward compatibility
export const PLAN_LIMITS_WITH_PRICE = {
  TRIAL: {
    ...PLAN_LIMITS.TRIAL,
    price: 0,
  },
  STARTER: {
    ...PLAN_LIMITS.STARTER,
    price: 29, // USD default
  },
  GROWTH: {
    ...PLAN_LIMITS.GROWTH,
    price: 99, // USD default
  },
  PRO: {
    ...PLAN_LIMITS.PRO,
    price: 299, // USD default
  },
  ENTERPRISE: {
    ...PLAN_LIMITS.ENTERPRISE,
    price: -1, // custom
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

/**
 * Get or create a subscription for a user
 */
export async function ensureSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    include: { usageRecords: true },
  });

  if (existing) {
    return existing;
  }

  // Create default trial subscription
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

  return await prisma.subscription.create({
    data: {
      userId,
      planType: 'TRIAL',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    },
  });
}

/**
 * Get current usage record for a subscription in the current billing period
 */
export async function getCurrentUsageRecord(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const now = new Date();
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  // Check if we're within the current billing period
  if (now >= periodStart && now <= periodEnd) {
    // Get or create usage record for this period
    let usageRecord = await prisma.usageRecord.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId,
          periodStart,
        },
      },
    });

    if (!usageRecord) {
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId,
          periodStart,
          periodEnd,
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }

    return usageRecord;
  } else {
    // Period expired, create new period
    const newPeriodStart = periodEnd;
    const newPeriodEnd = new Date(newPeriodStart);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1); // Monthly billing

    return await prisma.usageRecord.create({
      data: {
        subscriptionId,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        emailsSent: 0,
        emailsReceived: 0,
        aiSuggestions: 0,
      },
    });
  }
}

/**
 * Increment email sent count
 */
export async function incrementEmailSent(userId: string) {
  const subscription = await ensureSubscription(userId);
  const usageRecord = await getCurrentUsageRecord(subscription.id);

  return await prisma.usageRecord.update({
    where: { id: usageRecord.id },
    data: {
      emailsSent: {
        increment: 1,
      },
    },
  });
}

/**
 * Increment email received count
 */
export async function incrementEmailReceived(userId: string) {
  const subscription = await ensureSubscription(userId);
  const usageRecord = await getCurrentUsageRecord(subscription.id);

  return await prisma.usageRecord.update({
    where: { id: usageRecord.id },
    data: {
      emailsReceived: {
        increment: 1,
      },
    },
  });
}

/**
 * Increment AI suggestion count
 */
export async function incrementAISuggestion(userId: string) {
  const subscription = await ensureSubscription(userId);
  const usageRecord = await getCurrentUsageRecord(subscription.id);

  return await prisma.usageRecord.update({
    where: { id: usageRecord.id },
    data: {
      aiSuggestions: {
        increment: 1,
      },
    },
  });
}

/**
 * Check if user can send email based on plan limits
 */
export async function canSendEmail(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
}> {
  const subscription = await ensureSubscription(userId);
  const usageRecord = await getCurrentUsageRecord(subscription.id);
  const planLimits = PLAN_LIMITS[subscription.planType];

  const limit = planLimits.emailsPerMonth;
  const current = usageRecord.emailsSent;

  // Unlimited plan
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      percentage: 0,
    };
  }

  const percentage = (current / limit) * 100;
  const allowed = current < limit;

  return {
    allowed,
    current,
    limit,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId: string) {
  const subscription = await ensureSubscription(userId);
  const usageRecord = await getCurrentUsageRecord(subscription.id);
  const planLimits = PLAN_LIMITS[subscription.planType];

  const limit = planLimits.emailsPerMonth;
  const current = usageRecord.emailsSent;

  // Note: price is now currency-dependent, fetched separately via API
  return {
    planType: subscription.planType,
    planName: planLimits.name,
    emailsSent: current,
    emailsReceived: usageRecord.emailsReceived,
    aiSuggestions: usageRecord.aiSuggestions,
    emailLimit: limit,
    emailUsagePercentage:
      limit === -1 ? 0 : Math.round((current / limit) * 10000) / 100,
    canSendEmail: limit === -1 || current < limit,
    periodStart: usageRecord.periodStart,
    periodEnd: usageRecord.periodEnd,
    status: subscription.status,
    storesLimit: planLimits.stores,
  };
}

/**
 * Get usage history (last 6 months)
 */
export async function getUsageHistory(userId: string) {
  const subscription = await ensureSubscription(userId);

  const records = await prisma.usageRecord.findMany({
    where: { subscriptionId: subscription.id },
    orderBy: { periodStart: 'desc' },
    take: 6,
  });

  return records.map((r) => ({
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    emailsSent: r.emailsSent,
    emailsReceived: r.emailsReceived,
    aiSuggestions: r.aiSuggestions,
  }));
}
