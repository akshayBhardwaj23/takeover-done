'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '../../lib/trpc';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowRight, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { ForecastRevenueChart } from './components/ForecastRevenueChart';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode || 'USD'} ${Math.round(amount).toLocaleString()}`;
  }
}

type ApiActualPoint = {
  date: string;
  revenue: number;
  orders: number;
  sessions: number;
  aov: number;
  cvr: number | null;
};

type ApiForecastPoint = {
  date: string;
  revenue: number;
  revenueLow: number;
  revenueHigh: number;
  sessions: number | null;
  aov: number;
  cvr: number | null;
};

type ApiResponse = {
  shop: string;
  currency: string;
  timezone: string;
  today: string;
  actualSeries: ApiActualPoint[];
  forecastSeries: ApiForecastPoint[];
  confidenceScore: number;
  debugMetrics?: any;
};

function sum(values: number[]) {
  return values.reduce((s, v) => s + v, 0);
}

function totalsFromForecast(points: ApiForecastPoint[], horizon: 7 | 30 | 90) {
  const slice = points.slice(0, horizon);
  return {
    expected: sum(slice.map((p) => p.revenue)),
    best: sum(slice.map((p) => p.revenueHigh)),
    worst: sum(slice.map((p) => p.revenueLow)),
  };
}

function totalsOrdersFromForecast(
  points: ApiForecastPoint[],
  horizon: 7 | 30 | 90,
) {
  const slice = points.slice(0, horizon);
  const expected = sum(
    slice.map((p) =>
      p.sessions != null && p.cvr != null ? p.sessions * p.cvr : 0,
    ),
  );
  // Derive best/worst from revenue band proportionally (simple MVP)
  const rev = totalsFromForecast(points, horizon);
  const k =
    rev.expected > 0
      ? Math.max(
          0,
          Math.min(0.5, (rev.best - rev.worst) / (2 * rev.expected)),
        )
      : 0.25;
  return {
    expected,
    best: expected * (1 + k),
    worst: expected * (1 - k),
  };
}

function avgFromForecast(points: ApiForecastPoint[], horizon: 7 | 30 | 90, key: 'cvr' | 'aov') {
  const slice = points.slice(0, horizon);
  const vals =
    key === 'cvr'
      ? slice.map((p) => p.cvr).filter((v): v is number => typeof v === 'number')
      : slice.map((p) => p.aov).filter((v): v is number => typeof v === 'number');
  const denom = Math.max(1, vals.length);
  const expected = sum(vals) / denom;
  return { expected, best: expected, worst: expected };
}

