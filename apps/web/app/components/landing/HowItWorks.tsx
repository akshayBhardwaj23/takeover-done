'use client';

import Link from 'next/link';

export default function HowItWorks() {
  const supportEvents = [
    { id: 'Order #48219', time: '2m ago', intent: 'Refund approved' },
    { id: 'Order #48102', time: '4m ago', intent: 'Shipping update sent' },
    { id: 'Order #48011', time: '9m ago', intent: 'Exchange initiated' },
    { id: 'Order #48240', time: '14m ago', intent: 'Address corrected' },
    { id: 'Order #47988', time: '18m ago', intent: 'Return instructions sent' },
    { id: 'Order #47972', time: '24m ago', intent: 'Partial refund queued' },
    { id: 'Order #47891', time: '31m ago', intent: 'Backorder ETA shared' },
    { id: 'Order #47860', time: '37m ago', intent: 'Warranty info delivered' },
    { id: 'Order #47744', time: '44m ago', intent: 'Order reshipped' },
    { id: 'Order #47611', time: '55m ago', intent: 'Product recommendation' },
    { id: 'Order #47583', time: '1h ago', intent: 'Subscription paused' },
    { id: 'Order #47492', time: '1h ago', intent: 'Invoice resent' },
  ];

  return (
    <section id="how-it-works" className="bg-slate-50 py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
            How the assistant works end-to-end
          </h2>
          <p className="text-lg text-slate-600 md:text-xl">
            Centralize conversations, Shopify order data, and AI suggestions in
            one place. Keep a human in the loop while automation clears the
            busywork.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: 'Centralize conversations',
                description:
                  'Ingest every support email automatically, detect intent, and prioritize high-impact tickets.',
              },
              {
                title: 'Match every order',
                description:
                  'Surface customer, order, fulfillment, and payment data beside the thread—no extra tabs.',
              },
              {
                title: 'Approve the AI draft',
                description:
                  'Review the AI reply and proposed Shopify action, tweak tone, or add macros before sending.',
              },
              {
                title: 'Measure performance',
                description:
                  'Track response times, automations approved, refunds issued, and customer sentiment trends.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm shadow-slate-200/40 backdrop-blur-sm transition hover:-translate-y-1 hover:border-slate-300"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-black"
            >
              Explore the inbox
            </Link>
            <a
              href="mailto:hello@zyyp.ai"
              className="rounded-full border border-slate-900/10 px-7 py-3 text-sm font-semibold tracking-wide text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-900/20"
            >
              Talk to us
            </a>
          </div>
        </div>
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            <span>Inbox Overview</span>
            <span>AI + Human · In sync</span>
          </div>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Customer email parsed
                </p>
                <p className="text-xs text-slate-500">
                  Intent: Refund request · Confidence 0.92
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                AI draft ready
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Shopify order matched
                </p>
                <p className="text-xs text-slate-500">
                  Order #48219 · Delivered · 2 items
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                Needs approval
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Suggested action
                </p>
                <p className="text-xs text-slate-500">
                  Partial refund · $38.40
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                Ready to send
              </span>
            </div>
          </div>
          <div className="grid gap-3">
            {supportEvents.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <div className="font-semibold text-slate-700">{event.id}</div>
                <div className="text-xs text-slate-500">
                  {event.time}
                  <span className="mx-2 text-slate-400">·</span>
                  {event.intent}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
