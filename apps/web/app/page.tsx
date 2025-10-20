'use client';
import { trpc } from '../lib/trpc';
import Link from 'next/link';
import { useState } from 'react';
import Aurora from './components/Aurora';
import GlowOrb from './components/GlowOrb';
import GradientText from './components/GradientText';
import Reveal from './components/Reveal';
import Magnetic from './components/Magnetic';
import TiltCard from './components/TiltCard';
import Parallax from './components/Parallax';

export default function HomePage() {
  const connections = trpc.connections.useQuery();
  const [annual, setAnnual] = useState(false);

  return (
    <main className="relative min-h-[100dvh]">
      {/* Hero */}
      <section className="relative border-b border-white/10">
        <Aurora />
        <GlowOrb className="-left-6 top-10" />
        <GlowOrb className="right-10 top-40" />
        <div className="container-max grid grid-cols-1 items-center gap-10 py-16 sm:grid-cols-2 sm:py-20">
          <div>
            <span className="chip">New • AI‑powered support for Shopify</span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Take the guesswork out of e‑commerce{' '}
              <GradientText>support</GradientText>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/70">
              Our unified inbox brings Shopify orders and Gmail into one place.
              Let AI draft the perfect response and safely execute refunds,
              cancels, and replacements with approvals.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  href="/integrations"
                  className="btn-primary group relative overflow-hidden"
                >
                  <span className="relative z-10">Get started for free</span>
                  <span className="pointer-events-none absolute inset-0 bg-gradient-shine opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/inbox" className="btn-ghost">
                  Watch demo
                </Link>
              </Magnetic>
            </div>
          </div>
          <div className="relative">
            {/* Mock UI composition inspired by reference visuals */}
            <Reveal>
              <TiltCard>
                <div className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm ring-1 ring-white/10">
                  <div className="mb-3 flex items-center justify-between text-white/40">
                    <div className="h-2 w-16 rounded-full bg-white/10" />
                    <div className="h-2 w-24 rounded-full bg-white/10" />
                  </div>
                  <Parallax>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-20 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
                      <div className="h-20 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500" />
                      <div className="h-20 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500" />
                    </div>
                  </Parallax>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/10" />
                    <div className="h-3 w-2/3 rounded bg-white/10" />
                  </div>
                </div>
              </TiltCard>
            </Reveal>
            <div className="absolute -right-6 -bottom-6 w-48 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm ring-1 ring-white/10">
              <div className="text-xs font-semibold text-white/90">Summary</div>
              <p className="mt-1 text-xs text-white/70">
                AI spotted coupon confusion and suggested an approved partial
                refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Builder / checklist section */}
      <section className="container-max py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">
              Build the perfect support workflow in minutes
            </h2>
            <p className="mt-3 max-w-lg text-white/70">
              Mix and match blocks to automate repetitive work while keeping
              humans in control. Add approvals, branching, and safeguards.
            </p>
            <ul className="mt-6 space-y-3 text-white/90">
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
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="rounded-xl bg-white/5 p-4 shadow-sm ring-1 ring-white/10">
              <div className="mb-4 flex items-center justify-between text-white/40">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-3 w-12 rounded bg-white/10" />
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
                    className="flex items-center justify-between rounded-lg border border-white/10 p-3"
                  >
                    <div className="h-3 w-32 rounded bg-white/10" />
                    <div className="h-6 w-16 rounded-md bg-white/80" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="container-max py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-bold">Best‑in‑class integrations</h3>
            <span className="chip">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {connections.data?.connections?.length ?? 0} connected store(s)
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 items-start gap-8 sm:grid-cols-2">
            <div>
              <p className="max-w-md text-white/70">
                Native connections for Shopify and Gmail. No passwords, secure
                OAuth, and resilient webhooks so your inbox always stays in
                sync.
              </p>
              <ul className="mt-4 space-y-3 text-white/90">
                {[
                  'Sync orders, customers, and payments',
                  'Inline order actions from the inbox',
                  'One‑click OAuth setup',
                  'Reliable webhook delivery',
                ].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-5 w-5 rounded-full bg-white text-black">
                      <span className="flex h-full w-full items-center justify-center text-xs">
                        ✓
                      </span>
                    </span>
                    <span className="text-sm sm:text-base">{i}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/integrations" className="btn-primary">
                  Connect your store
                </Link>
                <Link href="/inbox" className="btn-ghost">
                  See it in action
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Shopify card */}
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-green-500" />
                  <div className="text-sm font-semibold">Shopify</div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-32 rounded bg-white/10" />
                  <div className="h-2 w-24 rounded bg-white/10" />
                </div>
                <Link
                  href="/integrations"
                  className="mt-4 inline-block w-full rounded-md bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white"
                >
                  Connect
                </Link>
              </div>
              {/* Gmail card */}
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-red-500" />
                  <div className="text-sm font-semibold">Gmail</div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-32 rounded bg-white/10" />
                  <div className="h-2 w-24 rounded bg-white/10" />
                </div>
                <Link
                  href="/integrations"
                  className="mt-4 inline-block w-full rounded-md bg-red-600 px-3 py-2 text-center text-xs font-semibold text-white"
                >
                  Authorize
                </Link>
              </div>

              {/* Steps mock card */}
              <div className="col-span-2 card p-5">
                <div className="mb-3 text-sm font-semibold">
                  Connect in 3 steps
                </div>
                <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { n: '1', t: 'Install Shopify app' },
                    { n: '2', t: 'Approve Gmail access' },
                    { n: '3', t: 'Start replying with AI' },
                  ].map((s) => (
                    <li
                      key={s.n}
                      className="flex items-center gap-3 rounded-lg border border-white/10 p-3"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
                        {s.n}
                      </span>
                      <span className="text-sm">{s.t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Automation accuracy panel inspired by audience section */}
      <section className="border-y border-white/10 bg-gradient-to-b from-emerald-900 to-black">
        <div className="container-max grid grid-cols-1 items-center gap-8 py-14 sm:grid-cols-2">
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
      <section className="container-max py-16">
        <h3 className="text-4xl font-extrabold tracking-tight text-gray-900">
          <span className="text-white">Get detailed reports</span>
        </h3>
        <p className="mt-2 max-w-2xl text-white/70">
          Find the insights you need to improve operations: response times,
          automation rates, saved minutes, and customer satisfaction.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Left: report UI mock with video overlay */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm ring-1 ring-white/10">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-3 w-12 rounded bg-white/10" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/10 p-3">
                <div className="h-2 w-20 rounded bg-white/10" />
                <div className="mt-2 h-16 rounded bg-indigo-500/30" />
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <div className="h-2 w-16 rounded bg-white/10" />
                <div className="mt-2 h-16 rounded bg-pink-500/30" />
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <div className="h-2 w-14 rounded bg-white/10" />
                <div className="mt-2 h-16 rounded bg-emerald-500/30" />
              </div>
            </div>
            <div className="absolute right-6 -bottom-8 w-64 rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white/90">
                  Show transcription
                </span>
                <span className="h-2 w-16 rounded bg-white/10" />
              </div>
              <div className="mt-2 h-24 rounded-md bg-white/10" />
            </div>
          </div>

          {/* Right: metrics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { label: 'Avg time saved per email', value: '≥ 60%' },
              { label: 'AI action accuracy', value: '≥ 85%' },
              { label: 'Manual approval rate', value: '≤ 30%' },
              { label: 'Median reply time', value: '31.6 s' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/5 p-6 shadow-sm ring-1 ring-white/10"
              >
                <div className="text-2xl font-extrabold">{stat.value}</div>
                <div className="mt-1 text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              quote:
                'We spent a while searching for a tool that was easy to use and reliable. This was the best choice.',
              author: 'Sr UX Researcher, Global Music Platform',
            },
            {
              quote:
                'Simple, flexible, and perfect for everyday support tasks. Approvals give us confidence.',
              author: 'Support Lead, Marketplace',
            },
            {
              quote:
                'Best-in-class Gmail + Shopify integration. Our response times dropped immediately.',
              author: 'Head of CX, DTC Brand',
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
      <section id="pricing" className="container-max py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-4xl font-extrabold tracking-tight">Pricing</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">Annual discount</span>
            <button
              type="button"
              aria-pressed={annual}
              onClick={() => setAnnual((v) => !v)}
              className={`${annual ? 'bg-white/80' : 'bg-white/10'} relative h-6 w-11 rounded-full transition-colors`}
            >
              <span
                className={`${annual ? 'translate-x-5' : 'translate-x-1'} inline-block h-4 w-4 translate-y-1 rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
            <div className="text-lg font-semibold">Start</div>
            <div className="mt-2 text-3xl font-extrabold">Free</div>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Up to 3 workflows</li>
              <li>250 emails / mo</li>
              <li>AI replies and approvals</li>
            </ul>
            <Link
              href="/integrations"
              className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Get started
            </Link>
          </div>
          {/* Team */}
          <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-sm ring-2 ring-white/20">
            <div className="text-lg font-semibold">Team</div>
            <div className="mt-2 text-3xl font-extrabold">
              {annual ? '$150 / mo' : '$175 / mo'}
            </div>
            {annual && (
              <div className="mt-1 text-xs text-white/70">Billed annually</div>
            )}
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Unlimited workflows</li>
              <li>Unlimited responses (with your audience)</li>
              <li>Add up to 5 teammates</li>
              <li>Project folders and permissions</li>
            </ul>
            <Link
              href="/integrations"
              className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Start free trial
            </Link>
          </div>
          {/* Enterprise */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
            <div className="text-lg font-semibold">Enterprise</div>
            <div className="mt-2 text-3xl font-extrabold">Talk to us</div>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Custom branding</li>
              <li>Unlimited users</li>
              <li>Custom enhancements</li>
              <li>SSO and dedicated support</li>
            </ul>
            <Link
              href="/integrations"
              className="mt-6 inline-block rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10">
        <div className="container-max py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h4 className="text-2xl font-extrabold tracking-tight">
              Great decisions start with your users
            </h4>
            <Link href="/integrations" className="btn-primary">
              Get started for free
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
