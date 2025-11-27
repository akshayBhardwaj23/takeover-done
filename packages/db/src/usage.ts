import { prisma } from './index.js';

// Base plan limits (without pricing - pricing is currency-dependent)
export const PLAN_LIMITS = {
  TRIAL: {
    emailsPerMonth: 20, // Free trial: 20 emails only
    aiRepliesLimit: 20, // Free trial: 20 AI-assisted replies only
    emailsReceivedLimit: 20, // Free trial: only process 20 incoming emails
    stores: 1, // Free trial: 1 store only
    name: 'Free Trial',
    trialDays: 7, // 7-day free trial
  },
  STARTER: {
    emailsPerMonth: 500,
    aiRepliesLimit: 500, // Match emails limit
    emailsReceivedLimit: -1, // Unlimited on paid plans
    stores: 1,
    name: 'Starter',
  },
  GROWTH: {
    emailsPerMonth: 2500,
    aiRepliesLimit: 2500, // Match emails limit
    emailsReceivedLimit: -1, // Unlimited on paid plans
    stores: 3,
    name: 'Growth',
  },
  PRO: {
    emailsPerMonth: 10000,
    aiRepliesLimit: 10000, // Match emails limit
    emailsReceivedLimit: -1, // Unlimited on paid plans
    stores: 10,
    name: 'Pro',
  },
  ENTERPRISE: {
    emailsPerMonth: -1, // unlimited
    aiRepliesLimit: -1, // unlimited
    emailsReceivedLimit: -1, // unlimited
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
 * Optimized: Don't load usageRecords unless needed
 */
export async function ensureSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    // Removed include: { usageRecords: true } - not needed here, saves query time
  });

  if (existing) {
    if (existing.planType === 'TRIAL') {
      const now = new Date();
      if (now > existing.currentPeriodEnd && existing.status === 'active') {
        return prisma.subscription.update({
          where: { id: existing.id },
          data: { status: 'expired' },
          // Removed include: { usageRecords: true } - not needed here
        });
      }
    }
    return existing;
  }

  // Create default trial subscription
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

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
 * Optimized: Use indexed queries and reduce database round trips
 */
export async function getCurrentUsageRecord(subscriptionId: string) {
  // Fetch subscription and current period info in one query
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      planType: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
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
    // Use findUnique with composite key (indexed) - much faster
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
    if (subscription.planType === 'TRIAL') {
      if (subscription.status === 'active') {
        // Update in background, don't wait
        prisma.subscription
          .update({
            where: { id: subscription.id },
            data: { status: 'expired' },
          })
          .catch((err) => console.error('Failed to expire trial:', err));
      }

      // Use indexed query: subscriptionId + periodStart (desc) - limit to 1
      const latestRecord = await prisma.usageRecord.findFirst({
        where: { subscriptionId },
        orderBy: { periodStart: 'desc' },
        take: 1, // Only need the latest one
      });

      if (!latestRecord) {
        throw new Error('Usage record not found for expired trial');
      }

      return latestRecord;
    }
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
  if (subscription.planType === 'TRIAL' && subscription.status === 'expired') {
    throw new Error('Trial expired. Cannot send more emails.');
  }
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
 * Check if user can receive more emails based on plan limits
 */
export async function canReceiveEmail(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
  remaining: number;
  planType: string;
  trial: {
    isTrial: boolean;
    expired: boolean;
    endsAt: Date | null;
    daysRemaining: number | null;
  };
}> {
  const subscription = await ensureSubscription(userId);
  const planLimits = PLAN_LIMITS[subscription.planType];
  const now = new Date();
  const isTrial = subscription.planType === 'TRIAL';
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  // Check if we're within the current billing period
  const isWithinPeriod = now >= periodStart && now <= periodEnd;

  // Get usage record
  let usageRecord;
  if (isWithinPeriod) {
    usageRecord = await prisma.usageRecord.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId: subscription.id,
          periodStart,
        },
      },
    });

    if (!usageRecord) {
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId: subscription.id,
          periodStart,
          periodEnd,
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }
  } else {
    // Period expired
    if (subscription.planType === 'TRIAL' && subscription.status === 'active') {
      prisma.subscription
        .update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        })
        .catch((err) => console.error('Failed to expire trial:', err));
    }

    usageRecord = await prisma.usageRecord.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { periodStart: 'desc' },
      take: 1,
    });

    if (!usageRecord) {
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId: subscription.id,
          periodStart: periodEnd,
          periodEnd: new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }
  }

  const limit = planLimits.emailsReceivedLimit ?? -1;
  const current = usageRecord.emailsReceived;
  const endsAt = isTrial ? subscription.currentPeriodEnd : null;
  const expired = isTrial ? now > subscription.currentPeriodEnd : false;
  const daysRemaining =
    isTrial && !expired
      ? Math.max(
          0,
          Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
  const remaining =
    limit === -1 ? -1 : Math.max(0, planLimits.emailsReceivedLimit - current);
  const normalizedRemaining =
    isTrial && expired && limit !== -1 ? 0 : remaining;

  // Unlimited plan
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      percentage: 0,
      remaining: -1,
      planType: subscription.planType,
      trial: {
        isTrial,
        expired,
        endsAt,
        daysRemaining: isTrial ? daysRemaining : null,
      },
    };
  }

  const percentage = (current / limit) * 100;
  const allowed = current < limit && !(isTrial && expired);

  return {
    allowed,
    current,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    remaining: normalizedRemaining,
    planType: subscription.planType,
    trial: {
      isTrial,
      expired,
      endsAt,
      daysRemaining: isTrial ? daysRemaining : null,
    },
  };
}

