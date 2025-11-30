'use client';

import Link from 'next/link';

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

export default function Pricing() {
  return (
    <section id="about" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
            Choose a plan that scales with your support volume
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            All plans include Shopify + inbox integrations, AI reply drafts, and
            analytics.
          </p>
          {/* Free Trial Banner */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm text-emerald-700">
            <span className="font-semibold">🎉 Free 7-day trial</span>
            <span className="text-emerald-600">—</span>
            <span>20 AI replies • 20 emails • 1 store</span>
          </div>
        </div>
        {/* Pricing is sourced from the Pricing page config to stay consistent */}
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {(['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] as PlanKey[]).map(
            (type) => {
              const meta = PLAN_META[type];
              const price = FALLBACK_PRICES[type];
              const isDark = type === 'GROWTH' || type === 'ENTERPRISE';
              const showFeaturedBadge = type === 'GROWTH';
              return (
                <div
                  key={type}
                  className={`relative flex flex-col rounded-3xl border p-8 shadow-lg transition hover:-translate-y-1 ${
                    isDark
                      ? 'border-slate-900 bg-slate-900 text-white shadow-2xl'
                      : 'border-white bg-white text-slate-900 shadow-slate-200/60'
                  }`}
                >
                  {showFeaturedBadge && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
                      Most Popular
                    </span>
                  )}
                  <div className="text-sm font-semibold uppercase tracking-[0.35em] text-current/70">
                    {meta.name}
                  </div>
                  <div className="mt-4 text-4xl font-black">
                    {price.label}
                    <span className="ml-2 text-sm font-semibold opacity-60">
                      {price.cadence}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm ${isDark ? 'text-white/70' : 'text-slate-500'}`}
                  >
                    {meta.badge}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {meta.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isDark ? 'bg-white/20 text-white' : 'bg-slate-900/5 text-slate-700'}`}
                        >
                          ✓
                        </span>
                        <span
                          className={
                            isDark ? 'text-white/80' : 'text-slate-600'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={
                      type === 'ENTERPRISE'
                        ? 'mailto:hi@zyyp.ai'
                        : '/integrations'
                    }
                    className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${
                      isDark
                        ? 'bg-white text-slate-900 hover:bg-slate-100'
                        : 'bg-slate-900 text-white hover:bg-black'
                    }`}
                  >
                    {type === 'ENTERPRISE' ? 'Talk to us' : 'Start free trial'}
                  </Link>
                </div>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}
