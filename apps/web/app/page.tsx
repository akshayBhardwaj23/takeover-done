'use client';
import { trpc } from '../lib/trpc';
import Link from 'next/link';

export default function HomePage() {
  const health = trpc.health.useQuery();
  const ordersCount = trpc.ordersCount.useQuery({
    shop: 'dev-ai-ecom.myshopify.com',
  });

  return (
    <main className="relative min-h-[100dvh] bg-white">
      {/* Hero */}
      <section className="relative border-b">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 sm:grid-cols-2 sm:py-20">
          <div>
            <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70 ring-1 ring-black/10">
              New • AI‑powered support for Shopify
            </span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl">
              Take the guesswork out of e‑commerce support
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-600">
              Our unified inbox brings Shopify orders and Gmail into one place.
              Let AI draft the perfect response and safely execute refunds,
              cancels, and replacements with approvals.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/integrations"
                className="inline-flex items-center justify-center rounded-md bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Get started for free
              </Link>
              <Link
                href="/inbox"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Watch demo
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 ring-1 ring-black/10">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> API
                health: {health.data?.status ?? 'loading...'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 ring-1 ring-black/10">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> Orders
                synced: {ordersCount.data?.count ?? 'loading...'}
              </span>
            </div>
          </div>
          <div className="relative">
            {/* Mock UI composition inspired by reference visuals */}
            <div className="relative mx-auto w-full max-w-md rounded-3xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-2 w-16 rounded-full bg-gray-200" />
                <div className="h-2 w-24 rounded-full bg-gray-200" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-20 rounded-xl bg-gradient-to-r from-indigo-200 to-indigo-300" />
                <div className="h-20 rounded-xl bg-gradient-to-r from-pink-200 to-pink-300" />
                <div className="h-20 rounded-xl bg-gradient-to-r from-emerald-200 to-emerald-300" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-2/3 rounded bg-gray-200" />
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-48 rounded-2xl border bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="text-xs font-semibold">Summary</div>
              <p className="mt-1 text-xs text-gray-600">
                AI spotted coupon confusion and suggested an approved partial
                refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Builder / checklist section */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
              Build the perfect support workflow in minutes
            </h2>
            <p className="mt-3 max-w-lg text-gray-600">
              Mix and match blocks to automate repetitive work while keeping
              humans in control. Add approvals, branching, and safeguards.
            </p>
            <ul className="mt-6 space-y-3 text-gray-800">
              {[
                'Draft on‑brand replies with order context',
                'Approve refunds, cancels, and replacements',
                'Detect intent and sentiment automatically',
                'Log every decision for audit and analytics',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-5 w-5 rounded-full bg-emerald-500 text-white">
                    <span className="flex h-full w-full items-center justify-center text-xs">
                      ✓
                    </span>
                  </span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-6 ring-1 ring-indigo-100">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-gray-200" />
                <div className="h-3 w-12 rounded bg-gray-200" />
              </div>
              <div className="space-y-3">
                {[
                  'Detect intent',
                  'Draft reply',
                  'Propose refund',
                  'Await approval',
                ].map((row) => (
                  <div
                    key={row}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="h-3 w-32 rounded bg-gray-200" />
                    <div className="h-6 w-16 rounded-md bg-black/90" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-200">
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Best‑in‑class integrations
              </h3>
              <p className="mt-2 max-w-md text-gray-600">
                Native connections for Shopify and Gmail. No passwords, secure
                OAuth, and resilient webhooks so your inbox always stays in
                sync.
              </p>
              <ul className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-800 sm:grid-cols-2">
                {[
                  'Sync orders, customers, and payments',
                  'Inline order actions from the inbox',
                  'One‑click OAuth setup',
                  'Reliable webhook delivery',
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-4 w-4 rounded-full bg-black text-white">
                      <span className="flex h-full w-full items-center justify-center text-[10px]">
                        ✓
                      </span>
                    </span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
                <div className="mx-auto h-10 w-10 rounded-full bg-green-500" />
                <div className="mt-3 text-sm font-semibold">Shopify</div>
              </div>
              <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
                <div className="mx-auto h-10 w-10 rounded-full bg-red-500" />
                <div className="mt-3 text-sm font-semibold">Gmail</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Automation accuracy panel inspired by audience section */}
      <section className="border-y bg-emerald-900">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 py-14 sm:grid-cols-2">
          <div className="text-emerald-50">
            <h3 className="text-4xl font-extrabold leading-tight">
              Automate the right actions, every time.
            </h3>
            <p className="mt-3 max-w-md text-emerald-100/90">
              With guardrails and approvals, our AI executes only the actions
              you trust—saving hours while preserving customer happiness.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="space-y-3">
              {[
                'Refund eligibility',
                'Duplicate order detection',
                'Address correction',
                'Coupon misuse',
              ].map((c) => (
                <div
                  key={c}
                  className="flex items-center justify-between rounded-lg bg-white/10 p-3 text-white"
                >
                  <span className="text-sm">{c}</span>
                  <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold">
                    On
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reports section */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h3 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Get detailed reports
        </h3>
        <p className="mt-2 max-w-2xl text-gray-600">
          Find the insights you need to improve operations: response times,
          automation rates, saved minutes, and customer satisfaction.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { label: 'Avg time saved per email', value: '≥ 60%' },
            { label: 'AI action accuracy', value: '≥ 85%' },
            { label: 'Manual approval rate', value: '≤ 30%' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <div className="text-2xl font-extrabold text-gray-900">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[
            {
              quote:
                'We switched to this tool for an on‑brand, reliable workflow and it paid off immediately.',
              author: 'Sr UX Researcher at DTC Brand',
            },
            {
              quote:
                'Simple, flexible, and perfect for everyday support tasks. Approvals give us confidence.',
              author: 'Support Lead at Marketplace',
            },
          ].map((t) => (
            <div
              key={t.author}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <p className="text-gray-900">“{t.quote}”</p>
              <div className="mt-4 text-sm text-gray-600">{t.author}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h3 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Pricing
        </h3>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">Start</div>
            <div className="mt-2 text-3xl font-extrabold">Free</div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>Up to 3 workflows</li>
              <li>250 emails / mo</li>
              <li>AI replies and approvals</li>
            </ul>
            <Link
              href="/integrations"
              className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </div>
          {/* Team */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm ring-2 ring-black">
            <div className="text-lg font-semibold">Team</div>
            <div className="mt-2 text-3xl font-extrabold">$175 / mo</div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>Unlimited workflows</li>
              <li>Unlimited responses (with your audience)</li>
              <li>Add up to 5 teammates</li>
              <li>Project folders and permissions</li>
            </ul>
            <Link
              href="/integrations"
              className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
          </div>
          {/* Enterprise */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">Enterprise</div>
            <div className="mt-2 text-3xl font-extrabold">Talk to us</div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>Custom branding</li>
              <li>Unlimited users</li>
              <li>Custom enhancements</li>
              <li>SSO and dedicated support</li>
            </ul>
            <Link
              href="/integrations"
              className="mt-6 inline-block rounded-md border px-4 py-2 text-sm font-semibold"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h4 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Great decisions start with your users
            </h4>
            <Link
              href="/integrations"
              className="rounded-md bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              Get started for free
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