function PredictiveInsightsInner() {
  const sp = useSearchParams();
  const shopFromUrl = sp.get('shop');
  const [selectedShop, setSelectedShop] = useState(shopFromUrl || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  const connections = trpc.connections.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const shopifyStores = useMemo(
    () =>
      connections.data?.connections.filter((c: any) => c.type === 'SHOPIFY') ||
      [],
    [connections.data?.connections],
  );
  const gaConnections = useMemo(
    () =>
      connections.data?.connections.filter(
        (c: any) => c.type === 'GOOGLE_ANALYTICS',
      ) || [],
    [connections.data?.connections],
  );
  const metaConnection = useMemo(
    () =>
      (connections.data?.connections || []).find(
        (c: any) => c.type === 'META_ADS',
      ),
    [connections.data?.connections],
  );

  // Auto-select first store if none selected
  useEffect(() => {
    if (selectedShop) return;
    if (shopifyStores.length > 0) {
      const firstStoreDomain = shopifyStores[0].shopDomain;
      if (firstStoreDomain) setSelectedShop(firstStoreDomain);
    }
  }, [selectedShop, shopifyStores]);

  // Auto-select GA property from metadata
  useEffect(() => {
    if (selectedPropertyId) return;
    if (gaConnections.length > 0) {
      const metadata = (gaConnections[0] as any).metadata as Record<
        string,
        unknown
      > | null;
      const metadataPropertyId = metadata?.propertyId as string | undefined;
      if (metadataPropertyId) setSelectedPropertyId(metadataPropertyId);
    }
  }, [gaConnections, selectedPropertyId]);

  const isConnectionsLoading = connections.isLoading;
  const hasSelectedShop = !!selectedShop;

  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSelectedShop) return;
    let cancelled = false;
    const run = async () => {
      setApiLoading(true);
      setApiError(null);
      try {
        const qs = new URLSearchParams({
          days: '90',
          shop: selectedShop,
          ...(process.env.NODE_ENV === 'development' ? { debug: '1' } : {}),
        });
        const res = await fetch(`/api/predictive-insights?${qs.toString()}`);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setApiData(json);
      } catch (e: any) {
        if (!cancelled) setApiError(e?.message || 'Failed to load forecast');
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [hasSelectedShop, selectedShop]);

  const currency = apiData?.currency || 'USD';
  const currencyFormatter = useMemo(
    () => (n: number) => formatCurrency(n, currency),
    [currency],
  );

  const historyWindowDays = 21;
  const chartHistorical = useMemo(() => {
    const actual = apiData?.actualSeries || [];
    const hist = actual.slice(-historyWindowDays).map((p) => ({
      date: p.date,
      value: p.revenue,
    }));
    return hist;
  }, [apiData?.actualSeries]);

  const forecastForChart = useMemo(() => {
    const f = apiData?.forecastSeries || [];
    return f.map((p) => ({
      date: p.date,
      expected: p.revenue,
      best: p.revenueHigh,
      worst: p.revenueLow,
    }));
  }, [apiData?.forecastSeries]);

  const revenueTotals = useMemo(() => {
    const f = apiData?.forecastSeries || [];
    return {
      d7: totalsFromForecast(f, 7),
      d30: totalsFromForecast(f, 30),
      d90: totalsFromForecast(f, 90),
    };
  }, [apiData?.forecastSeries]);

  const ordersTotals = useMemo(() => {
    const f = apiData?.forecastSeries || [];
    return {
      d7: totalsOrdersFromForecast(f, 7),
      d30: totalsOrdersFromForecast(f, 30),
      d90: totalsOrdersFromForecast(f, 90),
    };
  }, [apiData?.forecastSeries]);

  const convAvg = useMemo(() => {
    const f = apiData?.forecastSeries || [];
    return {
      d7: avgFromForecast(f, 7, 'cvr'),
      d30: avgFromForecast(f, 30, 'cvr'),
      d90: avgFromForecast(f, 90, 'cvr'),
    };
  }, [apiData?.forecastSeries]);

  const aovAvg = useMemo(() => {
    const f = apiData?.forecastSeries || [];
    return {
      d7: avgFromForecast(f, 7, 'aov'),
      d30: avgFromForecast(f, 30, 'aov'),
      d90: avgFromForecast(f, 90, 'aov'),
    };
  }, [apiData?.forecastSeries]);

  const gaConnected = gaConnections.length > 0 && !!selectedPropertyId;
  const metaConnected = !!metaConnection;

  const debugLast21 = useMemo(() => {
    const rows = apiData?.actualSeries || [];
    return rows.slice(-21);
  }, [apiData?.actualSeries]);

  const debugLast30 = useMemo(() => {
    const rows = apiData?.actualSeries || [];
    const last30 = rows.slice(-30);
    const last30Revenue = sum(last30.map((r) => r.revenue));
    const last30Orders = sum(last30.map((r) => r.orders));
    const last30Aov = last30Orders > 0 ? last30Revenue / last30Orders : 0;
    return {
      last30Revenue,
      last30Orders,
      last30Aov,
    };
  }, [apiData?.actualSeries]);

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        {isConnectionsLoading ? (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Sparkles className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">
                  Predictive Insights
                </h1>
                <p className="text-sm text-slate-500">Loading connections…</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : !hasSelectedShop ? (
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Sparkles className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No Shopify store connected
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Connect Shopify to enable forward-looking sales forecasts.
            </p>
            <Link
              href="/integrations"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Go to Integrations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        ) : (
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Sparkles className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Predictive Insights
              </h1>
              <p className="text-sm text-slate-500">
                Future-oriented forecasts powered by simple, explainable
                drivers
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            {shopifyStores.length > 1 && (
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {shopifyStores.map((store: any) => (
                  <option key={store.id} value={store.shopDomain}>
                    {store.shopDomain}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                Shopify: connected
              </Badge>
              <Badge
                className={
                  gaConnected
                    ? 'border border-blue-200 bg-blue-50 text-blue-700'
                    : 'border border-slate-200 bg-slate-50 text-slate-600'
                }
              >
                GA4: {gaConnected ? 'connected' : 'missing'}
              </Badge>
              <Badge
                className={
                  metaConnected
                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                    : 'border border-slate-200 bg-slate-50 text-slate-600'
                }
              >
                Meta Ads: {metaConnected ? 'connected' : 'missing'}
              </Badge>
              <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                Email revenue: coming soon
              </Badge>
            </div>
          </div>
        </header>
        )}

        {hasSelectedShop && (!gaConnected || !metaConnected) && (
          <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white/80 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Confidence will improve with more data sources.
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  This MVP can forecast with Shopify alone, but GA4 (sessions) and
                  Meta (click/CPC trends) make the drivers more explainable.
                </p>
                <Link
                  href="/integrations"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-900 underline hover:text-amber-950"
                >
                  Connect integrations
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        )}

        {hasSelectedShop && (
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {apiLoading && !apiData ? (
              <div className="py-10 text-center text-sm text-slate-600">
                Loading forecast…
              </div>
            ) : apiError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {apiError}
              </div>
            ) : (
              <ForecastRevenueChart
                title="Sales forecast (next 90 days)"
                subtitle={`Showing last ${historyWindowDays} days only for context. Forecast begins after Today.`}
                today={apiData?.today || new Date().toISOString().split('T')[0]}
                currencyFormatter={currencyFormatter}
                historical={chartHistorical}
                forecast={forecastForChart}
              />
            )}
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-600">
                Revenue is calculated as{' '}
                <span className="font-semibold text-slate-900">
                  sessions × conversion rate × AOV
                </span>
                . Past data is included only to anchor the projection.
              </div>
              <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
                Confidence score:{' '}
                <span className="ml-1 font-bold">
                  {apiData?.confidenceScore ?? '—'}/100
                </span>
              </Badge>
            </div>
          </Card>
        )}

        {hasSelectedShop && (
          <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-3">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Revenue forecast
                  </h2>
                  <p className="text-sm text-slate-500">
                    Expected / Best / Worst case totals
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              {([7, 30, 90] as const).map((d) => {
                const t = d === 7 ? revenueTotals.d7 : d === 30 ? revenueTotals.d30 : revenueTotals.d90;
                return (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-900">{d} days</span>
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {currencyFormatter(t.expected)}
                      </span>{' '}
                      <span className="text-slate-500">
                        ({currencyFormatter(t.worst)}–{currencyFormatter(t.best)})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-3">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Orders forecast
                  </h2>
                  <p className="text-sm text-slate-500">
                    Expected / Best / Worst case totals
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              {([7, 30, 90] as const).map((d) => {
                const t = d === 7 ? ordersTotals.d7 : d === 30 ? ordersTotals.d30 : ordersTotals.d90;
                return (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-900">{d} days</span>
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {Math.round(t.expected).toLocaleString()}
                      </span>{' '}
                      <span className="text-slate-500">
                        ({Math.round(t.worst).toLocaleString()}–{Math.round(t.best).toLocaleString()})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-3">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Conversion rate forecast
                  </h2>
                  <p className="text-sm text-slate-500">
                    Expected / Best / Worst case averages
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              {([7, 30, 90] as const).map((d) => {
                const t = d === 7 ? convAvg.d7 : d === 30 ? convAvg.d30 : convAvg.d90;
                return (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-900">{d} days</span>
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {(t.expected * 100).toFixed(2)}%
                      </span>{' '}
                      <span className="text-slate-500">
                        ({(t.worst * 100).toFixed(2)}%–{(t.best * 100).toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-3">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Average order value (AOV) forecast
                  </h2>
                  <p className="text-sm text-slate-500">
                    Expected / Best / Worst case averages
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              {([7, 30, 90] as const).map((d) => {
                const t = d === 7 ? aovAvg.d7 : d === 30 ? aovAvg.d30 : aovAvg.d90;
                return (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-900">{d} days</span>
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {currencyFormatter(t.expected)}
                      </span>{' '}
                      <span className="text-slate-500">
                        ({currencyFormatter(t.worst)}–{currencyFormatter(t.best)})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        )}

        {hasSelectedShop && (
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 p-3">
                <Sparkles className="h-6 w-6 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Debug: daily join table (last 21 days)
                </h2>
                <p className="text-sm text-slate-500">
                  Dev-only. This is the exact dataset used for chart + computations.
                </p>
              </div>
            </div>

            {apiError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {apiError}
              </div>
            ) : apiLoading ? (
              <div className="text-sm text-slate-600">Loading forecast…</div>
            ) : apiData ? (
              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Timezone (canonical)
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {apiData.timezone}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      last30Revenue / last30Orders / last30AOV
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {currencyFormatter(debugLast30.last30Revenue)} /{' '}
                      {Math.round(debugLast30.last30Orders).toLocaleString()} /{' '}
                      {currencyFormatter(debugLast30.last30Aov)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Confidence
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {apiData.confidenceScore}/100
                    </p>
                    {apiData.debugMetrics?.confidence && (
                      <p className="mt-1 text-xs text-slate-500">
                        completeness={apiData.debugMetrics.confidence.completenessFactor.toFixed(2)}
                        {' · '}stability={apiData.debugMetrics.confidence.stabilityFactor.toFixed(2)}
                        {' · '}sample={apiData.debugMetrics.confidence.sampleFactor.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">dateKey</th>
                        <th className="px-4 py-3 font-semibold">shopifyRevenue</th>
                        <th className="px-4 py-3 font-semibold">shopifyOrders</th>
                        <th className="px-4 py-3 font-semibold">gaSessions</th>
                        <th className="px-4 py-3 font-semibold">computedAOV</th>
                        <th className="px-4 py-3 font-semibold">computedCVR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {debugLast21.map((row) => (
                        <tr key={row.date} className="text-slate-700">
                          <td className="px-4 py-3 font-mono">{row.date}</td>
                          <td className="px-4 py-3">
                            {currencyFormatter(row.revenue)}
                          </td>
                          <td className="px-4 py-3">
                            {row.orders.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {row.sessions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {currencyFormatter(row.aov)}
                          </td>
                          <td className="px-4 py-3">
                            {row.cvr == null ? '—' : `${(row.cvr * 100).toFixed(2)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <details className="rounded-2xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Show first 7 forecast points (debug)
                  </summary>
                  <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
{JSON.stringify(
  {
    first7Forecast: apiData.debugMetrics?.first7Forecast,
    drivers: {
      sessionsMA7: apiData.debugMetrics?.sessionsMA7,
      sessionsSlope14: apiData.debugMetrics?.sessionsSlope14,
      cvrBaseline: apiData.debugMetrics?.cvrBaseline,
      aovBaseline: apiData.debugMetrics?.aovBaseline,
      volatilityK: apiData.debugMetrics?.volatilityK,
      meta: apiData.debugMetrics?.meta,
    },
  },
  null,
  2,
)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                Debug metrics are available in development mode.
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}

export default function PredictiveInsightsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-slate-600">Loading predictive insights…</p>
          </div>
        </main>
      }
    >
      <PredictiveInsightsInner />
    </Suspense>
  );
}

