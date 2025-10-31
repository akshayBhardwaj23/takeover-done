/**
 * Currency and location detection for pricing
 */

export type Currency = 'INR' | 'USD';

export type PlanPricing = {
  USD: number;
  INR: number;
};

export const PLAN_PRICING: Record<string, PlanPricing> = {
  TRIAL: {
    USD: 0,
    INR: 0,
  },
  STARTER: {
    USD: 29,
    INR: 999,
  },
  GROWTH: {
    USD: 99,
    INR: 2999,
  },
  PRO: {
    USD: 299,
    INR: 9999,
  },
  ENTERPRISE: {
    USD: -1,
    INR: -1,
  },
};

/**
 * Detect user currency based on location
 * This is a simple implementation - you can enhance with IP geolocation
 */
export function detectCurrency(
  country?: string,
  preferredCurrency?: string,
): Currency {
  // If user explicitly prefers a currency, use it
  if (preferredCurrency === 'INR' || preferredCurrency === 'USD') {
    return preferredCurrency;
  }

  // Detect based on country
  if (country) {
    const indianCountries = ['IN', 'India'];
    if (indianCountries.includes(country)) {
      return 'INR';
    }
  }

  // Default to INR for now (since you're Indian business)
  // Change to USD if you want international default
  return 'INR';
}

/**
 * Get price for a plan based on currency
 */
export function getPlanPrice(planType: string, currency: Currency): number {
  const pricing = PLAN_PRICING[planType];
  if (!pricing) return 0;
  return pricing[currency];
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currency: Currency): string {
  if (currency === 'INR') {
    return `₹${price.toLocaleString('en-IN')}`;
  }
  return `$${price.toLocaleString('en-US')}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return currency === 'INR' ? '₹' : '$';
}

