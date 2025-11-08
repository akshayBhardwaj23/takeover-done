'use client';

import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../@ai-ecom/api/components/ui/table';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import {
  CalendarDays,
  CreditCard,
  Loader2,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

function formatDate(value?: string | Date | null, fallback = '—') {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AccountPage() {
  const accountQuery = trpc.getAccountDetails.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (accountQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (accountQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <h1 className="text-xl font-semibold text-slate-900">
            Unable to load account
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {accountQuery.error.message ||
              'Make sure you are signed in and try again.'}
          </p>
        </div>
      </div>
    );
  }

  const data = accountQuery.data;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <h1 className="text-xl font-semibold text-slate-900">
            No account found
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Sign in to view your billing details and usage cycle.
          </p>
        </div>
      </div>
    );
  }

  const { subscription, usageSummary, billingCycle, billingHistory } = data;

  const planName = usageSummary?.planName ?? subscription?.planType ?? 'Trial';
  const status = subscription?.status ?? usageSummary?.status ?? 'active';
  const periodStart =
    billingCycle?.start ?? usageSummary?.periodStart ?? null;
  const periodEnd = billingCycle?.end ?? usageSummary?.periodEnd ?? null;
  const nextRenewal = usageSummary?.trial?.isTrial
    ? usageSummary.trial.endsAt
    : billingCycle?.end ?? usageSummary?.periodEnd;

  const heroStats = [
    {
      label: 'Current plan',
      value: planName,
    },
    {
      label: 'Status',
      value: status.replace(/_/g, ' '),
    },
    {
      label: 'Next renewal',
      value: formatDate(nextRenewal),
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12)_0,rgba(15,23,42,0)_55%)]" />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-20">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Account
          </span>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              Stay on top of your billing
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Review plan details, billing history, and usage for your Zyyp
              workspace in one place.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm transition hover:border-white/30"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  {stat.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-14 flex max-w-5xl flex-col gap-6 px-6 pb-24">
        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Subscription</h2>
                <p className="text-sm text-slate-600">
                  Manage your plan and billing cycle.
                </p>
              </div>
            </div>
            <Badge className="border border-slate-200 bg-slate-100 text-slate-600">
              {planName}
            </Badge>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Billing status
              </div>
              <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                {status.replace(/_/g, ' ')}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Zyyp keeps your account active as long as your subscription is{' '}
                {status.replace(/_/g, ' ')}.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Current billing cycle
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-900">
                {formatDate(periodStart)} – {formatDate(periodEnd)}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Billing resets at the end of the cycle. Usage metrics below show
                where you stand.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Payment method
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-900">
                {subscription?.paymentGateway
                  ? subscription.paymentGateway
                  : 'Not configured'}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Update payment details or download invoices from your payment
                provider dashboard.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Need to upgrade or cancel? Visit the usage dashboard to manage
              your plan.
            </div>
            <Button
              asChild
              className="rounded-full bg-slate-900 px-5 py-2 text-white transition hover:bg-black"
            >
              <a href="/usage">Manage plan</a>
            </Button>
          </div>
        </Card>

        {usageSummary && (
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
            <div className="mb-6 flex items-center gap-3 text-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Billing cycle usage</h2>
                <p className="text-sm text-slate-600">
                  Track how close you are to your monthly reply limit.
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Replies sent
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {usageSummary.emailsSent.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  of{' '}
                  {usageSummary.emailLimit === -1
                    ? 'Unlimited'
                    : usageSummary.emailLimit.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Replies remaining
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {usageSummary.emailLimit === -1
                    ? '∞'
                    : usageSummary.emailsRemaining.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {usageSummary.canSendEmail
                    ? 'Plenty of capacity left'
                    : 'Limit reached — upgrade to continue'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Trial status
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  {usageSummary.trial?.isTrial
                    ? usageSummary.trial.expired
                      ? 'Trial ended'
                      : `${usageSummary.trial.daysRemaining ?? 0} days left`
                    : 'Not on trial'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Renew before the trial ends to keep AI replies flowing.
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="mb-6 flex items-center gap-3 text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Billing history</h2>
              <p className="text-sm text-slate-600">
                Recent cycles and usage to help you reconcile invoices.
              </p>
            </div>
          </div>
          {billingHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No billing history yet. Your first cycle will appear here once
              your workspace has usage data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200">
                  <TableHead className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Period
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Replies sent
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Conversations
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    AI drafts
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((record) => (
                  <TableRow
                    key={record.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <TableCell className="text-sm font-medium text-slate-900">
                      {formatDate(record.periodStart)} –{' '}
                      {formatDate(record.periodEnd)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record.emailsSent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record.emailsReceived.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record.aiSuggestions.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </main>
  );
}

