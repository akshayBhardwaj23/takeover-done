'use client';
import { trpc } from '../../lib/trpc';
import { useEffect, useState } from 'react';
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-white">Loading usage data...</div>
      </div>
    );
  }

  if (usage.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-lg font-semibold">Error loading usage data</div>
          <div className="text-slate-400 text-sm">{usage.error.message || 'Unknown error'}</div>
          <div className="text-slate-500 text-xs">Code: {usage.error.data?.code || 'N/A'}</div>
        </div>
      </div>
    );
  }

  const data = usage.data;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center space-y-4">
          <div className="text-white">No usage data available</div>
          <div className="text-slate-400 text-sm">Make sure you're signed in</div>
        </div>
      </div>
    );
  }

  const usagePercentage = data.emailUsagePercentage;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = !data.canSendEmail;

  // Get next plan recommendation
  const currentPlanIndex = plans.data?.plans.findIndex(
    (p) => p.type === data.planType,
  );
  const nextPlan =
    currentPlanIndex !== undefined && currentPlanIndex >= 0
      ? plans.data?.plans[currentPlanIndex + 1]
      : null;

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white">Usage & Billing</h1>
            <p className="mt-2 text-slate-400">
              Monitor your email usage and manage your subscription
            </p>
          </div>

          {/* Upgrade Banner (if near/at limit) */}
          {(isNearLimit || isAtLimit) && (
            <Card className="mb-6 border-amber-500/30 bg-gradient-to-r from-amber-600/20 to-orange-600/20 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-amber-500/20 p-3">
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">
                      {isAtLimit
                        ? 'Email Limit Reached'
                        : 'Approaching Email Limit'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {isAtLimit
                        ? `You've reached your ${data.planName} plan limit of ${data.emailLimit.toLocaleString()} emails this month. Upgrade to continue sending emails.`
                        : `You've used ${usagePercentage.toFixed(1)}% of your monthly email limit. Consider upgrading to avoid interruption.`}
                    </p>
                    {nextPlan && (
                      <Button
                        className="mt-4 bg-gradient-to-r from-amber-600 to-orange-600 font-semibold text-white hover:from-amber-700 hover:to-orange-700"
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

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Current Plan Card */}
            <Card className="relative overflow-hidden border-slate-800/50 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-blue-600/20 p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    Current Plan
                  </Badge>
                  {data.status === 'active' && (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">
                  {data.planName}
                </h2>
                <p className="mt-2 text-3xl font-bold text-white">
                  {usage.data?.formattedPrice || `₹${data.priceINR || 0}`}
                  <span className="text-base font-normal text-slate-400">
                    /month
                  </span>
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Email Limit:</span>
                    <span className="font-semibold text-white">
                      {data.emailLimit === -1
                        ? 'Unlimited'
                        : `${data.emailLimit.toLocaleString()}/month`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Stores Limit:</span>
                    <span className="font-semibold text-white">
                      {data.storesLimit === -1
                        ? 'Unlimited'
                        : `${data.storesLimit} stores`}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Email Usage Card */}
            <Card className="relative overflow-hidden border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Email Usage</h3>
                </div>
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">This Period</span>
                    <span className="font-semibold text-white">
                      {data.emailsSent.toLocaleString()} /{' '}
                      {data.emailLimit === -1
                        ? '∞'
                        : data.emailLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all ${
                        isAtLimit
                          ? 'bg-gradient-to-r from-red-600 to-rose-600'
                          : isNearLimit
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      }`}
                      style={{
                        width: `${Math.min(usagePercentage, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {usagePercentage.toFixed(1)}% used
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Sent</div>
                    <div className="text-lg font-bold text-white">
                      {data.emailsSent.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Received</div>
                    <div className="text-lg font-bold text-white">
                      {data.emailsReceived.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI Suggestions Card */}
            <Card className="relative overflow-hidden border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">AI Activity</h3>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-black text-white">
                    {data.aiSuggestions.toLocaleString()}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Suggestions generated
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>Unlimited AI suggestions</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Usage History */}
          <Card className="mt-6 border-slate-800/50 bg-slate-900/30 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Usage History</h3>
              </div>
              <Badge className="bg-slate-800/50 text-slate-300">
                Last 6 months
              </Badge>
            </div>
            {history.data?.history && history.data.history.length > 0 ? (
              <div className="space-y-4">
                {history.data.history.map((record, idx) => {
                  const periodStart = new Date(record.periodStart);
                  const periodEnd = new Date(record.periodEnd);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-800/30 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <div>
                          <div className="font-semibold text-white">
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
                      <div className="flex gap-6 text-sm">
                        <div>
                          <div className="text-slate-400">Sent</div>
                          <div className="font-semibold text-white">
                            {record.emailsSent.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Received</div>
                          <div className="font-semibold text-white">
                            {record.emailsReceived.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">AI Suggestions</div>
                          <div className="font-semibold text-white">
                            {record.aiSuggestions.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                No usage history available yet
              </div>
            )}
          </Card>

          {/* Available Plans */}
          {plans.data && (
            <Card className="mt-6 border-slate-800/50 bg-slate-900/30 p-6">
              <h3 className="mb-6 text-lg font-bold text-white">
                Available Plans
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {plans.data.plans
                  .filter((p) => p.type !== 'ENTERPRISE') // Hide enterprise for now
                  .map((plan) => {
                    const isCurrentPlan = plan.type === data.planType;
                    return (
                      <Card
                        key={plan.type}
                        className={`relative overflow-hidden border p-6 transition-all ${
                          isCurrentPlan
                            ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-600/20 to-purple-600/20'
                            : 'border-slate-800/50 bg-slate-800/30 hover:border-indigo-500/30'
                        }`}
                      >
                        {isCurrentPlan && (
                          <Badge className="absolute right-4 top-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                            Current
                          </Badge>
                        )}
                        <div className="mb-4">
                          <h4 className="text-xl font-bold text-white">
                            {plan.name}
                          </h4>
                          <div className="mt-2">
                            <span className="text-3xl font-black text-white">
                              {plan.formattedPrice ||
                                (plan.price > 0
                                  ? `${currency === 'INR' ? '₹' : '$'}${plan.price}`
                                  : 'Custom')}
                            </span>
                            {plan.price > 0 && (
                              <span className="text-slate-400">/month</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>
                              {plan.emailsPerMonth === -1
                                ? 'Unlimited emails'
                                : `${plan.emailsPerMonth.toLocaleString()} emails/month`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>
                              {plan.stores === -1
                                ? 'Unlimited stores'
                                : `${plan.stores} store${plan.stores > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </div>
                        {!isCurrentPlan && (
                          <Button
                            className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white hover:from-indigo-700 hover:to-purple-700"
                            onClick={() => {
                              if (plan.price === 0) {
                                // Free trial - just activate
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
                                ? 'Get Started'
                                : 'Upgrade'}
                          </Button>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </Card>
          )}

          {/* Billing Period Info */}
          <Card className="mt-6 border-slate-800/50 bg-slate-900/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Billing Period</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Current billing cycle
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Period</div>
                <div className="font-semibold text-white">
                  {new Date(data.periodStart).toLocaleDateString()} -{' '}
                  {new Date(data.periodEnd).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
