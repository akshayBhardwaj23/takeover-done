'use client';
import { Card } from '../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../@ai-ecom/api/components/ui/badge';
import { Button } from '../../../@ai-ecom/api/components/ui/button';
import { AlertCircle, ArrowUpRight, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '../lib/trpc';

interface UpgradePromptProps {
  usagePercentage: number;
  currentUsage: number;
  limit: number;
  planName: string;
  nextPlanName?: string;
  onDismiss?: () => void;
  variant?: 'banner' | 'modal' | 'inline';
}

export function UpgradePrompt({
  usagePercentage,
  currentUsage,
  limit,
  planName,
  nextPlanName = 'Growth',
  onDismiss,
  variant = 'banner',
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const createCheckout = trpc.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  // Determine plan type from name
  const getPlanType = (name: string): 'STARTER' | 'GROWTH' | 'PRO' => {
    if (name.toLowerCase().includes('starter')) return 'STARTER';
    if (name.toLowerCase().includes('growth')) return 'GROWTH';
    if (name.toLowerCase().includes('pro')) return 'PRO';
    return 'GROWTH'; // default
  };

  const handleUpgrade = () => {
    const planType = getPlanType(nextPlanName);
    createCheckout.mutate({ planType });
  };

  if (dismissed) return null;

  const isAtLimit = usagePercentage >= 100;
  const isNearLimit = usagePercentage >= 80;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (variant === 'banner') {
    return (
      <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-r from-amber-600/20 to-orange-600/20 p-4">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500/20 p-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h4 className="font-semibold text-white">
                  {isAtLimit
                    ? 'Email Limit Reached'
                    : 'Approaching Email Limit'}
                </h4>
                <Badge
                  className={`${
                    isAtLimit
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {usagePercentage.toFixed(0)}% used
                </Badge>
              </div>
              <p className="text-sm text-slate-300">
                {isAtLimit
                  ? `You've reached your ${planName} plan limit of ${limit.toLocaleString()} emails. Upgrade to continue sending.`
                  : `You've used ${currentUsage.toLocaleString()} of ${limit.toLocaleString()} emails this month. Consider upgrading to avoid interruption.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-amber-600 to-orange-600 font-semibold text-white hover:from-amber-700 hover:to-orange-700"
              onClick={handleUpgrade}
              disabled={createCheckout.isPending}
            >
              {createCheckout.isPending
                ? 'Processing...'
                : `Upgrade to ${nextPlanName}`}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            <button
              onClick={handleDismiss}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md border-amber-500/30 bg-gradient-to-br from-amber-600/20 to-orange-600/20 p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/20 p-2">
                <AlertCircle className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isAtLimit ? 'Email Limit Reached' : 'Upgrade Recommended'}
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  {isAtLimit
                    ? `You've reached your ${planName} plan limit of ${limit.toLocaleString()} emails this month. Upgrade to continue sending emails.`
                    : `You've used ${usagePercentage.toFixed(0)}% of your monthly email limit. Upgrade now to avoid interruption.`}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-900/50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Current Usage</span>
                <span className="font-semibold text-white">
                  {currentUsage.toLocaleString()} / {limit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${
                    isAtLimit
                      ? 'bg-gradient-to-r from-red-600 to-rose-600'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 font-semibold text-white hover:from-amber-700 hover:to-orange-700"
                onClick={handleUpgrade}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? 'Processing...' : 'Upgrade Now'}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
              <Link href="/usage" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800"
                >
                  View Plans
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800"
                onClick={handleDismiss}
              >
                Later
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // inline variant
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-600/10 p-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <p className="text-sm text-amber-200">
          {isAtLimit
            ? `Email limit reached (${currentUsage}/${limit}). `
            : `Approaching limit (${usagePercentage.toFixed(0)}% used). `}
          <button
            onClick={handleUpgrade}
            className="font-semibold underline hover:text-amber-100"
            disabled={createCheckout.isPending}
          >
            {createCheckout.isPending
              ? 'Processing...'
              : `Upgrade to ${nextPlanName}`}
          </button>
        </p>
      </div>
    </div>
  );
}
