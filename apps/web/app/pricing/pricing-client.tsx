'use client';

import { trpc } from '../../lib/trpc';

type PlanKey = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
type PlanMeta = {
  name: string;
  badge: string;
  features: string[];
  highlight?: boolean;
};

const PLAN_META: Record<PlanKey, PlanMeta> = {
  STARTER: {
    name: 'Starter',
    badge: 'For emerging brands',
    features: [
      '500 emails/month (outbound)',
      '500 AI-assisted replies/month',
      '1 Shopify store connection',
      'Order matching & email threading',
    ],
  },
  GROWTH: {
    name: 'Growth',
    badge: 'Most popular',
    highlight: true,
    features: [
      '2,500 emails/month',
      '2,500 AI-assisted replies/month',
      'Up to 3 store connections',
      'Priority support response',
      'Advanced analytics & dashboards',
    ],
  },
  PRO: {
    name: 'Pro',
    badge: 'For high-volume teams',
    features: [
      '10,000 emails/month',
      '10,000 AI-assisted replies/month',
      'Up to 10 store connections',
      'Full API access',
      'White-label & advanced reporting',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    badge: 'Designed with you',
    features: [
      'Unlimited emails',
      'Unlimited AI-assisted replies',
      'Unlimited store connections',
      'Dedicated success & SLA guarantees',
      'Custom integrations & onboarding',
    ],
  },
};

const FALLBACK_PRICES: Record<PlanKey, { label: string; cadence: string }> = {
  STARTER: { label: '₹999', cadence: 'per month' },
  GROWTH: { label: '₹2,999', cadence: 'per month' },
  PRO: { label: '₹9,999', cadence: 'per month' },
  ENTERPRISE: { label: 'Custom', cadence: 'tailored plan' },
};

const PLAN_ORDER: PlanKey[] = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'];

export function PricingClient() {
  const pricing = trpc.getAvailablePlans.useQuery();

  const currencyLabel =
    pricing.data?.currency === 'USD'
      ? 'USD ($)'
      : pricing.data?.currency === 'INR'
        ? 'INR (₹)'
        : 'INR (₹)';

  const plans = PLAN_ORDER.map((type) => {
    const meta = PLAN_META[type];
    const remotePlan = pricing.data?.plans.find((plan) => plan.type === type);
    const priceValue = remotePlan?.price ?? -1;
    const priceLabel =
      remotePlan && priceValue >= 0
        ? remotePlan.formattedPrice
        : FALLBACK_PRICES[type].label;
    const cadence =
      remotePlan && priceValue >= 0
        ? 'per month'
        : FALLBACK_PRICES[type].cadence;
    const isHighlight = type === 'GROWTH';
    return {
      ...meta,
      type,
      priceLabel,
      cadence,
      isHighlight,
    };
  });

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-36 sm:px-10">
        <header className="space-y-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Pricing
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plans built for support teams that scale.
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-slate-600 sm:text-xl">
            Plans map directly to our official pricing strategy—volume-based,
            margin-positive tiers that move with your growth. Prices shown in
            {` `}
            <span className="font-semibold text-slate-900">
              {currencyLabel}
            </span>{' '}
            and adjust automatically based on your location.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.type}
              className={`flex flex-col gap-6 rounded-3xl p-10 shadow-sm shadow-slate-900/5 border transition-colors ${
                plan.isHighlight
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="space-y-3">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.3em] ${
                    plan.isHighlight ? 'text-white/70' : 'text-slate-500'
                  }`}
                >
                  {plan.badge}
                </span>
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="text-4xl font-black tracking-tight">
                  {plan.priceLabel}
                  <span className="ml-2 text-sm font-medium">
                    {plan.cadence}
                  </span>
                </p>
              </div>

              <ul className="space-y-4 text-sm leading-relaxed">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-3 ${
                      plan.isHighlight ? 'text-white/80' : 'text-slate-600'
                    }`}
                  >
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-auto rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                  plan.isHighlight
                    ? 'border-white/40 bg-white text-slate-900 hover:bg-white/90'
                    : 'border-slate-900/20 text-slate-900 hover:border-slate-900/40'
                }`}
              >
                {plan.type === 'ENTERPRISE' ? 'Talk to sales' : 'Start trial'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
