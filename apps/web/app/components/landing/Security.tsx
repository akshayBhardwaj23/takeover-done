'use client';

import Link from 'next/link';
import type { Route } from 'next';

export default function Security() {
  return (
    <section className="bg-slate-900 py-20 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">
            For security first teams
          </p>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">
            Keep customer data secure and compliant
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Protect customer PII, payment details, and support history with
            enterprise-grade encryption, fine-grained roles, and audit trails.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            <span className="rounded-full border border-white/20 px-4 py-2">
              CCPA
            </span>
            <span className="rounded-full border border-white/20 px-4 py-2">
              GDPR
            </span>
            <span className="rounded-full border border-white/20 px-4 py-2">
              ISO
            </span>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">
              Zero data retention sandbox
            </h3>
            <p className="mt-3 text-sm text-white/70">
              Keep sensitive conversations inside your boundary with regional
              isolation, private deployments, and custom data retention
              policies.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">Granular governance</h3>
            <p className="mt-3 text-sm text-white/70">
              Attribute every action to a teammate or AI, monitor approvals,
              export audit logs, and integrate with your compliance workflows.
            </p>
          </div>
          <Link
            href={"/security" as Route}
            className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            View security overview
          </Link>
        </div>
      </div>
    </section>
  );
}
