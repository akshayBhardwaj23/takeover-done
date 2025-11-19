'use client';

import { Suspense, useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
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
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

function GoogleAnalyticsInner() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // Fetch connections
  const connections = trpc.connections.useQuery();

  // Fetch properties
  const properties = trpc.getGoogleAnalyticsProperties.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error('[GA Page] Properties query error:', {
        message: error.message,
        data: error.data,
        code: error.data?.code,
      });
    },
    onSuccess: (data) => {
      console.log('[GA Page] Properties query success:', {
        count: data?.properties?.length || 0,
        properties: data?.properties?.map((p: any) => ({
          id: p.propertyId,
          name: p.propertyName,
        })),
      });
    },
  });

  // Get GA connections
  const gaConnections = connections.data?.connections.filter(
    (c: any) => c.type === 'GOOGLE_ANALYTICS'
  ) || [];

  // Auto-select property: first from metadata, then first from API
  useEffect(() => {
    if (selectedPropertyId) return; // Already selected

    // Try metadata first
    if (gaConnections.length > 0) {
      const metadata = (gaConnections[0] as any).metadata as Record<string, unknown> | null;
      const metadataPropertyId = metadata?.propertyId as string | undefined;
      
      if (metadataPropertyId && properties.data?.properties) {
        const exists = properties.data.properties.some(p => p.propertyId === metadataPropertyId);
        if (exists) {
          setSelectedPropertyId(metadataPropertyId);
          return;
        }
      }
    }

    // Fallback to first property from API
    if (properties.data?.properties && properties.data.properties.length > 0) {
      setSelectedPropertyId(properties.data.properties[0].propertyId);
    }
  }, [gaConnections, properties.data?.properties, selectedPropertyId]);

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
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  // Update property mutation
  const updateProperty = trpc.updateGoogleAnalyticsProperty.useMutation({
    onSuccess: () => {
      connections.refetch();
    },
  });

  // Handle property selection
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const selectedProperty = properties.data?.properties?.find(p => p.propertyId === propertyId);
    if (selectedProperty && gaConnections.length > 0) {
      updateProperty.mutate({
        propertyId: selectedProperty.propertyId,
        propertyName: selectedProperty.propertyName,
      });
    }
  };

  // No connection
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

  // Properties loading
  if (properties.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
              <p className="text-sm text-slate-500">Loading properties...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">Loading Google Analytics properties...</p>
          </Card>
        </div>
      </main>
    );
  }

  // Properties error
  if (properties.error) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
              <BarChart3 className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Unable to load properties</h2>
            <p className="mt-3 text-sm text-slate-500">
              {properties.error.message || 'Failed to fetch Google Analytics properties. Please try reconnecting.'}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => properties.refetch()}
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

  // No properties available
  if (!properties.data?.properties || properties.data.properties.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">No properties found</h2>
            <p className="mt-3 text-sm text-slate-500">
              No Google Analytics properties were found for your account. Please check your Google Analytics setup.
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

  // No property selected yet (shouldn't happen due to auto-select, but just in case)
  if (!selectedPropertyId) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Google Analytics</h1>
              <p className="text-sm text-slate-500">Select a property to view analytics</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Select a Property</h2>
            <select
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="mt-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select a property...</option>
              {properties.data.properties.map((prop) => (
                <option key={prop.propertyId} value={prop.propertyId}>
                  {prop.propertyName}
                </option>
              ))}
            </select>
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

  // Analytics error
  if (analytics.error) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <BarChart3 className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Failed to load analytics</h2>
            <p className="mt-3 text-sm text-slate-500">
              {analytics.error.message || 'Unable to fetch Google Analytics data. Please try again.'}
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
    trafficSources: [],
    topPages: [],
    trend: [],
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
            value: `$${stats.revenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
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
            value: `$${stats.avgOrderValue?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || '0.00'}`,
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
            {properties.data?.properties && properties.data.properties.length > 0 && (
              <select
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                disabled={updateProperty.isPending || properties.isLoading}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {properties.data.properties.map((prop) => (
                  <option key={prop.propertyId} value={prop.propertyId}>
                    {prop.propertyName}
                  </option>
                ))}
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