/**
 * Increment email received count
 */
export async function incrementEmailReceived(userId: string) {
  const subscription = await ensureSubscription(userId);
  if (subscription.planType === 'TRIAL' && subscription.status === 'expired') {
    throw new Error('Trial expired. Cannot receive more emails.');
  }
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
 * Optimized: Combine subscription and usage record queries where possible
 */
export async function canSendEmail(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
  remaining: number;
  planType: string;
  trial: {
    isTrial: boolean;
    expired: boolean;
    endsAt: Date | null;
    daysRemaining: number | null;
  };
}> {
  // Optimized: Get subscription first (single query)
  const subscription = await ensureSubscription(userId);
  const planLimits = PLAN_LIMITS[subscription.planType];
  const now = new Date();
  const isTrial = subscription.planType === 'TRIAL';
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  // Check if we're within the current billing period
  const isWithinPeriod = now >= periodStart && now <= periodEnd;

  // Optimized: Get usage record in single query using composite key
  let usageRecord;
  if (isWithinPeriod) {
    // Try to get existing usage record (indexed lookup - fast)
    usageRecord = await prisma.usageRecord.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId: subscription.id,
          periodStart,
        },
      },
    });

    // Create if doesn't exist (only happens once per period)
    if (!usageRecord) {
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId: subscription.id,
          periodStart,
          periodEnd,
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }
  } else {
    // Period expired - get latest record (indexed query with limit)
    if (subscription.planType === 'TRIAL' && subscription.status === 'active') {
      // Update in background, don't wait
      prisma.subscription
        .update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        })
        .catch((err) => console.error('Failed to expire trial:', err));
    }

    usageRecord = await prisma.usageRecord.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { periodStart: 'desc' },
      take: 1,
    });

    if (!usageRecord) {
      // Fallback: create a new record
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId: subscription.id,
          periodStart: periodEnd,
          periodEnd: new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }
  }

  const limit = planLimits.emailsPerMonth;
  const current = usageRecord.emailsSent;
  const endsAt = isTrial ? subscription.currentPeriodEnd : null;
  const expired = isTrial ? now > subscription.currentPeriodEnd : false;
  const daysRemaining =
    isTrial && !expired
      ? Math.max(
          0,
          Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
  const remaining =
    limit === -1 ? -1 : Math.max(0, planLimits.emailsPerMonth - current);
  const normalizedRemaining =
    isTrial && expired && limit !== -1 ? 0 : remaining;

  // Unlimited plan
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      percentage: 0,
      remaining: -1,
      planType: subscription.planType,
      trial: {
        isTrial,
        expired,
        endsAt,
        daysRemaining: isTrial ? daysRemaining : null,
      },
    };
  }

  const percentage = (current / limit) * 100;
  const allowed = current < limit && !(isTrial && expired);

  return {
    allowed,
    current,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    remaining: normalizedRemaining,
    planType: subscription.planType,
    trial: {
      isTrial,
      expired,
      endsAt,
      daysRemaining: isTrial ? daysRemaining : null,
    },
  };
}

/**
 * Check if user can use AI-assisted replies based on plan limits
 */
