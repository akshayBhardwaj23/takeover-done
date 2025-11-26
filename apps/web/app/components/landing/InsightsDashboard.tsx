'use client';

import { useState, useEffect, useRef } from 'react';

export default function InsightsDashboard() {
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const [insightsInView, setInsightsInView] = useState(false);

  useEffect(() => {
    if (!insightsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInsightsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(insightsRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={insightsRef}
      className="relative overflow-hidden bg-slate-50 py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12)_0,rgba(241,245,249,0)_60%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
        <div
          className={`w-full space-y-6 transition-all duration-700 ${
            insightsInView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          } lg:w-[38%]`}
        >
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
            Smarter Insights. Happier Customers. Higher Revenue.
          </h2>
          <p className="text-lg text-slate-600">
            ZYYP continually reviews every interaction to surface the trends and
            risks that matter. Spot churn signals, act on sentiment, and
            quantify the revenue impact of every automation.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: '💡',
                title: 'Revenue at risk this week',
                data: '$1,240 due to delayed responses.',
              },
              {
                icon: '🧠',
                title: 'Top 3 refund drivers',
                data: 'Damaged packaging, late deliveries, sizing issues.',
              },
              {
                icon: '📬',
                title: 'Customer sentiment score',
                data: '92% positive this week across all channels.',
              },
            ].map((card, index) => (
              <div
                key={card.title}
                className={`flex items-start gap-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition-all duration-700 ${
                  insightsInView
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                } hover:-translate-y-2 hover:shadow-2xl`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {card.title}
                  </p>
                  <p className="text-sm text-slate-600">{card.data}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className={`relative w-full transition-all duration-700 ${
            insightsInView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          } lg:w-[62%]`}
          style={{ transitionDelay: '160ms' }}
        >
          <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-[36px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08)_0,rgba(255,255,255,0)_55%)]" />
            <div className="relative flex h-full flex-col gap-6 p-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Order volume
                    </p>
                    <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-700">
                      +18% WoW
                    </span>
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    $182k
                  </h3>
                  <p className="text-sm text-slate-500">
                    Processed in the last 7 days
                  </p>
                  <div className="mt-6 flex items-end gap-1">
                    {[28, 40, 36, 48, 56, 62, 70].map((height, idx) => (
                      <span
                        key={idx}
                        className="flex-1 rounded-full bg-slate-900/15 transition-transform duration-500 hover:bg-slate-900/25"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Sentiment trend
                    </p>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      stable
                    </span>
                  </div>
                  <div className="mt-4 h-32">
                    <svg
                      viewBox="0 0 200 120"
                      className="h-full w-full text-emerald-500"
                    >
                      <path
                        d="M5 90 C40 60, 80 110, 120 70 C150 40, 180 60, 195 35"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="195"
                        cy="35"
                        r="5"
                        className="fill-emerald-500"
                      />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    Peak positivity Thursday 3 pm after automated follow-ups.
                  </p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Auto-mail performance
                    </p>
                    <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-700">
                      96% delivered
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        opened
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        74%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        clicked
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        31%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        replies
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        12%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        revenue influenced
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        $8.4k
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Order health
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3">
                      <span>On-time</span>
                      <span className="font-semibold text-slate-900">87%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-amber-100/80 px-4 py-3">
                      <span>Escalated</span>
                      <span className="font-semibold text-amber-700">9%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-rose-100/80 px-4 py-3">
                      <span>At risk</span>
                      <span className="font-semibold text-rose-700">4%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
