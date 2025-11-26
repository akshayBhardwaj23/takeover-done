'use client';

import { useState, useEffect, useRef } from 'react';

export default function MailingEngine() {
  const mailingRef = useRef<HTMLDivElement | null>(null);
  const [mailingInView, setMailingInView] = useState(false);

  useEffect(() => {
    if (!mailingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setMailingInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(mailingRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-white py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 lg:flex-row lg:items-stretch">
        <div className="w-full lg:w-[48%]">
          <div
            ref={mailingRef}
            className={`relative h-full transition-all duration-700 ${
              mailingInView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="relative mx-auto w-full rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/10 text-slate-700">
                    ✉️
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      AI draft
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      Follow-up: Order status update
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  94% confidence
                </span>
              </div>
              <div className="space-y-4 px-6 py-5 text-sm text-slate-600">
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner">
                  <p className="font-semibold text-slate-800">Hi Alex,</p>
                  <p>
                    Your order is in the final packing stage and will ship
                    within the next 24 hours. We’ve upgraded you to priority
                    shipping at no cost so it arrives on time.
                  </p>
                  <p>
                    You can track its journey anytime:{' '}
                    <span className="underline">Track order</span>.
                  </p>
                  <p className="text-slate-500">
                    Thanks for your patience — we’ll ping you once it’s out the
                    door.
                  </p>
                  <p>— Team ZYYP Automations</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Smart recommendations
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    <li>
                      • Add 10% discount if order is delayed beyond 3 days.
                    </li>
                    <li>• Follow-up in 48 hours if no response.</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white">
                  Edit Draft
                </button>
                <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800">
                  Approve &amp; Send
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          className={`w-full space-y-6 transition-all duration-700 ${
            mailingInView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          } lg:w-[52%]`}
          style={{ transitionDelay: '120ms' }}
        >
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
            Autonomous Mailing Engine — Never Miss a Customer Again.
          </h2>
          <p className="text-lg text-slate-600">
            ZYYP auto-drafts and sends follow-ups, offers, and updates based on
            customer behavior, tickets, or sales trends — all fully editable by
            you.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: '📬',
                title: 'Automated follow-ups',
                description:
                  'Trigger emails instantly when support tickets stall or orders slip past SLA.',
              },
              {
                icon: '💬',
                title: 'Personalized replies',
                description:
                  'Use customer data, sentiment, and purchase history to tailor every message.',
              },
              {
                icon: '📈',
                title: 'Triggered campaigns',
                description:
                  'Launch win-back offers, restock alerts, and VIP check-ins without lifting a finger.',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/10 text-lg">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {feature.title}
                  </p>
                  <p className="text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
