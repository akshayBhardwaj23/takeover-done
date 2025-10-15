'use client';
import { trpc } from '../lib/trpc';
import Link from 'next/link';

export default function HomePage() {
  const health = trpc.health.useQuery();
  const ordersCount = trpc.ordersCount.useQuery();

  return (
    <main className="relative min-h-[100dvh] bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-fuchsia-400/20 to-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-400/20 to-emerald-400/20 blur-3xl" />
      </div>

      {/* Hero section */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-10 sm:pt-24">
        <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70 ring-1 ring-black/10">
          New • AI‑powered support for Shopify
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
          Resolve support faster with
          <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
            {' '}
            actionable AI
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          Unified inbox + Shopify context. Draft replies, suggest
          refunds/cancels/replacements, and log every decision with one click.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/integrations"
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Connect your store
          </Link>
          <Link
            href="/inbox"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Explore Inbox
          </Link>
        </div>

        {/* Live status pill */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-black/10">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> API health:{' '}
            {health.data?.status ?? 'loading...'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-black/10">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Orders in
            DB: {ordersCount.data?.count ?? 'loading...'}
          </span>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Unified Inbox',
              desc: 'Emails + orders side‑by‑side so you never tab‑switch again.',
              color: 'from-indigo-500 to-violet-500',
            },
            {
              title: 'AI Replies',
              desc: 'On‑brand drafts with order context embedded automatically.',
              color: 'from-fuchsia-500 to-pink-500',
            },
            {
              title: 'Smart Actions',
              desc: 'Refund, cancel, replace, address change — with approvals.',
              color: 'from-emerald-500 to-cyan-500',
            },
            {
              title: 'Audit Trail',
              desc: 'Every suggestion, approval, and action is fully logged.',
              color: 'from-amber-500 to-orange-500',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
            >
              <div
                className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${f.color} opacity-20 blur-2xl`}
              />
              <h3 className="text-base font-semibold text-gray-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          How it works
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Connect integrations',
              desc: 'Shopify + Gmail in a minute; secure OAuth, no passwords.',
            },
            {
              step: '2',
              title: 'AI suggests + acts',
              desc: 'Draft replies with proposed actions (refund, cancel, replace).',
            },
            {
              step: '3',
              title: 'Approve + ship',
              desc: 'Human‑in‑the‑loop approvals with full logs and rollbacks.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                {s.step}
              </div>
              <h3 className="mt-3 text-base font-semibold text-gray-900">
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/integrations"
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-fuchsia-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600"
          >
            Get started — connect Shopify
          </Link>
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
    </main>
  );
}
