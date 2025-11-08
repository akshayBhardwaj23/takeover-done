const plans = [
  {
    name: "Starter",
    price: "$29",
    cadence: "per month",
    badge: "For emerging brands",
    features: [
      "500 emails/month (outbound)",
      "1 Shopify store connection",
      "Unlimited AI suggestions",
      "Basic AI reply generation",
      "Order matching & email threading",
    ],
  },
  {
    name: "Growth",
    price: "$99",
    cadence: "per month",
    badge: "Most popular",
    highlight: true,
    features: [
      "2,500 emails/month",
      "Up to 3 store connections",
      "Priority support response",
      "Advanced analytics & dashboards",
      "Reusable email templates",
    ],
  },
  {
    name: "Pro",
    price: "$299",
    cadence: "per month",
    badge: "For high-volume teams",
    features: [
      "10,000 emails/month",
      "Up to 10 store connections",
      "Custom AI training sessions",
      "Full API access",
      "White-label & advanced reporting",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "tailored plan",
    badge: "Designed with you",
    features: [
      "Unlimited or volume-based emails",
      "Unlimited store connections",
      "Dedicated success & SLA guarantees",
      "Custom integrations & onboarding",
      "Volume discounts starting at $0.025/email",
    ],
  },
]

export const metadata = {
  title: "Pricing - Zyyp",
  description:
    "Transparent pricing plans for Zyyp's AI-powered customer support platform.",
}

export default function PricingPage() {
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
            margin-positive tiers that move with your growth. Switch between
            monthly and annual billing anytime (annual saves 20%).
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm shadow-slate-900/5 ${
                plan.highlight
                  ? "border-slate-900 bg-slate-900 text-white"
                  : ""
              }`}
            >
              <div className="space-y-3">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.3em] ${
                    plan.highlight ? "text-white/70" : "text-slate-500"
                  }`}
                >
                  {plan.badge}
                </span>
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="text-4xl font-black tracking-tight">
                  {plan.price}
                  <span className="ml-2 text-sm font-medium">
                    {plan.cadence}
                  </span>
                </p>
              </div>

              <ul className="space-y-4 text-sm leading-relaxed text-slate-600">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-3 ${
                      plan.highlight ? "text-white/80" : ""
                    }`}
                  >
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-auto rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                  plan.highlight
                    ? "border-white/40 bg-white text-slate-900 hover:bg-white/90"
                    : "border-slate-900/20 text-slate-900 hover:border-slate-900/40"
                }`}
              >
                {plan.name === "Enterprise" ? "Talk to sales" : "Start trial"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

