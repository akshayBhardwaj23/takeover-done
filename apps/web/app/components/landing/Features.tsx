'use client';

const ShopifyLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <path fill="#A5D6A7" d="M4 8.5 18 4l10 2.5v19L18 28 4 25.5z" />
    <path fill="#4CAF50" d="M18 4v24l10-3.5v-18z" />
    <path
      fill="#fff"
      d="m15.6 22.6 1.2-8.6c.1-.6.6-1 1.2-1l2.5.1-.3 2.2-1.4-.1-.7 5.8z"
    />
    <path fill="#2E7D32" d="M8 10.5 18 4v24l-10-2.5z" opacity=".2" />
  </svg>
);

const MailLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect x="4" y="7" width="24" height="18" rx="4" fill="#F06292" />
    <path fill="#fff" d="m6 9 10 8 10-8z" opacity=".9" />
    <path fill="#F8BBD0" d="m6 23 9.5-7.4c.3-.3.7-.3 1 0L26 23z" />
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect x="6" y="6" width="20" height="20" rx="10" fill="#fff" />
    <path fill="#36C5F0" d="M14 6h2v7h-2a3 3 0 1 1 0-6z" />
    <path fill="#2EB67D" d="M26 14v2h-7v-2a3 3 0 1 1 6 0z" />
    <path fill="#ECB22E" d="M18 26h-2v-7h2a3 3 0 1 1 0 6z" />
    <path fill="#E01E5A" d="M6 18v-2h7v2a3 3 0 1 1-6 0z" />
  </svg>
);

const MetaAdsLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect
      x="4"
      y="6"
      width="24"
      height="20"
      rx="10"
      fill="#0A84FF"
      opacity=".2"
    />
    <path
      fill="#0A84FF"
      d="M10 22c-1.9 0-3-1.5-3-4.2 0-4 2.1-7.8 5.1-7.8 2.4 0 3.6 1.9 5.3 4.8 1.4-2.8 2.7-4.8 5-4.8 2.9 0 4.6 3.7 4.6 7.6 0 3.1-1.2 4.4-2.8 4.4-2.1 0-3.3-2.4-5-5.5-1.5 2.9-2.8 5.5-5.2 5.5-1.3 0-2.4-.7-3.9-3.5l1.3-.7c1 2 1.8 2.6 2.6 2.6 1.5 0 2.7-2.3 4.4-5.7-1.5-2.6-2.4-3.8-3.7-3.8-1.9 0-3.4 2.8-3.4 6.2 0 2 .7 2.9 2 2.9 1.1 0 1.8-.6 2.7-1.5l.8 1c-1 .9-2.1 1.7-3.6 1.7z"
    />
  </svg>
);

const GoogleAnalyticsLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect x="6" y="14" width="6" height="12" rx="3" fill="#F9A825" />
    <rect x="14" y="8" width="6" height="18" rx="3" fill="#FB8C00" />
    <rect x="22" y="4" width="6" height="22" rx="3" fill="#F4511E" />
  </svg>
);

const WooLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <path
      d="M6 11c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4z"
      fill="#9C27B0"
    />
    <path
      fill="#fff"
      d="M11.2 18.4 9.6 14h1.6l.7 2.4.8-2.4H14l.8 2.4.7-2.4h1.5l-1.6 4.4h-1.5l-.7-2.1-.7 2.1zm8.6 0c-1.3 0-2.3-1.1-2.3-2.5s1-2.5 2.3-2.5 2.3 1.1 2.3 2.5-1 2.5-2.3 2.5zm0-1.2c.4 0 .7-.5.7-1.3s-.3-1.3-.7-1.3c-.4 0-.7.5-.7 1.3s.3 1.3.7 1.3z"
    />
  </svg>
);

const GoogleAdsLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <path d="M10 6h4l8 20h-4z" fill="#F4B400" />
    <path d="M12 26a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#0F9D58" />
    <path d="M16 6h4a4 4 0 0 1 4 4v14h-4z" fill="#4285F4" />
  </svg>
);

type IntegrationIcon = {
  name: string;
  gradient: string;
  Icon: () => JSX.Element;
};

const integrationIcons: IntegrationIcon[] = [
  {
    name: 'Shopify',
    gradient: 'from-emerald-400 to-emerald-600',
    Icon: ShopifyLogo,
  },
  { name: 'Mail', gradient: 'from-rose-400 to-red-500', Icon: MailLogo },
  {
    name: 'Slack',
    gradient: 'from-purple-400 to-fuchsia-500',
    Icon: SlackLogo,
  },
  {
    name: 'Meta Ads',
    gradient: 'from-blue-500 to-indigo-500',
    Icon: MetaAdsLogo,
  },
  {
    name: 'Google Analytics',
    gradient: 'from-orange-400 to-amber-500',
    Icon: GoogleAnalyticsLogo,
  },
  {
    name: 'WooCommerce',
    gradient: 'from-purple-500 to-indigo-500',
    Icon: WooLogo,
  },
  {
    name: 'Google Ads',
    gradient: 'from-sky-500 to-blue-600',
    Icon: GoogleAdsLogo,
  },
];

