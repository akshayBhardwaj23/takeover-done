'use client';

import Link from 'next/link';

export default function CTA() {
  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 py-20 text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 text-center">
        <h2 className="text-3xl font-black md:text-4xl">
          Deliver five-star support without adding headcount
        </h2>
        <p className="max-w-3xl text-lg text-white/70">
          Connect Shopify, sync your inbox, and let ZYYP handle the repetitive
          work. Your team approves, personalizes, and delivers delight.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/integrations"
            className="rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Launch your inbox
          </Link>
          <a
            href="/demo"
            className="rounded-full border border-white/30 px-10 py-3 text-sm font-semibold text-white transition hover:border-white"
          >
            Live Demo
          </a>
        </div>
      </div>
    </section>
  );
}