export async function canUseAI(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
  remaining: number;
  planType: string;
  trial: {
    isTrial: boolean;
    expired: boolean;
    endsAt: Date | null;
    daysRemaining: number | null;
  };
}> {
  const subscription = await ensureSubscription(userId);
  const planLimits = PLAN_LIMITS[subscription.planType];
  const now = new Date();
  const isTrial = subscription.planType === 'TRIAL';
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  // Check if we're within the current billing period
  const isWithinPeriod = now >= periodStart && now <= periodEnd;

  // Get usage record
  let usageRecord;
  if (isWithinPeriod) {
    usageRecord = await prisma.usageRecord.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId: subscription.id,
          periodStart,
        },
      },
    });

    if (!usageRecord) {
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId: subscription.id,
          periodStart,
          periodEnd,
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }
  } else {
    // Period expired
    if (subscription.planType === 'TRIAL' && subscription.status === 'active') {
      prisma.subscription
        .update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        })
        .catch((err) => console.error('Failed to expire trial:', err));
    }

    usageRecord = await prisma.usageRecord.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { periodStart: 'desc' },
      take: 1,
    });

    if (!usageRecord) {
      usageRecord = await prisma.usageRecord.create({
        data: {
          subscriptionId: subscription.id,
          periodStart: periodEnd,
          periodEnd: new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
          emailsSent: 0,
          emailsReceived: 0,
          aiSuggestions: 0,
        },
      });
    }
  }

  const limit = planLimits.aiRepliesLimit;
  const current = usageRecord.aiSuggestions;
  const endsAt = isTrial ? subscription.currentPeriodEnd : null;
  const expired = isTrial ? now > subscription.currentPeriodEnd : false;
  const daysRemaining =
    isTrial && !expired
      ? Math.max(
          0,
          Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
  const remaining =
    limit === -1 ? -1 : Math.max(0, planLimits.aiRepliesLimit - current);
  const normalizedRemaining =
    isTrial && expired && limit !== -1 ? 0 : remaining;

  // Unlimited plan
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      percentage: 0,
      remaining: -1,
      planType: subscription.planType,
      trial: {
        isTrial,
        expired,
        endsAt,
        daysRemaining: isTrial ? daysRemaining : null,
      },
    };
  }

  const percentage = (current / limit) * 100;
  const allowed = current < limit && !(isTrial && expired);

  return {
    allowed,
    current,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    remaining: normalizedRemaining,
    planType: subscription.planType,
    trial: {
      isTrial,
      expired,
      endsAt,
      daysRemaining: isTrial ? daysRemaining : null,
    },
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
  const aiLimit = planLimits.aiRepliesLimit;
  const current = usageRecord.emailsSent;
  const aiCurrent = usageRecord.aiSuggestions;
  const now = new Date();
  const isTrial = subscription.planType === 'TRIAL';
  const expired = isTrial ? now > subscription.currentPeriodEnd : false;
  const daysRemaining =
    isTrial && !expired
      ? Math.max(
          0,
          Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  // Note: price is now currency-dependent, fetched separately via API
  const canSendMore =
    (limit === -1 || current < limit) && !(isTrial && expired);
  const canUseAIMore =
    (aiLimit === -1 || aiCurrent < aiLimit) && !(isTrial && expired);

  return {
    planType: subscription.planType,
    planName: planLimits.name,
    emailsSent: current,
    emailsReceived: usageRecord.emailsReceived,
    aiSuggestions: aiCurrent,
    emailLimit: limit,
    aiLimit: aiLimit,
    emailUsagePercentage:
      limit === -1 ? 0 : Math.round((current / limit) * 10000) / 100,
    aiUsagePercentage:
      aiLimit === -1 ? 0 : Math.round((aiCurrent / aiLimit) * 10000) / 100,
    canSendEmail: canSendMore,
    canUseAI: canUseAIMore,
    periodStart: usageRecord.periodStart,
    periodEnd: usageRecord.periodEnd,
    status: subscription.status,
    storesLimit: planLimits.stores,
    emailsRemaining:
      limit === -1 ? -1 : isTrial && expired ? 0 : Math.max(0, limit - current),
    aiRemaining:
      aiLimit === -1 ? -1 : isTrial && expired ? 0 : Math.max(0, aiLimit - aiCurrent),
    trial: {
      isTrial,
      expired,
      endsAt: isTrial ? subscription.currentPeriodEnd : null,
      daysRemaining: isTrial ? daysRemaining : null,
    },
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
