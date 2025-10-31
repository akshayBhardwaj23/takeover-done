import { PLAN_LIMITS, type PlanType } from '@ai-ecom/db';
import { PLAN_PRICING, type Currency } from './currency';

/**
 * Razorpay plan mapping with currency support
 * These plan IDs should be created in Razorpay dashboard
 * You need separate plans for INR pricing
 */
export const RAZORPAY_PLAN_CONFIG: Record<
  string,
  Record<Currency, { planId: string; amount: number }>
> = {
  STARTER: {
    INR: {
      planId: process.env.RAZORPAY_PLAN_STARTER_INR || 'plan_starter_inr',
      amount: PLAN_PRICING.STARTER.INR,
    },
    USD: {
      planId: process.env.RAZORPAY_PLAN_STARTER_USD || 'plan_starter_usd',
      amount: PLAN_PRICING.STARTER.USD,
    },
  },
  GROWTH: {
    INR: {
      planId: process.env.RAZORPAY_PLAN_GROWTH_INR || 'plan_growth_inr',
      amount: PLAN_PRICING.GROWTH.INR,
    },
    USD: {
      planId: process.env.RAZORPAY_PLAN_GROWTH_USD || 'plan_growth_usd',
      amount: PLAN_PRICING.GROWTH.USD,
    },
  },
  PRO: {
    INR: {
      planId: process.env.RAZORPAY_PLAN_PRO_INR || 'plan_pro_inr',
      amount: PLAN_PRICING.PRO.INR,
    },
    USD: {
      planId: process.env.RAZORPAY_PLAN_PRO_USD || 'plan_pro_usd',
      amount: PLAN_PRICING.PRO.USD,
    },
  },
} as const;

/**
 * Get Razorpay plan configuration for a plan type and currency
 */
export function getRazorpayPlanConfig(
  planType: PlanType,
  currency: Currency = 'INR',
) {
  if (planType === 'TRIAL' || planType === 'ENTERPRISE') {
    return null; // These don't have Razorpay plans
  }
  const config = RAZORPAY_PLAN_CONFIG[planType];
  return config ? { ...config[currency], currency } : null;
}
