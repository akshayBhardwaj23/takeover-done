'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '../../lib/trpc';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowRight, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  buildForecastBundle,
  generatePredictiveSummary,
  type ForecastPoint,
} from '../../lib/predictive-insights/forecast';
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

function summarizeTotals(points: ForecastPoint[], horizon: 7 | 30 | 90) {
  const slice = points.slice(0, horizon);
  const expected = slice.reduce((s, p) => s + p.expected, 0);
  const best = slice.reduce((s, p) => s + p.best, 0);
  const worst = slice.reduce((s, p) => s + p.worst, 0);
  return { expected, best, worst };
}

function summarizeAverage(points: ForecastPoint[], horizon: 7 | 30 | 90) {
  const slice = points.slice(0, horizon);
  const denom = Math.max(1, slice.length);
  const expected = slice.reduce((s, p) => s + p.expected, 0) / denom;
  const best = slice.reduce((s, p) => s + p.best, 0) / denom;
  const worst = slice.reduce((s, p) => s + p.worst, 0) / denom;
  return { expected, best, worst };
}

function percentChange(last: number, prev: number): number | null {
  if (!isFinite(last) || !isFinite(prev) || prev === 0) return null;
  return ((last - prev) / prev) * 100;
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

  const shopifyStores =
    connections.data?.connections.filter((c: any) => c.type === 'SHOPIFY') || [];
  const gaConnections =
    connections.data?.connections.filter(
      (c: any) => c.type === 'GOOGLE_ANALYTICS',
    ) || [];
  const metaConnection = (connections.data?.connections || []).find(
    (c: any) => c.type === 'META_ADS',
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

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const startDate30 = useMemo(() => {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  }, []);

  const shopSeries = trpc.getShopifySalesSeries.useQuery(
    { shop: selectedShop, days: 30 },
    { enabled: !!selectedShop },
  );

  const gaData = trpc.getGoogleAnalyticsData.useQuery(
    {
      propertyId: selectedPropertyId,
      startDate: startDate30,
      endDate: today,
    },
    {
      enabled: !!selectedPropertyId,
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  );

  const metaAccountId = metaConnection?.metadata?.adAccountId as
    | string
    | undefined;
  const metaInsights = trpc.getMetaAdsInsights.useQuery(
    {
      adAccountId: metaAccountId,
      startDate: startDate30,
      endDate: today,
    },
    {
      enabled: !!metaConnection && !!metaAccountId,
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  if (connections.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
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
      </main>
    );
  }

  if (!selectedShop) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
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
        </div>
      </main>
    );
  }

  const currency = shopSeries.data?.currency || 'USD';
  const currencyFormatter = (n: number) => formatCurrency(n, currency);

  const historyWindowDays = 21;
  const historicalRevenue =
    (shopSeries.data?.series || []).map((p: any) => ({
      date: p.date as string,
      value: Number(p.revenue || 0),
    })) || [];
  const historicalOrders =
    (shopSeries.data?.series || []).map((p: any) => ({
      date: p.date as string,
      value: Number(p.orders || 0),
    })) || [];
  const historicalAov =
    (shopSeries.data?.series || []).map((p: any) => ({
      date: p.date as string,
      value: Number(p.aov || 0),
    })) || [];

  const sessionsByDay =
    (gaData.data?.trend || []).map((d: any) => ({
      date: d.date as string,
      value: Number(d.sessions || 0),
    })) || [];

  const metaTrend = metaInsights.data?.trend || [];
  const metaClicksByDay = metaTrend.map((d: any) => ({
    date: d.date as string,
    value: Number(d.clicks || 0),
  }));
  const metaCtrByDay = metaTrend.map((d: any) => ({
    date: d.date as string,
    value: Number(d.impressions || 0) > 0 ? Number(d.clicks || 0) / Number(d.impressions || 1) : 0,
  }));
  const metaCpcByDay = metaTrend.map((d: any) => ({
    date: d.date as string,
    value: Number(d.clicks || 0) > 0 ? Number(d.spend || 0) / Number(d.clicks || 1) : 0,
  }));

  const bundle = useMemo(() => {
    return buildForecastBundle({
      today,
      currency,
      sessionsByDay,
      shopifyRevenueByDay: historicalRevenue,
      shopifyOrdersByDay: historicalOrders,
      shopifyAovByDay: historicalAov,
      metaClicksByDay: metaClicksByDay.length ? metaClicksByDay : undefined,
      metaCtrByDay: metaCtrByDay.length ? metaCtrByDay : undefined,
      metaCpcByDay: metaCpcByDay.length ? metaCpcByDay : undefined,
      forecastDays: 90,
    });
  }, [
    currency,
    historicalAov,
    historicalOrders,
    historicalRevenue,
    metaClicksByDay,
    metaCpcByDay,
    metaCtrByDay,
    sessionsByDay,
    today,
  ]);

  const metaSummary = useMemo(() => {
    if (!metaTrend || metaTrend.length < 14) return null;
    const last7 = metaTrend.slice(-7);
    const prev7 = metaTrend.slice(-14, -7);
    const sum = (arr: any[], key: string) =>
      arr.reduce((s, d) => s + Number(d[key] || 0), 0);
    const clicksLast = sum(last7, 'clicks');
    const clicksPrev = sum(prev7, 'clicks');
    const spendLast = sum(last7, 'spend');
    const spendPrev = sum(prev7, 'spend');
    const impressionsLast = sum(last7, 'impressions');
    const impressionsPrev = sum(prev7, 'impressions');

    const ctrLast =
      impressionsLast > 0 ? (clicksLast / impressionsLast) * 100 : 0;
    const ctrPrev =
      impressionsPrev > 0 ? (clicksPrev / impressionsPrev) * 100 : 0;
    const cpcLast = clicksLast > 0 ? spendLast / clicksLast : 0;
    const cpcPrev = clicksPrev > 0 ? spendPrev / clicksPrev : 0;

    return {
      clicksTrendPct: percentChange(clicksLast, clicksPrev),
      ctrTrendPct: percentChange(ctrLast, ctrPrev),
      cpcTrendPct: percentChange(cpcLast, cpcPrev),
    };
  }, [metaTrend]);

  const narrative = useMemo(() => {
    return generatePredictiveSummary({
      bundle,
      currencyFormatter,
      meta: metaSummary || undefined,
    });
  }, [bundle, currencyFormatter, metaSummary]);

  const chartHistorical = historicalRevenue.slice(-historyWindowDays);

  const revenueTotals = {
    d7: summarizeTotals(bundle.series.revenue, 7),
    d30: summarizeTotals(bundle.series.revenue, 30),
    d90: summarizeTotals(bundle.series.revenue, 90),
  };
  const ordersTotals = {
    d7: summarizeTotals(bundle.series.orders, 7),
    d30: summarizeTotals(bundle.series.orders, 30),
    d90: summarizeTotals(bundle.series.orders, 90),
  };
  const convAvg = {
    d7: summarizeAverage(bundle.series.conversionRate, 7),
    d30: summarizeAverage(bundle.series.conversionRate, 30),
    d90: summarizeAverage(bundle.series.conversionRate, 90),
  };
  const aovAvg = {
    d7: summarizeAverage(bundle.series.aov, 7),
    d30: summarizeAverage(bundle.series.aov, 30),
    d90: summarizeAverage(bundle.series.aov, 90),
  };

  const gaConnected = gaConnections.length > 0 && !!selectedPropertyId;
  const metaConnected = !!metaConnection && !!metaAccountId;

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
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

        {(!gaConnected || !metaConnected) && (
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

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <ForecastRevenueChart
            title="Sales forecast (next 90 days)"
            subtitle={`Showing last ${historyWindowDays} days only for context. Forecast begins after Today.`}
            today={today}
            currencyFormatter={currencyFormatter}
            historical={chartHistorical}
            forecast={bundle.series.revenue}
          />
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              Revenue is calculated as{' '}
              <span className="font-semibold text-slate-900">
                sessions × conversion rate × AOV
              </span>
              . Past data is included only to anchor the projection.
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
              Confidence score: <span className="ml-1 font-bold">{bundle.confidenceScore}/100</span>
            </Badge>
          </div>
        </Card>

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

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 p-3">
              <Sparkles className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                AI-written summary
              </h2>
              <p className="text-sm text-slate-500">
                What’s likely to happen next, why, and key risks
              </p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Outlook
              </p>
              <p className="mt-2 leading-relaxed">{narrative.outlook}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {narrative.why.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Key risks
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {narrative.risks.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
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

