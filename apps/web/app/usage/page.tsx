'use client';
import { trpc } from '../../lib/trpc';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import {
  Mail,
  TrendingUp,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useToast, ToastContainer } from '../../components/Toast';

export default function UsagePage() {
  const toast = useToast();
  // Detect currency (default to INR for Indian users)
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');

  useEffect(() => {
    // Try to detect from browser or user preference
    // You can enhance this with IP geolocation or user settings
    const detectedCurrency = navigator.language.includes('IN') ? 'INR' : 'INR'; // Default to INR
    setCurrency(detectedCurrency);
  }, []);

  const usage = trpc.getUsageSummary.useQuery({ currency });
  const history = trpc.getUsageHistory.useQuery();
  const plans = trpc.getAvailablePlans.useQuery({ currency });
  const createCheckout = trpc.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      // Redirect to Razorpay checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Failed to generate checkout URL');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create checkout session');
    },
  });

  if (usage.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Loading usage data...
        </div>
      </main>
    );
  }

  if (usage.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="space-y-3 rounded-2xl border border-rose-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-base font-semibold text-rose-600">
            Error loading usage data
          </div>
          <div className="text-sm text-slate-600">
            {usage.error.message || 'Unknown error'}
          </div>
          <div className="text-xs text-slate-400">
            Code: {usage.error.data?.code || 'N/A'}
          </div>
        </div>
      </main>
    );
  }

  const data = usage.data;
  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-base font-semibold text-slate-800">
            No usage data available
          </div>
          <div className="text-sm text-slate-500">
            Make sure you&apos;re signed in to view usage and billing details.
          </div>
        </div>
      </main>
    );
  }

  const usagePercentage = data.emailUsagePercentage;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = !data.canSendEmail;
  const trialInfo = data.trial;
  const trialExpired = trialInfo?.expired ?? false;
  const trialDaysRemaining = trialInfo?.daysRemaining ?? null;
  const trialEndsAt = trialInfo?.endsAt ? new Date(trialInfo.endsAt) : null;
  const emailsRemaining = data.emailsRemaining ?? 0;

  // Get next plan recommendation
  const currentPlanIndex = plans.data?.plans.findIndex(
    (p) => p.type === data.planType,
  );
  const nextPlan =
    currentPlanIndex !== undefined && currentPlanIndex >= 0
      ? plans.data?.plans[currentPlanIndex + 1]
      : null;

  const heroStats = [
    {
      label: 'Current plan',
      value: data.planName,
    },
    {
      label: 'Replies remaining',
      value:
        data.emailLimit === -1
          ? 'Unlimited'
          : `${emailsRemaining.toLocaleString()}`,
    },
    {
      label: 'AI drafts this month',
      value: data.aiSuggestions.toLocaleString(),
    },
  ];

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-slate-100 py-24">
        <div className="mx-auto max-w-6xl space-y-10 px-6 pt-10">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <BarChart3 className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Usage &amp; billing</h1>
                <p className="text-sm text-slate-500">
                  Track limits, AI activity, and plan upgrades without leaving your workspace.
                </p>
              </div>
            </div>
            <Badge className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              <Zap className="h-4 w-4" />
              {data.planName}
            </Badge>
          </header>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="space-y-10 p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6">
                {trialInfo?.isTrial && (
                  <Card
                    className={`rounded-3xl border p-5 text-sm shadow-sm ${
                      trialExpired
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            trialExpired
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-base font-semibold text-slate-900">
                            {trialExpired
                              ? 'Free trial ended'
                              : `Free trial: ${trialDaysRemaining ?? 0} day${
                                  trialDaysRemaining === 1 ? '' : 's'
                                } remaining`}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {trialExpired
                              ? 'Upgrade to keep sending AI-backed replies and continue syncing your Shopify orders.'
                              : trialEndsAt
                                ? `Trial ends on ${trialEndsAt.toLocaleDateString()}`
                                : 'Upgrade any time to unlock higher limits for your support inbox.'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="border border-white/60 bg-white text-slate-700">
                          Trial
                        </Badge>
                        <Link href="#available-plans">
                          <Button className="rounded-full bg-slate-900 px-5 py-2 text-white transition hover:bg-black">
                            {trialExpired ? 'Upgrade now' : 'View plans'}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                )}

                {(isNearLimit || isAtLimit) && (
                  <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {isAtLimit
                              ? 'Support limit reached'
                              : 'Approaching your monthly limit'}
                          </h3>
                          <p className="mt-1 text-sm text-amber-900/80">
                            {isAtLimit
                              ? `You've reached your ${data.planName} plan limit of ${data.emailLimit.toLocaleString()} replies this month. Upgrade to keep the assistant responding instantly.`
                              : `You've used ${usagePercentage.toFixed(1)}% of your monthly assisted replies. Upgrade now so every customer still gets a timely response.`}
                          </p>
                          {nextPlan && (
                            <Button
                              className="mt-4 rounded-full bg-amber-500 px-6 py-2 font-semibold text-white transition hover:bg-amber-600"
                              onClick={() => {
                                createCheckout.mutate({
                                  planType: nextPlan.type as
                                    | 'STARTER'
                                    | 'GROWTH'
                                    | 'PRO',
                                  currency,
                                });
                              }}
                              disabled={createCheckout.isPending}
                            >
                              {createCheckout.isPending
                                ? 'Processing...'
                                : `Upgrade to ${nextPlan.name}`}
                              <ArrowUpRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100 blur-2xl" />
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <Badge className="border border-slate-200 bg-slate-100 text-slate-600">
                        Current plan
                      </Badge>
                      {data.status === 'active' && (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {data.planName}
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {usage.data?.formattedPrice || `₹${data.priceINR || 0}`}
                      <span className="ml-2 text-base font-normal text-slate-500">
                        /month
                      </span>
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>AI-assisted replies</span>
                        <span className="font-semibold text-slate-900">
                          {data.emailLimit === -1
                            ? 'Unlimited'
                            : `${data.emailLimit.toLocaleString()}/month`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Replies remaining</span>
                        <span className="font-semibold text-slate-900">
                          {data.emailLimit === -1
                            ? 'Unlimited'
                            : `${emailsRemaining.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Shopify stores</span>
                        <span className="font-semibold text-slate-900">
                          {data.storesLimit === -1
                            ? 'Unlimited'
                            : `${data.storesLimit} store${data.storesLimit > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-100 blur-2xl" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5 text-sky-500" />
                      <h3 className="text-lg font-semibold text-slate-900">
                        Customer conversations
                      </h3>
                    </div>
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                        <span>This billing cycle</span>
                        <span className="font-semibold text-slate-900">
                          {data.emailsSent.toLocaleString()} /{' '}
                          {data.emailLimit === -1
                            ? '∞'
                            : data.emailLimit.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full transition-all ${
                            isAtLimit
                              ? 'bg-gradient-to-r from-rose-500 to-red-500'
                              : isNearLimit
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                          }`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {usagePercentage.toFixed(1)}% of monthly reply capacity used
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <div className="text-slate-500">Replies sent</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {data.emailsSent.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Conversations ingested</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {data.emailsReceived.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-100 blur-2xl" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-semibold text-slate-900">
                        AI activity
                      </h3>
                    </div>
                    <div className="mb-4">
                      <div className="text-3xl font-black text-slate-900">
                        {data.aiSuggestions.toLocaleString()}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Drafted replies this month
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <TrendingUp className="h-3 w-3" />
                      <span>Unlimited AI drafting for every plan</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Support volume history
                    </h3>
                  </div>
                  <Badge className="border border-slate-200 bg-slate-100 text-slate-600">
                    Last 6 months
                  </Badge>
                </div>
                {history.data?.history && history.data.history.length > 0 ? (
                  <div className="space-y-4">
                    {history.data.history.map(
                      (
                        record: {
                          periodStart: string;
                          periodEnd: string;
                          emailsSent: number;
                          emailsReceived: number;
                          aiSuggestions: number;
                        },
                        idx,
                      ) => {
                        const periodStart = new Date(record.periodStart);
                        const periodEnd = new Date(record.periodEnd);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center gap-4">
                              <Calendar className="h-5 w-5 text-slate-500" />
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {periodStart.toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {periodStart.toLocaleDateString()} -{' '}
                                  {periodEnd.toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                              <div>
                                <div className="text-slate-500">Replies sent</div>
                                <div className="font-semibold text-slate-900">
                                  {record.emailsSent.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500">
                                  Conversations ingested
                                </div>
                                <div className="font-semibold text-slate-900">
                                  {record.emailsReceived.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500">
                                  AI drafts created
                                </div>
                                <div className="font-semibold text-slate-900">
                                  {record.aiSuggestions.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    No usage history available yet
                  </div>
                )}
              </Card>

              {plans.data && (
                <Card
                  id="available-plans"
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
                >
                  <h3 className="mb-6 text-lg font-semibold text-slate-900">
                    Plans built for ecommerce support teams
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {plans.data.plans
                      .filter((p) => p.type !== 'ENTERPRISE')
                      .map((plan) => {
                        const isCurrentPlan = plan.type === data.planType;
                        return (
                          <Card
                            key={plan.type}
                            className={`relative overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-1 ${
                              isCurrentPlan
                                ? 'border-slate-900 bg-slate-900 text-white shadow-2xl shadow-slate-900/30'
                                : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                            }`}
                          >
                            {isCurrentPlan && (
                              <Badge className="absolute right-4 top-4 border border-white/40 bg-white/10 text-white">
                                Current
                              </Badge>
                            )}
                            <div className="mb-4">
                              <h4
                                className={`text-xl font-bold ${
                                  isCurrentPlan ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {plan.name}
                              </h4>
                              <div className="mt-2">
                                <span
                                  className={`text-3xl font-black ${
                                    isCurrentPlan ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {plan.formattedPrice ||
                                    (plan.price > 0
                                      ? `${currency === 'INR' ? '₹' : '$'}${plan.price}`
                                      : 'Custom')}
                                </span>
                                {plan.price > 0 && (
                                  <span
                                    className={
                                      isCurrentPlan
                                        ? 'text-white/70'
                                        : 'text-slate-500'
                                    }
                                  >
                                    /month
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`space-y-2 text-sm ${
                                isCurrentPlan ? 'text-white/80' : 'text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Mail
                                  className={`h-4 w-4 ${
                                    isCurrentPlan
                                      ? 'text-white/70'
                                      : 'text-slate-400'
                                  }`}
                                />
                                <span>
                                  {plan.emailsPerMonth === -1
                                    ? 'Unlimited AI-assisted replies'
                                    : `${plan.emailsPerMonth.toLocaleString()} AI-assisted replies/month`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle
                                  className={`h-4 w-4 ${
                                    isCurrentPlan
                                      ? 'text-white/70'
                                      : 'text-slate-400'
                                  }`}
                                />
                                <span>
                                  {plan.stores === -1
                                    ? 'Unlimited stores'
                                    : `${plan.stores} store${plan.stores > 1 ? 's' : ''}`}
                                </span>
                              </div>
                            </div>
                            {!isCurrentPlan && (
                              <Button
                                className="mt-4 w-full rounded-full bg-slate-900 py-2 font-semibold text-white transition hover:bg-black"
                                onClick={() => {
                                  if (plan.price === 0) {
                                    toast.info('Trial activated!');
                                    return;
                                  }
                                  if (plan.type === 'ENTERPRISE') {
                                    toast.info(
                                      'Please contact us for enterprise pricing',
                                    );
                                    return;
                                  }
                                  createCheckout.mutate({
                                    planType: plan.type as
                                      | 'STARTER'
                                      | 'GROWTH'
                                      | 'PRO',
                                    currency,
                                  });
                                }}
                                disabled={
                                  createCheckout.isPending ||
                                  plan.type === 'TRIAL' ||
                                  plan.type === 'ENTERPRISE'
                                }
                              >
                                {createCheckout.isPending
                                  ? 'Processing...'
                                  : plan.price === 0
                                    ? 'Get started'
                                    : 'Upgrade'}
                              </Button>
                            )}
                          </Card>
                        );
                      })}
                  </div>
                </Card>
              )}

              <Card className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Billing period
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Track when your assistant resets usage
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Current cycle</div>
                    <div className="font-semibold text-slate-900">
                      {new Date(data.periodStart).toLocaleDateString()} -{' '}
                      {new Date(data.periodEnd).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
