'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { trpc } from '../../lib/trpc';
import { MiniTrendChart } from './components/MiniTrendChart';
import { MarketCopilotChat } from './components/MarketCopilotChat';

type MarketIntelligenceContext = any;

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? '+' : ''}${r}%`;
}

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

function MarketIntelligenceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopParam = searchParams.get('shop') || '';

  const { data: connectionsData } = trpc.connections.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const stores = useMemo(() => {
    const raw = (connectionsData?.connections as any[]) ?? [];
    return raw
      .filter((c) => c.type === 'SHOPIFY' && c.shopDomain)
      .map((c) => ({
        id: c.id,
        shopDomain: c.shopDomain as string,
        name:
          (c.metadata as any)?.storeName ||
          String(c.shopDomain).replace('.myshopify.com', ''),
      }));
  }, [connectionsData]);

  const [shop, setShop] = useState<string>(shopParam);
  const [scenarioId, setScenarioId] = useState<string>('');
  const [ctx, setCtx] = useState<MarketIntelligenceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

  // Keep local shop state in sync with URL.
  useEffect(() => {
    setShop(shopParam);
  }, [shopParam]);

  // If no shop in URL but user has a connected store, default to the first store.
  useEffect(() => {
    if (shopParam) return;
    if (!stores.length) return;
    const first = stores[0]!.shopDomain;
    router.replace(`/market-intelligence?shop=${encodeURIComponent(first)}` as any);
  }, [router, shopParam, stores]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!shop) return;
      setLoading(true);
      setError('');
      try {
        const url = new URL('/api/market-intelligence/context', window.location.origin);
        url.searchParams.set('shop', shop);
        if (scenarioId) url.searchParams.set('scenarioId', scenarioId);
        const res = await fetch(url.toString());
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }
        if (!res.ok) {
          const msg =
            (json && (json.error || json.message)) ||
            (text ? text.slice(0, 200) : '') ||
            'Failed to load market intelligence';
          throw new Error(String(msg));
        }
        if (!json) throw new Error('Empty response from market intelligence API');
        if (!cancelled) setCtx(json);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shop, scenarioId]);

  useEffect(() => {
    let cancelled = false;
    async function loadScenarios() {
      if (!shop) return;
      try {
        const url = new URL('/api/predictive-insights/scenarios', window.location.origin);
        url.searchParams.set('shop', shop);
        const res = await fetch(url.toString());
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }
        if (!res.ok || !json) return;
        if (!cancelled) setSavedScenarios(Array.isArray(json?.scenarios) ? json.scenarios : []);
      } catch {
        // ignore
      }
    }
    loadScenarios();
    return () => {
      cancelled = true;
    };
  }, [shop]);

  const pulse = ctx?.marketPulse;
  const currency = ctx?.store?.currency || 'USD';

  const marketAdjusted = ctx?.marketAdjustedForecast;
  const baseTotals = ctx?.predictiveInsights?.forecastTotals ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Market Intelligence</h1>
            <Badge variant="secondary">Copilot</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Decision-focused external context explaining store performance, forecasts, and risks.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!shop && stores.length > 0 ? (
            <Badge variant="outline">Detecting store…</Badge>
          ) : !shop ? (
            <Badge variant="outline">Select a shop via Stores → or add ?shop=</Badge>
          ) : (
            <Badge variant="outline">{shop}</Badge>
          )}
          {stores.length > 1 && (
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              value={shop}
              onChange={(e) => {
                const nextShop = e.target.value;
                setScenarioId('');
                router.replace(
                  `/market-intelligence?shop=${encodeURIComponent(nextShop)}` as any,
                );
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.shopDomain}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {savedScenarios.length > 0 && (
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              <option value="">No scenario (base)</option>
              {savedScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.payload?.name as string) || s.name || 'Scenario'}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!shop && (
        <Card className="mt-6 p-5">
          <div className="text-sm text-slate-700">
            Open this page with a connected Shopify store selected, e.g.{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">/market-intelligence?shop=your-shop.myshopify.com</code>
            .
          </div>
        </Card>
      )}

      {shop && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Category demand</div>
                <Badge variant="secondary">{pulse?.demand?.direction || '—'}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                <div>
                  <div className="text-slate-500">7d</div>
                  <div className="font-semibold text-slate-800">{fmtPct(pulse?.demand?.pctChange7d)}</div>
                </div>
                <div>
                  <div className="text-slate-500">30d</div>
                  <div className="font-semibold text-slate-800">{fmtPct(pulse?.demand?.pctChange30d)}</div>
                </div>
                <div>
                  <div className="text-slate-500">90d</div>
                  <div className="font-semibold text-slate-800">{fmtPct(pulse?.demand?.pctChange90d)}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Confidence: {pulse?.demand?.confidence?.label || '—'} ({pulse?.demand?.confidence?.score ?? '—'})
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Price pressure</div>
                <Badge variant="secondary">{pulse?.pricing?.pricePressure || '—'}</Badge>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Store AOV</span>
                  <span className="font-semibold text-slate-800">
                    {pulse?.pricing?.storeAov != null
                      ? formatCurrency(pulse.pricing.storeAov, currency)
                      : '—'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Estimated category range</span>
                  <span className="font-semibold text-slate-800">
                    {pulse?.pricing?.marketAovRange?.low != null && pulse?.pricing?.marketAovRange?.high != null
                      ? `${formatCurrency(pulse.pricing.marketAovRange.low, currency)}–${formatCurrency(
                          pulse.pricing.marketAovRange.high,
                          currency,
                        )}`
                      : '—'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Discount pressure (30d)</span>
                  <span className="font-semibold text-slate-800">
                    {fmtPct(pulse?.pricing?.discountPressure?.pctChange30d)} ({pulse?.pricing?.discountPressure?.direction || '—'})
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Confidence: {pulse?.pricing?.confidence?.label || '—'} ({pulse?.pricing?.confidence?.score ?? '—'})
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Competition</div>
                <Badge variant="secondary">{pulse?.competition?.paidSaturation?.label || '—'}</Badge>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">CPC inflation (30d)</span>
                  <span className="font-semibold text-slate-800">
                    {fmtPct(pulse?.competition?.paidSaturation?.cpcInflationPct30d)} ({pulse?.competition?.paidSaturation?.cpcInflationDirection || '—'})
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Organic reach proxy</span>
                  <span className="font-semibold text-slate-800">
                    {pulse?.competition?.organicReach?.direction || '—'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Store vs market</span>
                  <span className="font-semibold text-slate-800">{pulse?.storeVsMarket?.label || '—'}</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Buyer intent: {pulse?.buyerIntent?.state || '—'} ({pulse?.buyerIntent?.confidence?.label || '—'})
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Internet & market trend drivers</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Demand index is indexed to your observed sessions baseline (with optional external search signals).
                  </div>
                </div>
                {ctx?.store?.category && <Badge variant="outline">{ctx.store.category}</Badge>}
              </div>
              <div className="mt-4">
                <MiniTrendChart
                  title="Demand index"
                  series={ctx?.drivers?.demandIndex || []}
                  secondarySeries={ctx?.drivers?.searchInterest}
                  secondaryLabel="Search interest"
                />
              </div>
              <div className="mt-4">
                <MiniTrendChart
                  title="Discount pressure proxy"
                  series={ctx?.drivers?.discountInterest || []}
                />
              </div>
              <div className="mt-4">
                <MiniTrendChart title="CPC trend" series={ctx?.drivers?.cpc || []} />
              </div>
              {Array.isArray(ctx?.dataGaps) && ctx.dataGaps.length > 0 && (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <div className="font-semibold">Data gaps</div>
                  <ul className="mt-1 list-disc pl-4">
                    {ctx.dataGaps.map((g: string, i: number) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="text-sm font-semibold text-slate-800">Impact on your store</div>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Sessions</div>
                    <Badge variant="secondary">{ctx?.impactOnStore?.sessionsImpact?.direction || '—'}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{ctx?.impactOnStore?.sessionsImpact?.explanation || '—'}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">CVR</div>
                    <Badge variant="secondary">{ctx?.impactOnStore?.cvrImpact?.direction || '—'}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{ctx?.impactOnStore?.cvrImpact?.explanation || '—'}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">AOV</div>
                    <Badge variant="secondary">{ctx?.impactOnStore?.aovImpact?.direction || '—'}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{ctx?.impactOnStore?.aovImpact?.explanation || '—'}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Forecast confidence</div>
                    <Badge variant="secondary">{ctx?.impactOnStore?.forecastConfidenceImpact?.direction || '—'}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{ctx?.impactOnStore?.forecastConfidenceImpact?.explanation || '—'}</div>
                </div>
              </div>

              <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">Market-adjusted forecast (optional)</div>
                  <Badge variant="outline">
                    × {marketAdjusted?.modifier?.sessionsMultiplier ?? '—'} sessions
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-slate-600">{marketAdjusted?.modifier?.reason || '—'}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  {(marketAdjusted?.totals || []).map((t: any) => (
                    <div key={t.horizonDays} className="rounded-md bg-white p-2">
                      <div className="text-slate-500">{t.horizonDays}d</div>
                      <div className="mt-1 font-semibold text-slate-800">
                        {formatCurrency(t.marketAdjustedRevenue, currency)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Δ {formatCurrency(t.deltaRevenue, currency)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Base forecast confidence: {ctx?.predictiveInsights?.confidence?.label || '—'} (
                  {ctx?.predictiveInsights?.confidence?.score ?? '—'})
                </div>
                <div className="mt-2">
                  <Link
                    href={(`/predictive-insights?shop=${encodeURIComponent(shop)}` as any)}
                    className="text-xs font-semibold text-slate-800 underline hover:text-slate-900"
                  >
                    Simulate this in What‑If Planner →
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="text-sm font-semibold text-slate-800">Market-aware recommendations</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {(ctx?.recommendations || []).map((r: any, idx: number) => (
                  <div key={idx} className="rounded-md border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{r.title}</div>
                        <div className="mt-1 text-xs text-slate-600">{r.rationale}</div>
                      </div>
                      <Badge variant="secondary">{r.confidence || '—'}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(r.ctas || []).map((c: any, i: number) => {
                        const href =
                          c.type === 'what_if'
                            ? `/predictive-insights?shop=${encodeURIComponent(shop)}`
                            : `/market-intelligence?shop=${encodeURIComponent(shop)}`;
                        return (
                          <Link
                            key={i}
                            href={(href as any)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {c.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-semibold text-slate-800">Market Intelligence Copilot</div>
              <div className="mt-1 text-xs text-slate-500">
                Answers are grounded in the structured market context above.
              </div>
              <div className="mt-4">
                <MarketCopilotChat shop={shop} scenarioId={scenarioId || undefined} />
              </div>
            </Card>
          </div>

          {loading && (
            <div className="mt-6 text-sm text-slate-600">Loading market intelligence…</div>
          )}
          {error && (
            <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MarketIntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28">
          <Card className="p-5">
            <div className="text-sm text-slate-600">Loading Market Intelligence…</div>
          </Card>
        </div>
      }
    >
      <MarketIntelligenceInner />
    </Suspense>
  );
}

