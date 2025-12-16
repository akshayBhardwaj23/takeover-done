'use client';

import { Suspense, useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Users,
  ArrowRight,
  BarChart3,
  Zap,
  ShoppingCart,
  Globe,
  Clock,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PauseCircle,
  Play,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';
import { useToast, ToastContainer } from '../../components/Toast';


function MetaAdsInner() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const toast = useToast();

  // Fetch connections
  const connections = trpc.connections.useQuery();

  // Fetch accounts
  const accounts = trpc.getMetaAdsAccounts.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Get Meta Ads connections
  const metaAdsConnections =
    connections.data?.connections.filter((c: any) => c.type === 'META_ADS') ||
    [];

  // Auto-select account: first from metadata, then first from API
  useEffect(() => {
    if (selectedAccountId) return; // Already selected

    // Try metadata first
    if (metaAdsConnections.length > 0) {
      const metadata = (metaAdsConnections[0] as any).metadata as Record<
        string,
        unknown
      > | null;
      const metadataAccountId = metadata?.adAccountId as string | undefined;

      if (metadataAccountId && accounts.data?.accounts) {
        const exists = accounts.data.accounts.some(
          (a) => a.adAccountId === metadataAccountId,
        );
        if (exists) {
          setSelectedAccountId(metadataAccountId);
          return;
        }
      }
    }

    // Fallback to first account from API
    if (accounts.data?.accounts && accounts.data.accounts.length > 0) {
      setSelectedAccountId(accounts.data.accounts[0].adAccountId);
    }
  }, [metaAdsConnections, accounts.data?.accounts, selectedAccountId]);

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(
    Date.now() -
      (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) *
        24 *
        60 *
        60 *
        1000,
  )
    .toISOString()
    .split('T')[0];

  // Fetch insights data
  const insights = trpc.getMetaAdsInsights.useQuery(
    {
      adAccountId: selectedAccountId,
      startDate,
      endDate,
    },
    {
      enabled: !!selectedAccountId && selectedAccountId.length > 0,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  );

  // AI Review queries
  const cooldown = trpc.checkMetaAdsAIReviewCooldown.useQuery(undefined, {
    enabled: !!selectedAccountId,
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });

  const reviewHistory = trpc.getMetaAdsAIReviewHistory.useQuery(
    { adAccountId: selectedAccountId },
    {
      enabled: !!selectedAccountId,
      refetchOnWindowFocus: false,
    },
  );

  const generateReview = trpc.generateMetaAdsAIReview.useMutation({
    onSuccess: () => {
      cooldown.refetch();
      reviewHistory.refetch();
    },
  });

  const [showAllReviews, setShowAllReviews] = useState(false);

  // Update account mutation

  // Show loading state while checking for connections
  if (connections.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">
              Checking for Meta Ads connection...
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // No connection
  if (metaAdsConnections.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No Meta Ads connected
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Connect your Meta Ads account from the integrations page to unlock
              ad analytics.
            </p>
            <a
              href="/integrations"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Go to Integrations
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  // Accounts loading
  if (accounts.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">Loading accounts...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">
              Loading Meta Ads accounts...
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // Accounts error
  if (accounts.error) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
              <BarChart3 className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              Unable to load accounts
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {accounts.error.message ||
                'Failed to fetch Meta Ads accounts. Please try reconnecting.'}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => accounts.refetch()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
              >
                Retry
              </button>
              <a
                href="/integrations"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:bg-slate-50"
              >
                Reconnect
              </a>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // No accounts available
  if (!accounts.data?.accounts || accounts.data.accounts.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No accounts found
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              No Meta Ads accounts were found for your account. Please check
              your Meta Business Manager setup.
            </p>
            <a
              href="/integrations"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Go to Integrations
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  // No account selected yet - redirect to selection page
  if (!selectedAccountId) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">No account selected</h2>
            <p className="mt-3 text-sm text-slate-500">
              Please select a Meta Ads account to view analytics.
            </p>
            <a
              href="/meta-ads/select-account"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Select Account
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  // Insights loading
  if (insights.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">Loading insights...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Insights error
  if (insights.error) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <BarChart3 className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              Failed to load insights
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {insights.error.message ||
                'Unable to fetch Meta Ads insights. Please try again.'}
            </p>
            <button
              onClick={() => insights.refetch()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Retry
            </button>
          </Card>
        </div>
      </main>
    );
  }

  // Display insights data
  let stats = insights.data || {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversions: undefined,
    conversionValue: undefined,
    roas: undefined,
    cpa: undefined,
    reach: undefined,
    frequency: undefined,
    linkClicks: undefined,
    postEngagement: undefined,
    videoViews: undefined,
    campaigns: [],
    adsets: [],
    trend: [],
  };

  // If trend data exists, aggregate from trend to ensure accurate totals
  // This handles cases where API returns zeros for summary stats but trend has data
  if (stats.trend && stats.trend.length > 0) {
    const aggregated = stats.trend.reduce(
      (acc, day) => {
        acc.spend += day.spend || 0;
        acc.impressions += day.impressions || 0;
        acc.clicks += day.clicks || 0;
        if (day.conversions !== undefined) acc.conversions = (acc.conversions || 0) + day.conversions;
        if (day.conversionValue !== undefined) acc.conversionValue = (acc.conversionValue || 0) + day.conversionValue;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 }
    );

    // Use aggregated values if summary stats are zero, otherwise use API values
    const finalSpend = stats.spend > 0 ? stats.spend : aggregated.spend;
    const finalImpressions = stats.impressions > 0 ? stats.impressions : aggregated.impressions;
    const finalClicks = stats.clicks > 0 ? stats.clicks : aggregated.clicks;

    // Always recalculate derived metrics from actual totals for accuracy
    const calculatedCtr = finalImpressions > 0 ? finalClicks / finalImpressions : 0;
    const calculatedCpc = finalClicks > 0 ? finalSpend / finalClicks : 0;
    const calculatedCpm = finalImpressions > 0 ? (finalSpend / finalImpressions) * 1000 : 0;

    // Update stats with aggregated/calculated values
    stats = {
      ...stats,
      spend: finalSpend,
      impressions: finalImpressions,
      clicks: finalClicks,
      // Always use calculated values if we have data, fallback to API values only if calculated is 0
      ctr: calculatedCtr > 0 ? calculatedCtr : (stats.ctr || 0),
      cpc: calculatedCpc > 0 ? calculatedCpc : (stats.cpc || 0),
      cpm: calculatedCpm > 0 ? calculatedCpm : (stats.cpm || 0),
      conversions: aggregated.conversions > 0 ? aggregated.conversions : stats.conversions,
      conversionValue: aggregated.conversionValue > 0 ? aggregated.conversionValue : stats.conversionValue,
      roas: finalSpend > 0 && (aggregated.conversionValue > 0 || (stats.conversionValue && stats.conversionValue > 0))
        ? (aggregated.conversionValue || stats.conversionValue || 0) / finalSpend
        : stats.roas,
      cpa: (aggregated.conversions > 0 || (stats.conversions && stats.conversions > 0)) && finalSpend > 0
        ? finalSpend / (aggregated.conversions || stats.conversions || 1)
        : stats.cpa,
    };
  } else if (stats.spend > 0 || stats.impressions > 0 || stats.clicks > 0) {
    // Even without trend data, recalculate CPC and CPM if they're zero but we have base data
    if (stats.cpc === 0 && stats.clicks > 0) {
      stats.cpc = stats.spend / stats.clicks;
    }
    if (stats.cpm === 0 && stats.impressions > 0) {
      stats.cpm = (stats.spend / stats.impressions) * 1000;
    }
    if (stats.ctr === 0 && stats.impressions > 0) {
      stats.ctr = stats.clicks / stats.impressions;
    }
  }

  // Check if we have actual data or just defaults
  const hasNoData = !insights.data || (stats.spend === 0 && stats.impressions === 0 && stats.clicks === 0 && (!stats.trend || stats.trend.length === 0));


  const statCards = [
    {
      title: 'Spend',
      value: `$${stats.spend.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: `${stats.clicks.toLocaleString()} clicks`,
      subtext: 'Total ad spend',
      icon: DollarSign,
    },
    {
      title: 'Impressions',
      value: stats.impressions.toLocaleString(),
      change: `${stats.clicks.toLocaleString()} clicks`,
      subtext: 'Total impressions',
      icon: Eye,
    },
    {
      title: 'Clicks',
      value: stats.clicks.toLocaleString(),
      change:
        stats.impressions > 0
          ? `${((stats.clicks / stats.impressions) * 100).toFixed(2)}% CTR`
          : '0% CTR',
      subtext: 'Total clicks',
      icon: MousePointerClick,
    },
    {
      title: 'CTR',
      value: `${(stats.ctr * 100).toFixed(2)}%`,
      change: `${stats.cpc ? `$${stats.cpc.toFixed(2)} CPC` : 'N/A'}`,
      subtext: 'Click-through rate',
      icon: Target,
    },
  ];

  const performanceCards = [];
  if (stats.roas !== undefined) {
    performanceCards.push({
      title: 'ROAS',
      value: `${stats.roas.toFixed(2)}x`,
      change: stats.conversionValue
        ? `$${stats.conversionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue`
        : 'N/A',
      subtext: 'Return on ad spend',
      icon: TrendingUp,
    });
  }
  if (stats.conversions !== undefined && stats.conversions > 0) {
    performanceCards.push({
      title: 'Conversions',
      value: stats.conversions.toLocaleString(),
      change: stats.cpa ? `$${stats.cpa.toFixed(2)} CPA` : 'N/A',
      subtext: 'Total conversions',
      icon: ShoppingCart,
    });
  }
  if (stats.reach !== undefined && stats.reach > 0) {
    performanceCards.push({
      title: 'Reach',
      value: stats.reach.toLocaleString(),
      change: stats.frequency
        ? `${stats.frequency.toFixed(2)}x frequency`
        : 'N/A',
      subtext: 'Unique people reached',
      icon: Users,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">
                Ad performance and insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as '7d' | '30d' | '90d')
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </header>

        {/* No Data Message */}
        {hasNoData && (
          <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900">No data available</h3>
                <p className="mt-1 text-sm text-amber-700">
                  No ad activity found for the selected date range ({dateRange}). This could mean:
                </p>
                <ul className="mt-2 ml-4 list-disc text-sm text-amber-700 space-y-1">
                  <li>No campaigns are running in this period</li>
                  <li>All campaigns are paused</li>
                  <li>Try selecting a different date range</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {stat.change}
                    </p>
                    <p className="text-xs text-slate-400">{stat.subtext}</p>
                  </div>
                  <div className="rounded-full bg-slate-100 p-2">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {performanceCards.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {performanceCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-slate-900">
                        {stat.value}
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        {stat.change}
                      </p>
                      <p className="text-xs text-slate-400">{stat.subtext}</p>
                    </div>
                    <div className="rounded-full bg-slate-100 p-2">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* AI Review Section - After analytics tiles */}
        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">AI Campaign Review</h2>
                <p className="text-sm text-slate-500">
                  Get AI-powered insights on campaigns, adsets, budget, and creative optimization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {cooldown.data?.canGenerate ? (
                <button
                  onClick={() => generateReview.mutate()}
                  disabled={generateReview.isPending || !selectedAccountId}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generateReview.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Review
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Available in {cooldown.data?.hoursRemaining || 0}h
                  </span>
                </div>
              )}
            </div>
          </div>

          {generateReview.isError && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">
                  {generateReview.error?.message || 'Failed to generate review. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {reviewHistory.data?.reviews && reviewHistory.data.reviews.length > 0 ? (
            <div className="space-y-4">
              {/* Always show the most recent review */}
              {(() => {
                const mostRecentReview = reviewHistory.data.reviews[0];
                const insights = mostRecentReview.insights as any;
                const reviewDate = new Date(mostRecentReview.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-medium text-slate-600">
                          Latest Review - {reviewDate}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-900">{mostRecentReview.summary}</p>
                    </div>

                    {/* Campaigns Section */}
                    {insights.campaigns && (
                      <div className="mb-4 space-y-3">
                        {insights.campaigns.toStop && insights.campaigns.toStop.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <PauseCircle className="h-4 w-4 text-red-600" />
                              Campaigns to Stop
                            </h4>
                            <div className="space-y-2">
                              {insights.campaigns.toStop.slice(0, 3).map((campaign: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-red-200 bg-white p-3"
                                >
                                  <p className="font-medium text-slate-900">{campaign.name}</p>
                                  <p className="mt-1 text-xs text-slate-600">{campaign.reason}</p>
                                  {campaign.metrics && (
                                    <div className="mt-2 flex gap-2 text-xs">
                                      {campaign.metrics.roas !== undefined && (
                                        <Badge className="border-red-200 bg-red-50 text-red-700">
                                          ROAS: {campaign.metrics.roas.toFixed(2)}x
                                        </Badge>
                                      )}
                                      {campaign.metrics.spend !== undefined && (
                                        <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                                          Spend: ${campaign.metrics.spend.toFixed(2)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.campaigns.toScale && insights.campaigns.toScale.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                              Campaigns to Scale
                            </h4>
                            <div className="space-y-2">
                              {insights.campaigns.toScale.slice(0, 3).map((campaign: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-emerald-200 bg-white p-3"
                                >
                                  <p className="font-medium text-slate-900">{campaign.name}</p>
                                  <p className="mt-1 text-xs text-slate-600">{campaign.reason}</p>
                                  {campaign.metrics && (
                                    <div className="mt-2 flex gap-2 text-xs">
                                      {campaign.metrics.roas !== undefined && (
                                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                          ROAS: {campaign.metrics.roas.toFixed(2)}x
                                        </Badge>
                                      )}
                                      {campaign.metrics.spend !== undefined && (
                                        <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                                          Spend: ${campaign.metrics.spend.toFixed(2)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Budget Recommendations */}
                    {insights.budget && insights.budget.recommendations && insights.budget.recommendations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          Budget Recommendations
                        </h4>
                        <div className="space-y-2">
                          {insights.budget.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-blue-200 bg-white p-3"
                            >
                              <p className="font-medium text-slate-900">{rec.action}</p>
                              <p className="mt-1 text-xs text-slate-600">{rec.reason}</p>
                              {rec.expectedImpact && (
                                <p className="mt-1 text-xs text-blue-700">
                                  Expected Impact: {rec.expectedImpact}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Creative Tips */}
                    {insights.creative && insights.creative.tips && insights.creative.tips.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Lightbulb className="h-4 w-4 text-purple-600" />
                          Creative Optimization Tips
                        </h4>
                        <div className="space-y-2">
                          {insights.creative.tips.slice(0, 2).map((tip: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-purple-200 bg-white p-3"
                            >
                              <p className="font-medium text-slate-900">{tip.title}</p>
                              <p className="mt-1 text-xs text-slate-600">{tip.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show all reviews button if there are more than one */}
                    {reviewHistory.data.reviews.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <button
                          onClick={() => setShowAllReviews(!showAllReviews)}
                          className="text-sm font-medium text-purple-600 hover:text-purple-700"
                        >
                          {showAllReviews ? 'Hide' : 'Show'} All Reviews ({reviewHistory.data.reviews.length})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : cooldown.data?.lastReviewAt && !reviewHistory.data?.reviews ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-600">
                Your last review was generated on{' '}
                {new Date(cooldown.data.lastReviewAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                . Generate a new review to see insights.
              </p>
            </div>
          ) : !cooldown.data?.lastReviewAt && !generateReview.isPending ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-purple-400" />
              <p className="mt-4 text-sm font-medium text-slate-900">
                No reviews generated yet
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Click "Generate Review" to get AI-powered insights about your campaigns, adsets, budget, and creative performance.
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Performance trend
              </h2>
              <p className="text-sm text-slate-500">
                Spend, impressions, and clicks over time
              </p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trend
            </Badge>
          </div>
          <div className="space-y-3">
            {stats.trend.length === 0 ? (
              <p className="py-8 text-center text-slate-500">
                No trend data available
              </p>
            ) : (
              stats.trend.map((day, index) => {
                const maxSpend = Math.max(
                  ...stats.trend.map((d) => d.spend),
                  1,
                );
                const percentage =
                  maxSpend > 0 ? (day.spend / maxSpend) * 100 : 0;
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', {
                  weekday: 'short',
                });
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-semibold text-slate-600">
                      {dayName}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {dateStr}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-40 text-right text-sm font-semibold text-slate-700">
                      ${day.spend.toFixed(2)} •{' '}
                      {day.impressions.toLocaleString()} impressions •{' '}
                      {day.clicks.toLocaleString()} clicks
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Zap className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Top campaigns
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.campaigns.length === 0 ? (
                <p className="text-slate-500">No campaign data available</p>
              ) : (
                stats.campaigns.slice(0, 10).map((campaign, index) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span className="max-w-[200px] truncate">
                        {campaign.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.roas !== undefined && (
                        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                          {campaign.roas.toFixed(2)}x ROAS
                        </Badge>
                      )}
                      <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                        ${campaign.spend.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Target className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Top ad sets
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.adsets.length === 0 ? (
                <p className="text-slate-500">No ad set data available</p>
              ) : (
                stats.adsets.slice(0, 10).map((adset, index) => (
                  <div
                    key={adset.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span className="max-w-[200px] truncate">
                        {adset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {adset.roas !== undefined && (
                        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                          {adset.roas.toFixed(2)}x ROAS
                        </Badge>
                      )}
                      <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                        ${adset.spend.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-3">
              <Clock className="h-5 w-5 text-slate-700" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Performance metrics
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CPC
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ${stats.cpc.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Average cost per click
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CPM
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ${stats.cpm.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cost per 1,000 impressions
              </p>
            </div>
            {stats.reach !== undefined && stats.reach > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Frequency
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {stats.frequency?.toFixed(2) || 'N/A'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Average impressions per person
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>


      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </main>
  );
}

export default function MetaAdsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </main>
      }
    >
      <MetaAdsInner />
    </Suspense>
  );
}
