'use client';

export default function Benefits() {
  const benefits = [
    {
      title: 'Resolve tickets in minutes',
      description:
        'AI drafts the perfect response and proposed Shopify action so your team only approves and ships.',
    },
    {
      title: 'Eliminate tab switching',
      description:
        'Inbox, order history, AI suggestions, and macros live together, reducing handle time by 60%+. ',
    },
    {
      title: 'See ROI instantly',
      description:
        'Track savings, response times, and CSAT improvements with a support analytics dashboard built for ecommerce.',
    },
  ];

  return (
    <section id="blog" className="bg-white py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Benefits
          </p>
          <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
            Why fast-growing stores switch to us
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Replace spreadsheets, manual inbox triage, and scattered order
            lookups with a single AI-powered workspace built for ecommerce.
          </p>
          <div className="mt-10 rounded-3xl border border-slate-100 bg-slate-50 p-8 shadow-lg shadow-slate-200/50">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-2xl">
                🤖
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Dashboard
                </p>
                <p className="text-2xl font-black text-slate-900">
                  Support intelligence
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: 'Tickets triaged', value: '2,483 / wk' },
                { label: 'Avg handle time', value: '4m 12s' },
                { label: 'Revenue saved', value: '$18.7k / mo' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/40 bg-white/80 px-4 py-5 text-center shadow-sm"
                >
                  <div className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-xl font-black text-slate-900">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-3xl border border-slate-100 bg-white px-8 py-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-slate-200"
            >
              <h3 className="text-xl font-semibold text-slate-900">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                {benefit.description}
              </p>
            </div>
          ))}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Trusted by customer-obsessed brands
            </p>
            <p className="mt-4 text-2xl font-black text-slate-900">
              “We resolve 3x more tickets per agent and finally have confidence
              that every refund and exchange is handled the right way.”
            </p>
            <div className="mt-6 text-sm font-semibold text-slate-600">
              <p>Priya Bose</p>
              <p>Head of CX, Luma Living · 68% faster responses</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