type ChannelCard = {
  name: string;
  model: string;
  status: string;
  badge: string;
  accent: string;
  pricePlan?: string;
};

const channelCards: ChannelCard[] = [
  {
    name: 'Mail',
    model: 'Support Inbox',
    status: 'Connected',
    badge: 'Primary',
    accent: 'from-blue-500 to-indigo-500',
    pricePlan: 'Launch',
  },
  {
    name: 'Shopify',
    model: 'Orders & Customers',
    status: 'Synced',
    badge: 'Realtime',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Slack',
    model: 'Escalations',
    status: 'Standby',
    badge: 'Optional',
    accent: 'from-purple-500 to-fuchsia-500',
  },
  {
    name: 'Mailgun',
    model: 'Outbound Replies',
    status: 'Active',
    badge: 'Automated',
    accent: 'from-sky-500 to-cyan-500',
  },
];

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
      'Basic AI reply generation',
      'Order matching & email threading',
    ],
  },
  GROWTH: {
    name: 'Growth',
    badge: 'Most popular',
    highlight: true,
    features: [
      '2,500 emails/month',
      'Up to 3 store connections',
      'Priority support response',
      'Advanced analytics & dashboards',
      'Reusable email templates',
    ],
  },
  PRO: {
    name: 'Pro',
    badge: 'For high-volume teams',
    features: [
      '10,000 emails/month',
      'Up to 10 store connections',
      'Custom AI training sessions',
      'Full API access',
      'White-label & advanced reporting',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    badge: 'Designed with you',
    features: [
      'Unlimited or volume-based emails',
      'Unlimited store connections',
      'Dedicated success & SLA guarantees',
      'Custom integrations & onboarding',
      'Volume discounts starting at ₹2/email',
    ],
  },
};

const FALLBACK_PRICES: Record<PlanKey, { label: string; cadence: string }> = {
  STARTER: { label: '₹999', cadence: 'per month' },
  GROWTH: { label: '₹2,999', cadence: 'per month' },
  PRO: { label: '₹9,999', cadence: 'per month' },
  ENTERPRISE: { label: 'Custom', cadence: 'tailored plan' },
};

export default function Features() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
            Autonomous workflows across every platform
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Connect ZYYP with your favorite tools — from e-commerce to marketing
            to support — for a truly autonomous business workflow.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm">
            + More Integrations Coming Soon.
          </span>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {integrationIcons.map((tool, index) => (
            <div
              key={tool.name}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(59,130,246,0.15)]"
              style={{ transitionDelay: `${index * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-inner shadow-white/20 transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.45)]`}
                >
                  <tool.Icon />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                    {tool.name}
                  </p>
                  <p className="text-xs text-slate-400">Connected in minutes</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {channelCards.map((card) => {
            const planKeyMap: Record<string, PlanKey> = {
              Launch: 'STARTER',
              Starter: 'STARTER',
              Growth: 'GROWTH',
              Pro: 'PRO',
              Enterprise: 'ENTERPRISE',
            };
            const mappedKey: PlanKey | undefined = card.pricePlan
              ? planKeyMap[card.pricePlan]
              : undefined;
            const planLabel = mappedKey ? PLAN_META[mappedKey].name : null;
            const planPriceLabel = mappedKey
              ? FALLBACK_PRICES[mappedKey].label
              : null;
            const planCadence = mappedKey
              ? FALLBACK_PRICES[mappedKey].cadence
              : null;

            return (
              <div
                key={card.name}
                className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-slate-50/70 p-6 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {card.name}
                    </p>
                    <p className="mt-3 text-2xl font-black text-slate-900">
                      {card.model}
                    </p>
                  </div>
                  <span
                    className={`rounded-full bg-gradient-to-r ${card.accent} px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white`}
                  >
                    {planLabel ?? card.badge}
                  </span>
                </div>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>{mappedKey ? 'Pricing' : 'Status'}</span>
                  <span>
                    {mappedKey
                      ? `${planPriceLabel} · ${planCadence}`
                      : card.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'Unified support inbox',
              description:
                'Every customer message, order, timeline, and AI recommendation in one panel built for ecommerce.',
            },
            {
              title: 'Approve & automate actions',
              description:
                'Set confidence thresholds, create macros, and allow auto-approve when the AI meets your standards.',
            },
            {
              title: 'Analytics your CFO loves',
              description:
                'Quantify savings, measure CSAT changes, and capture revenue saved from faster resolutions.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-slate-100 bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/30"
            >
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="mt-4 text-sm text-white/70">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
