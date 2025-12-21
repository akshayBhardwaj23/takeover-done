'use client';

import { Suspense, useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Eye,
  MousePointerClick,
  DollarSign,
  ShoppingCart,
  Globe,
  Clock,
  Target,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

function GoogleAnalyticsInner() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [redirectingToReconnect, setRedirectingToReconnect] = useState(false);
  
  // Get current currency from connection metadata
  const currentCurrency = gaConnections.length > 0 
    ? ((gaConnections[0] as any).metadata as Record<string, unknown> | null)?.currency as string | undefined
    : undefined;
  
  const updateCurrency = trpc.updateGACurrency.useMutation({
    onSuccess: () => {
      // Refetch analytics data to get updated currency
      analytics.refetch();
      connections.refetch();
    },
  });

  // Fetch connections with refetch on mount to catch newly created/updated connections
  const connections = trpc.connections.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window regains focus (after OAuth redirect)
    staleTime: 0, // Always consider stale to refetch when navigating here
  });

  // Get GA connections
  const gaConnections = connections.data?.connections.filter(
    (c: any) => c.type === 'GOOGLE_ANALYTICS'
  ) || [];

  // Auto-select property from metadata only
  useEffect(() => {
    if (selectedPropertyId) return; // Already selected

    // Get property from connection metadata
    if (gaConnections.length > 0) {
      const metadata = (gaConnections[0] as any).metadata as Record<string, unknown> | null;
      const metadataPropertyId = metadata?.propertyId as string | undefined;
      
      if (metadataPropertyId) {
        setSelectedPropertyId(metadataPropertyId);
      }
    }
  }, [gaConnections, selectedPropertyId]);

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(
    Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];

  // Fetch analytics data
  const analytics = trpc.getGoogleAnalyticsData.useQuery(
    {
      propertyId: selectedPropertyId,
      startDate,
      endDate,
    },
    {
      enabled: !!selectedPropertyId && selectedPropertyId.length > 0,
      retry: false, // Don't retry - if it fails, we'll handle it
      refetchOnWindowFocus: true, // Refetch when window regains focus (after OAuth redirect)
      refetchOnMount: true, // Refetch when component mounts (after OAuth redirect)
      staleTime: 30000,
      onError: (error: any) => {
        // Check if it's an expired token error
        const errorMessage = error?.message || '';
        const errorDataCode = error?.data?.code;
        const isExpiredToken = 
          errorMessage.includes('expired') || 
          errorMessage.includes('reconnect') ||
          errorDataCode === 'UNAUTHORIZED';
        
        // Immediately redirect to OAuth if token expired
        if (isExpiredToken && !redirectingToReconnect && typeof window !== 'undefined') {
          setRedirectingToReconnect(true);
          const currentPath = window.location.pathname + window.location.search;
          window.location.replace(`/api/google-analytics/install?returnUrl=${encodeURIComponent(currentPath)}`);
        }
      },
    }
  );

  // Watch for expired token errors and redirect immediately (after analytics query is defined)
  useEffect(() => {
    if (analytics.error && !redirectingToReconnect) {
      const errorMessage = analytics.error.message || '';
      const errorDataCode = (analytics.error as any)?.data?.code;
      const isExpiredToken = 
        errorMessage.includes('expired') || 
        errorMessage.includes('reconnect') ||
        errorDataCode === 'UNAUTHORIZED';
      
      if (isExpiredToken && typeof window !== 'undefined') {
        setRedirectingToReconnect(true);
        const currentPath = window.location.pathname + window.location.search;
        window.location.replace(`/api/google-analytics/install?returnUrl=${encodeURIComponent(currentPath)}`);
      }
    }
  }, [analytics.error, redirectingToReconnect]);

  // AI Review queries
  const cooldown = trpc.checkGA4AIReviewCooldown.useQuery(undefined, {
    enabled: !!selectedPropertyId,
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });

  const reviewHistory = trpc.getGA4AIReviewHistory.useQuery(
    { propertyId: selectedPropertyId },
    {
      enabled: !!selectedPropertyId,
      refetchOnWindowFocus: false,
    },
  );

  const generateReview = trpc.generateGA4AIReview.useMutation({
    onSuccess: () => {
      cooldown.refetch();
      reviewHistory.refetch();
    },
    onError: (error: any) => {
      // Check if it's an expired token error
      const errorMessage = error?.message || '';
      const errorDataCode = error?.data?.code;
      const isExpiredToken = 
        errorMessage.includes('expired') || 
        errorMessage.includes('reconnect') ||
        errorDataCode === 'UNAUTHORIZED';
      
      // Immediately redirect to OAuth if token expired
      if (isExpiredToken && !redirectingToReconnect && typeof window !== 'undefined') {
        setRedirectingToReconnect(true);
        const currentPath = window.location.pathname + window.location.search;
        window.location.replace(`/api/google-analytics/install?returnUrl=${encodeURIComponent(currentPath)}`);
      }
    },
  });


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
              <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">Checking for Google Analytics connection...</p>
          </Card>
        </div>
      </main>
    );
  }

  // No connection (only show this after connections query has completed)
  if (gaConnections.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No Google Analytics connected
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Connect your Google Analytics 4 property from the integrations page to unlock website analytics.
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

  // No property selected - redirect to selection page
  if (!selectedPropertyId) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">No property selected</h2>
            <p className="mt-3 text-sm text-slate-500">
              Please select a Google Analytics property to view analytics.
            </p>
            <a
              href="/google-analytics/select-property"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Select Property
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  // Analytics loading
  if (analytics.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
              <p className="text-sm text-slate-500">Loading analytics data...</p>
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

  // Analytics error - check if it's an expired token and auto-reconnect silently
  // Check error early and show loading state immediately if redirecting
  if (redirectingToReconnect) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
              <p className="text-sm text-slate-500">Reconnecting...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">Refreshing your connection...</p>
          </Card>
        </div>
      </main>
    );
  }

  if (analytics.error) {
    const errorMessage = analytics.error.message || '';
    const errorDataCode = (analytics.error as any)?.data?.code;
    const errorShape = analytics.error as any;
    // Check multiple ways the error might be structured
    const isExpiredToken = 
      errorMessage.includes('expired') || 
      errorMessage.includes('reconnect') ||
      errorDataCode === 'UNAUTHORIZED' ||
      errorShape?.data?.code === 'UNAUTHORIZED' ||
      errorShape?.code === 'UNAUTHORIZED';

    // Show loading state while reconnecting (no error message)
    // The useEffect and onError callback will handle the redirect
    if (isExpiredToken) {
      return (
        <main className="min-h-screen bg-slate-100 py-28">
          <div className="mx-auto max-w-6xl space-y-8 px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <BarChart3 className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
                <p className="text-sm text-slate-500">Reconnecting...</p>
              </div>
            </div>
            <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
              <p className="mt-4 text-sm text-slate-600">Refreshing your connection...</p>
            </Card>
          </div>
        </main>
      );
    }

    // For non-expired errors, show error message
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <BarChart3 className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Failed to load analytics</h2>
            <p className="mt-3 text-sm text-slate-500">
              {errorMessage || 'Unable to fetch Google Analytics data. Please try again.'}
            </p>
            <button
              onClick={() => analytics.refetch()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Retry
            </button>
          </Card>
        </div>
      </main>
    );
  }

  // Display analytics data
  const stats = analytics.data || {
    sessions: 0,
    users: 0,
    pageViews: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    revenue: 0,
    transactions: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    currency: 'USD',
    trafficSources: [],
    topPages: [],
    trend: [],
  };

  // Helper function to format currency
  const formatCurrency = (amount: number, currencyCode: string = stats.currency || 'USD'): string => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fallback if currency code is invalid
      return `${currencyCode} ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const statCards = [
    {
      title: 'Sessions',
      value: stats.sessions.toLocaleString(),
      change: `${stats.users.toLocaleString()} users`,
      subtext: 'Total sessions',
      icon: MousePointerClick,
    },
    {
      title: 'Users',
      value: stats.users.toLocaleString(),
      change: 'Unique visitors',
      subtext: 'Active users',
      icon: Users,
    },
    {
      title: 'Page Views',
      value: stats.pageViews.toLocaleString(),
      change: `${stats.sessions > 0 ? (stats.pageViews / stats.sessions).toFixed(1) : '0'} per session`,
      subtext: 'Total page views',
      icon: Eye,
    },
    {
      title: 'Bounce Rate',
      value: `${(stats.bounceRate * 100).toFixed(1)}%`,
      change: 'Single-page sessions',
      subtext: 'Lower is better',
      icon: Target,
    },
  ];

  const ecommerceCards =
    stats.revenue !== undefined && stats.revenue > 0
      ? [
          {
            title: 'Revenue',
            value: formatCurrency(stats.revenue, stats.currency),
            change: `${stats.transactions || 0} transactions`,
            subtext: 'Total revenue',
            icon: DollarSign,
          },
          {
            title: 'Conversion Rate',
            value: `${(stats.conversionRate || 0).toFixed(2)}%`,
            change: `${stats.transactions || 0} conversions`,
            subtext: 'Sessions to purchases',
            icon: TrendingUp,
          },
          {
            title: 'Avg Order Value',
            value: formatCurrency(stats.avgOrderValue || 0, stats.currency),
            change: 'Per transaction',
            subtext: 'Average order value',
            icon: ShoppingCart,
          },
        ]
      : [];

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
              <p className="text-sm text-slate-500">Website traffic and performance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {gaConnections.length > 0 && (
              <select
                value={currentCurrency || stats.currency || 'USD'}
                onChange={(e) => {
                  updateCurrency.mutate({ currency: e.target.value });
                }}
                disabled={updateCurrency.isPending}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                title="Select currency for revenue display"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CNY">CNY (¥)</option>
              </select>
            )}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </header>

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
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs font-semibold text-slate-600">{stat.change}</p>
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

        {ecommerceCards.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ecommerceCards.map((stat) => {
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
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs font-semibold text-slate-600">{stat.change}</p>
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

        {/* AI Review Section - Moved to top after analytics tiles */}
        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">AI Analytics Review</h2>
                <p className="text-sm text-slate-500">
                  Get AI-powered insights, suggestions, and recommendations for your analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {cooldown.data?.canGenerate ? (
                <button
                  onClick={() => generateReview.mutate()}
                  disabled={generateReview.isPending || !selectedPropertyId}
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

          {generateReview.isError && (() => {
            const errorMessage = generateReview.error?.message || '';
            const errorDataCode = (generateReview.error as any)?.data?.code;
            const isExpiredToken = errorMessage.includes('expired') || 
                                  errorMessage.includes('reconnect') ||
                                  errorDataCode === 'UNAUTHORIZED';
            
            // Auto-redirect to OAuth if token expired (silently)
            useEffect(() => {
              if (isExpiredToken && !redirectingToReconnect) {
                setRedirectingToReconnect(true);
                const currentPath = window.location.pathname + window.location.search;
                // Use window.location.replace to avoid adding to history
                window.location.replace(`/api/google-analytics/install?returnUrl=${encodeURIComponent(currentPath)}`);
              }
            }, [isExpiredToken, redirectingToReconnect]);

            // Don't show error for expired tokens - just redirect silently
            if (isExpiredToken) {
              return null; // No error message shown
            }

            // Show error for other issues
            return (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-800">
                    {errorMessage || 'Failed to generate review. Please try again.'}
                  </p>
                </div>
              </div>
            );
          })()}

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
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-medium text-slate-600">
                          Latest Review - {reviewDate}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-900">{mostRecentReview.summary}</p>
                    </div>

                    {insights.problems && insights.problems.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Problems Identified
                        </h4>
                        <div className="space-y-2">
                          {insights.problems.slice(0, 3).map((problem: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-amber-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">{problem.title}</p>
                                  <p className="mt-1 text-xs text-slate-600">
                                    {problem.description}
                                  </p>
                                  {problem.impact && (
                                    <p className="mt-1 text-xs text-amber-700">
                                      Impact: {problem.impact}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  className={`ml-2 ${
                                    problem.severity === 'high'
                                      ? 'border-red-200 bg-red-50 text-red-700'
                                      : problem.severity === 'medium'
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {problem.severity}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.suggestions && insights.suggestions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          Top Suggestions
                        </h4>
                        <div className="space-y-2">
                          {insights.suggestions.slice(0, 3).map((suggestion: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-blue-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">
                                    {suggestion.title}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-600">
                                    {suggestion.description}
                                  </p>
                                  {suggestion.expectedImpact && (
                                    <p className="mt-1 text-xs text-blue-700">
                                      Expected Impact: {suggestion.expectedImpact}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  className={`ml-2 ${
                                    suggestion.priority === 'high'
                                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                                      : suggestion.priority === 'medium'
                                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {suggestion.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.remedialActions && insights.remedialActions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          Recommended Actions
                        </h4>
                        <div className="space-y-2">
                          {insights.remedialActions.slice(0, 3).map((action: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-emerald-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">{action.action}</p>
                                  {action.reason && (
                                    <p className="mt-1 text-xs text-slate-600">
                                      {action.reason}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  className={`ml-2 ${
                                    action.priority === 'high'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : action.priority === 'medium'
                                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {action.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.tips && insights.tips.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Lightbulb className="h-4 w-4 text-purple-600" />
                          Tips & Best Practices
                        </h4>
                        <div className="space-y-2">
                          {insights.tips.slice(0, 2).map((tip: any, idx: number) => (
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

              {/* Show all reviews if toggled */}
              {showAllReviews && reviewHistory.data.reviews.length > 1 && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">All Reviews</h3>
                  {reviewHistory.data.reviews.slice(1).map((review: any) => {
                    const insights = review.insights as any;
                    const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={review.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            <span className="text-sm font-medium text-slate-600">
                              Review from {reviewDate}
                            </span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-slate-700">{review.summary}</p>
                        </div>

                        {insights.problems && insights.problems.length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              Problems Identified
                            </h4>
                            <div className="space-y-2">
                              {insights.problems.map((problem: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-amber-200 bg-white p-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-slate-900">{problem.title}</p>
                                      <p className="mt-1 text-xs text-slate-600">
                                        {problem.description}
                                      </p>
                                      {problem.impact && (
                                        <p className="mt-1 text-xs text-amber-700">
                                          Impact: {problem.impact}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      className={`ml-2 ${
                                        problem.severity === 'high'
                                          ? 'border-red-200 bg-red-50 text-red-700'
                                          : problem.severity === 'medium'
                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      {problem.severity}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.suggestions && insights.suggestions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Lightbulb className="h-4 w-4 text-blue-600" />
                              Suggestions
                            </h4>
                            <div className="space-y-2">
                              {insights.suggestions.map((suggestion: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-blue-200 bg-white p-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-slate-900">
                                        {suggestion.title}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-600">
                                        {suggestion.description}
                                      </p>
                                      {suggestion.expectedImpact && (
                                        <p className="mt-1 text-xs text-blue-700">
                                          Expected Impact: {suggestion.expectedImpact}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      className={`ml-2 ${
                                        suggestion.priority === 'high'
                                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                                          : suggestion.priority === 'medium'
                                            ? 'border-slate-200 bg-slate-50 text-slate-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      {suggestion.priority}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.remedialActions && insights.remedialActions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              Remedial Actions
                            </h4>
                            <div className="space-y-2">
                              {insights.remedialActions.map((action: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-emerald-200 bg-white p-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-slate-900">{action.action}</p>
                                      {action.reason && (
                                        <p className="mt-1 text-xs text-slate-600">
                                          {action.reason}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      className={`ml-2 ${
                                        action.priority === 'high'
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : action.priority === 'medium'
                                            ? 'border-slate-200 bg-slate-50 text-slate-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      {action.priority}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.tips && insights.tips.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Lightbulb className="h-4 w-4 text-purple-600" />
                              Tips & Best Practices
                            </h4>
                            <div className="space-y-2">
                              {insights.tips.map((tip: any, idx: number) => (
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
                      </div>
                    );
                  })}
                </div>
              )}
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
                Click "Generate Review" to get AI-powered insights about your analytics data.
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Traffic trend</h2>
              <p className="text-sm text-slate-500">Sessions and users over time</p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trend
            </Badge>
          </div>
          <div className="space-y-3">
            {stats.trend.length === 0 ? (
              <p className="py-8 text-center text-slate-500">No trend data available</p>
            ) : (
              stats.trend.map((day, index) => {
                const maxSessions = Math.max(...stats.trend.map((d) => d.sessions), 1);
                const percentage = maxSessions > 0 ? (day.sessions / maxSessions) * 100 : 0;
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-semibold text-slate-600">
                      {dayName}
                      <span className="ml-2 text-xs font-normal text-slate-400">{dateStr}</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-28 text-right text-sm font-semibold text-slate-700">
                      {day.sessions} sessions
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
                <Globe className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Traffic sources</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.trafficSources.length === 0 ? (
                <p className="text-slate-500">No traffic source data available</p>
              ) : (
                stats.trafficSources.slice(0, 10).map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span>
                        {source.source} / {source.medium}
                      </span>
                    </div>
                    <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                      {source.sessions} sessions
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Eye className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Top pages</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.topPages.length === 0 ? (
                <p className="text-slate-500">No page data available</p>
              ) : (
                stats.topPages.slice(0, 10).map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span className="max-w-[200px] truncate">{page.page}</span>
                    </div>
                    <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                      {page.views} views
                    </Badge>
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
            <h2 className="text-lg font-semibold text-slate-900">Session metrics</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Avg Session Duration
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {Math.floor(stats.avgSessionDuration)}s
              </p>
              <p className="mt-1 text-xs text-slate-500">Average time per session</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pages per Session
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {stats.sessions > 0 ? (stats.pageViews / stats.sessions).toFixed(1) : '0'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Average pages viewed</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function GoogleAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </main>
      }
    >
      <GoogleAnalyticsInner />
    </Suspense>
  );
}
