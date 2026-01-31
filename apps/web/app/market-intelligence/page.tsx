'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { trpc } from '../../lib/trpc';
import { MarketCopilotChat } from './components/MarketCopilotChat';
import { Info } from 'lucide-react';
import { PremiumLineChart } from './components/PremiumLineChart';

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

function InfoTip(props: { text: string }) {
  return (
    <span
      className="ml-2 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700"
      title={props.text}
      aria-label="Info"
    >
      i
    </span>
  );
}

function MarketIntelligenceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopParam = searchParams.get('shop') || '';
  const geoParam = (searchParams.get('geo') || 'top').toLowerCase();
  const geoMode: 'top' | 'global' = geoParam === 'global' ? 'global' : 'top';

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
  const [geo, setGeo] = useState<'top' | 'global'>(geoMode);
  const [scenarioId, setScenarioId] = useState<string>('');
  const [ctx, setCtx] = useState<MarketIntelligenceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

  // Keep local shop state in sync with URL.
  useEffect(() => {
    setShop(shopParam);
    setGeo(geoMode);
  }, [shopParam, geoMode]);

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
        url.searchParams.set('geo', geo);
        const res = await fetch(url.toString());
        const commit = res.headers.get('x-zyyp-commit');
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }
        if (!res.ok) {
          const baseMsg =
            (json && (json.error || json.message)) ||
            (text ? text.slice(0, 200) : '') ||
            'Failed to load market intelligence';
          const stage = json?.stage ? ` (stage: ${String(json.stage)})` : '';
          const detail =
            json?.detail
              ? ` — ${String(json.detail).slice(0, 200)}`
              : json?.message
                ? ` — ${String(json.message).slice(0, 200)}`
                : '';
          const ver = commit ? ` (commit: ${commit.slice(0, 7)})` : '';
          throw new Error(String(baseMsg) + stage + ver + detail);
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
  }, [shop, scenarioId, geo]);

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
  const sessionsMult: number | null =
    typeof marketAdjusted?.modifier?.sessionsMultiplier === 'number'
      ? marketAdjusted.modifier.sessionsMultiplier
      : null;
  const miTrafficPct =
    sessionsMult != null ? Math.round((sessionsMult - 1) * 1000) / 10 : null;

  const scopeLabel = (ctx as any)?.scope?.label || (geo === 'global' ? 'Global' : 'Store top countries');
  const hasSearchInterest =
    Array.isArray((ctx as any)?.drivers?.searchInterest) &&
    (ctx as any).drivers.searchInterest.length > 1;
  const hasCpc =
    Array.isArray((ctx as any)?.drivers?.cpc) && (ctx as any).drivers.cpc.length > 1;

  const demandConfidence: 'High' | 'Medium' | 'Experimental' = hasSearchInterest ? 'Medium' : 'Experimental';
  const cpcConfidence: 'High' | 'Medium' | 'Experimental' = hasCpc ? 'Medium' : 'Experimental';
  const overlayConfidence: 'High' | 'Medium' | 'Experimental' = hasSearchInterest ? 'Medium' : 'Experimental';

  const marketVsStoreInsight = useMemo(() => {
    const store = Array.isArray((ctx as any)?.drivers?.demandIndex) ? (ctx as any).drivers.demandIndex : [];
    const market = Array.isArray((ctx as any)?.drivers?.searchInterest) ? (ctx as any).drivers.searchInterest : [];
    if (store.length < 35 || market.length < 35) {
      return {
        statement:
          'Market interest and store demand comparison is limited due to missing market-interest data.',
        recommendation:
          'Use store demand + paid saturation signals to decide whether to optimize conversion or scale spend.',
      };
    }
    const sNow = store[store.length - 1]!.value;
    const sPrev = store[store.length - 31]!.value;
    const mNow = market[market.length - 1]!.value;
    const mPrev = market[market.length - 31]!.value;
    const sCh = sPrev > 0 ? ((sNow - sPrev) / sPrev) * 100 : 0;
    const mCh = mPrev > 0 ? ((mNow - mPrev) / mPrev) * 100 : 0;
    if (mCh - sCh > 8) {
      return {
        statement:
          'Market interest rose faster than your store demand. This indicates missed capture, not lack of demand.',
        recommendation:
          'Improve landing conversion or product visibility before increasing ad spend.',
      };
    }
    if (sCh - mCh > 8) {
      return {
        statement:
          'Your store demand is rising faster than market interest. You’re capturing demand efficiently.',
        recommendation: 'Consider controlled scaling while monitoring CPC and conversion.',
      };
    }
    return {
      statement:
        'Market interest and store demand are moving in a similar range. This suggests your performance is aligned with demand.',
      recommendation:
        'Use this to time campaigns and focus on efficiency (CVR/AOV) improvements.',
    };
  }, [ctx]);

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
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                aria-label="Glossary"
              >
                <Info className="h-4 w-4" />
                Glossary
              </button>
            </DialogTrigger>
            <DialogContent containerClassName="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Glossary</DialogTitle>
                <DialogDescription>
                  Short definitions for the most common terms on this page.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Core metrics
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li><span className="font-semibold">AOV</span>: Average Order Value (revenue ÷ orders).</li>
                    <li><span className="font-semibold">CVR</span>: Conversion Rate (orders ÷ sessions).</li>
                    <li><span className="font-semibold">CPC</span>: Cost Per Click (spend ÷ clicks).</li>
                    <li><span className="font-semibold">CTR</span>: Click-Through Rate (clicks ÷ impressions).</li>
                    <li><span className="font-semibold">CAC</span>: Customer Acquisition Cost (often approximated as spend ÷ new customers).</li>
                    <li><span className="font-semibold">ROAS</span>: Return on Ad Spend (revenue ÷ ad spend).</li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Market signals
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li><span className="font-semibold">Category demand</span>: A demand proxy based on your traffic momentum, optionally blended with external search interest when available.</li>
                    <li><span className="font-semibold">Discount pressure</span>: A proxy for price sensitivity (higher discount intent often correlates with more comparison shopping).</li>
                    <li><span className="font-semibold">Paid saturation</span>: A proxy for competition in paid channels (often reflected via CPC inflation).</li>
                    <li><span className="font-semibold">Market-adjusted forecast</span>: An optional modifier that adjusts the base forecast; it never overwrites your base Predictive Insights forecast.</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
          {/* Next-best actions + risk alerts */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Today’s top actions</div>
                <Badge variant="secondary">Next-best actions</Badge>
              </div>
              <div className="mt-3 space-y-3">
                {(ctx?.actions || []).length ? (
                  (ctx.actions as any[]).map((a, i) => (
                    <div key={a.id || i} className="rounded-md border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {i + 1}. {a.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">{a.rationale}</div>
                          {Array.isArray(a.evidence) && a.evidence.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                              {a.evidence.slice(0, 3).map((e: string, idx: number) => (
                                <li key={idx}>{e}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <Badge variant="secondary">{a.confidence || '—'}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(a.ctas || []).map((c: any, idx: number) => (
                          <Link
                            key={idx}
                            href={(c.href as any)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-600">No actions available yet.</div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Risk alerts</div>
                <Badge variant="outline">Proactive</Badge>
              </div>
              <div className="mt-3 space-y-3">
                {(ctx?.alerts || []).length ? (
                  (ctx.alerts as any[]).slice(0, 4).map((r, i) => (
                    <div key={r.id || i} className="rounded-md border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900">{r.title}</div>
                        <Badge variant="secondary">{r.severity}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{r.message}</div>
                      {Array.isArray(r.evidence) && r.evidence.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          {r.evidence.slice(0, 2).map((e: string, idx: number) => (
                            <li key={idx}>{e}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(r.ctas || []).slice(0, 2).map((c: any, idx: number) => (
                          <Link
                            key={idx}
                            href={(c.href as any)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-600">No active risks detected.</div>
                )}
              </div>
            </Card>
          </div>

          {/* Automated scenario suggestions */}
          {Array.isArray(ctx?.scenarioSuggestions) && ctx.scenarioSuggestions.length > 0 && (
            <Card className="mt-4 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Suggested scenarios</div>
                <Badge variant="outline">Auto-tested</Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {ctx.scenarioSuggestions.map((s: any, idx: number) => {
                  const qs =
                    `shop=${encodeURIComponent(shop)}` +
                    `&focus=whatif` +
                    `&presetName=${encodeURIComponent(String(s.name || 'Scenario'))}` +
                    (s.miParams?.miMetaSpendPct != null ? `&miMetaSpendPct=${encodeURIComponent(String(s.miParams.miMetaSpendPct))}` : '') +
                    (s.miParams?.miCpcPct != null ? `&miCpcPct=${encodeURIComponent(String(s.miParams.miCpcPct))}` : '') +
                    (s.miParams?.miCvrPct != null ? `&miCvrPct=${encodeURIComponent(String(s.miParams.miCvrPct))}` : '') +
                    (s.miParams?.miAovPct != null ? `&miAovPct=${encodeURIComponent(String(s.miParams.miAovPct))}` : '');
                  const href = `/predictive-insights?${qs}#what-if-planner`;
                  return (
                    <div key={s.id || idx} className="rounded-md border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <Badge variant="secondary">{s.risk}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{s.why}</div>
                      <div className="mt-2 text-xs text-slate-700">
                        Uplift ({s.horizonDays}d):{' '}
                        <span className="font-semibold">
                          {typeof s.revenueUpliftPct === 'number'
                            ? `${s.revenueUpliftPct > 0 ? '+' : ''}${Math.round(s.revenueUpliftPct * 10) / 10}%`
                            : '—'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Link
                          href={(href as any)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Open in What‑If Planner
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-sm font-semibold text-slate-800">Category demand</div>
                  <InfoTip text="Shows whether your product category is getting more or less attention recently. Uses your store momentum plus Google Trends when available. 7d/30d/90d compare the last window vs the previous window." />
                </div>
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
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-900">What this means</div>
                <div className="mt-1 text-xs text-slate-700">
                  {String(pulse?.demand?.direction || '').toLowerCase() === 'declining'
                    ? 'Interest in this category is down right now. Focus on improving conversion (CVR) and increasing order value (AOV) before scaling ad spend.'
                    : String(pulse?.demand?.direction || '').toLowerCase() === 'rising'
                      ? 'Interest in this category is rising. Good time to test new campaigns and creatives — scale gradually and keep an eye on ad costs.'
                      : 'Demand looks steady. Use this period to improve conversion and tighten your offer so you’re ready to scale when demand rises.'}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-sm font-semibold text-slate-800">Price pressure</div>
                  <InfoTip text="Estimates how price-sensitive customers are right now. Uses your AOV (Average Order Value = revenue ÷ orders) and discount-interest signals when available. High pressure means shoppers compare prices more." />
                </div>
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
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-900">What this means</div>
                <div className="mt-1 text-xs text-slate-700">
                  {String(pulse?.pricing?.pricePressure || '').toLowerCase() === 'high'
                    ? 'Shoppers are likely more price-sensitive. Instead of big discounts, lead with value (bundles, guarantees, clear benefits) and improve conversion.'
                    : String(pulse?.pricing?.pricePressure || '').toLowerCase() === 'low'
                      ? 'Customers seem less price-sensitive. This is a good time to push bundles, upsells, and premium positioning to lift AOV.'
                      : 'Some price sensitivity is present. Use targeted promos (not blanket discounts) and strengthen your value messaging on the landing page.'}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-sm font-semibold text-slate-800">Competition</div>
                  <InfoTip text="Estimates how competitive your acquisition channels are. CPC = Cost Per Click. Rising CPC usually means more advertisers competing for the same attention." />
                </div>
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
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-900">What this means</div>
                <div className="mt-1 text-xs text-slate-700">
                  {typeof pulse?.competition?.paidSaturation?.cpcInflationPct30d === 'number' &&
                  pulse.competition.paidSaturation.cpcInflationPct30d > 5
                    ? 'Ads are getting more expensive. Only scale budgets on your highest-converting products, and improve landing conversion before spending more.'
                    : typeof pulse?.competition?.paidSaturation?.cpcInflationPct30d === 'number' &&
                        pulse.competition.paidSaturation.cpcInflationPct30d < -5
                      ? 'Ad costs are easing. You can test scaling, but keep a close eye on conversion rate so growth stays profitable.'
                      : 'Competition looks stable. Focus on creatives, targeting, and landing-page conversion to unlock efficient growth.'}
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    Market & Demand Intelligence
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Combines store momentum with global and regional market signals to guide growth decisions.
                  </div>
                </div>

                {/* Geography selector */}
                <div className="rounded-full bg-white/60 p-1 shadow-sm shadow-slate-900/5 backdrop-blur">
                  <div className="flex items-center gap-1">
                    {(['top', 'global'] as const).map((m) => {
                      const active = geo === m;
                      const label = m === 'top' ? 'Store Top Countries' : 'Global';
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            const nextGeo = m;
                            setGeo(nextGeo);
                            const url = new URL(window.location.href);
                            url.searchParams.set('geo', nextGeo);
                            router.replace(`${url.pathname}?${url.searchParams.toString()}` as any);
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                              : 'text-slate-700 hover:bg-white/60'
                          }`}
                          style={
                            active
                              ? { boxShadow: '0 0 0 1px rgba(15,23,42,0.1), 0 8px 20px rgba(15,23,42,0.12)' }
                              : undefined
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Demand index */}
              <div className="mt-5">
                {Array.isArray((ctx as any)?.drivers?.demandIndex) &&
                (ctx as any).drivers.demandIndex.length > 1 ? (
                  <PremiumLineChart
                    title="Demand Index"
                    tooltip="Measures relative demand momentum based on store velocity and market interest signals."
                    scopeLabel={scopeLabel}
                    confidenceLabel={demandConfidence}
                    series={(ctx as any).drivers.demandIndex}
                    variant="demand"
                    latestSuffix=""
                  />
                ) : (
                  <div className="rounded-2xl bg-white/70 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
                    <div className="text-base font-semibold text-slate-900">Demand Index</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Demand index is unavailable because store momentum data is missing for this window.
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">What this means</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Demand for this category is currently{' '}
                    <span className="font-semibold">
                      {pulse?.demand?.direction?.toLowerCase() || 'stable'}
                    </span>
                    {typeof pulse?.demand?.pctChange7d === 'number'
                      ? ` (${Math.round(pulse.demand.pctChange7d)}% over 7d).`
                      : '.'}{' '}
                    Short spikes often indicate bursts of interest, not sustained growth.
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">How to use this</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Best used for timing campaigns and creative tests — not for deciding deep discounting on its own.
                  </div>
                </div>
              </div>

              {/* CPC trend */}
              <div className="mt-6">
                {hasCpc ? (
                  <PremiumLineChart
                    title="Ad Cost Pressure (CPC Trend)"
                    tooltip="Tracks changes in average cost-per-click to estimate ad competition."
                    scopeLabel={scopeLabel}
                    confidenceLabel={cpcConfidence}
                    series={(ctx as any).drivers.cpc}
                    variant="cpc"
                    latestSuffix=""
                  />
                ) : (
                  <div className="rounded-2xl bg-white/70 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
                    <div className="text-base font-semibold text-slate-900">
                      Ad Cost Pressure (CPC Trend)
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      CPC trend is unavailable because Meta Ads insights are missing or not connected.
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">What this means</div>
                  <div className="mt-1 text-sm text-slate-700">
                    {typeof pulse?.competition?.paidSaturation?.cpcInflationPct30d === 'number'
                      ? `Advertising costs changed by ${Math.round(
                          pulse.competition.paidSaturation.cpcInflationPct30d,
                        )}% over 30 days, indicating ${pulse.competition.paidSaturation.label.toLowerCase()} competition.`
                      : 'Advertising costs can rise during demand spikes, indicating stronger competition.'}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">ZYYP Insight</div>
                  <div className="mt-1 text-sm text-slate-700">
                    During CPC spikes, scale only high-conversion products and test creatives before adding budget.
                  </div>
                </div>
              </div>

              {/* Overlay */}
              <div className="mt-6">
                {Array.isArray((ctx as any)?.drivers?.demandIndex) &&
                (ctx as any).drivers.demandIndex.length > 1 &&
                hasSearchInterest ? (
                  <PremiumLineChart
                    title="Market Interest vs Store Demand"
                    tooltip="Compares your store demand momentum against regional market interest."
                    scopeLabel={scopeLabel}
                    confidenceLabel={overlayConfidence}
                    series={(ctx as any).drivers.demandIndex}
                    secondarySeries={(ctx as any).drivers.searchInterest}
                    secondaryLabel="Market interest"
                    variant="neutral"
                  />
                ) : (
                  <div className="rounded-2xl bg-white/70 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
                    <div className="text-base font-semibold text-slate-900">
                      Market Interest vs Store Demand
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Market-interest overlay is unavailable because Google Trends data couldn’t be fetched for this scope.
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">What this means</div>
                  <div className="mt-1 text-sm text-slate-700">
                    {marketVsStoreInsight.statement}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">ZYYP Recommendation</div>
                  <div className="mt-1 text-sm text-slate-700">
                    {marketVsStoreInsight.recommendation}
                  </div>
                </div>
              </div>

              {Array.isArray(ctx?.dataGaps) && ctx.dataGaps.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Missing data (graceful fallback)</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {ctx.dataGaps.map((g: string, i: number) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                  <div className="mt-2 text-amber-900/80">
                    We still compute store momentum and recommendations — external market signals add extra context when available.
                  </div>
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

              {/* Inventory */}
              <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">Inventory-aware forecasting</div>
                  <Badge variant="secondary">{ctx?.inventory?.status || '—'}</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {ctx?.inventory?.status === 'At risk'
                    ? `Possible stockout around ${ctx?.inventory?.estimatedStockoutDate || '—'}.`
                    : ctx?.inventory?.status === 'OK'
                      ? 'No near-term stockout detected for top-selling variants.'
                      : 'Inventory signal is unavailable for this store.'}
                </div>
                {Array.isArray(ctx?.inventory?.topSkuAtRisk) && ctx.inventory.topSkuAtRisk.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                    {ctx.inventory.topSkuAtRisk.map((x: any, idx: number) => (
                      <li key={idx}>
                        {x.title} {x.estDaysCover != null ? `(~${x.estDaysCover} days cover)` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={
                      (`/predictive-insights?shop=${encodeURIComponent(shop)}&focus=whatif&presetName=${encodeURIComponent(
                        'Stockout constraint',
                      )}${ctx?.inventory?.estimatedStockoutDate ? `&miStockOutDate=${encodeURIComponent(ctx.inventory.estimatedStockoutDate)}` : ''}#what-if-planner` as any)
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Simulate inventory constraint in What‑If
                  </Link>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Confidence: {ctx?.inventory?.confidence?.label || '—'} ({ctx?.inventory?.confidence?.score ?? '—'})
                </div>
              </div>

              <div
                id="market-adjusted"
                className="mt-6 scroll-mt-24 rounded-md border border-slate-200 bg-slate-50 p-4"
              >
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
                    href={
                      (`/predictive-insights?shop=${encodeURIComponent(shop)}&focus=whatif${
                        miTrafficPct != null ? `&miOrganicPct=${encodeURIComponent(String(miTrafficPct))}` : ''
                      }&presetName=${encodeURIComponent('Market-adjusted (demand proxy)')}` as any)
                    }
                    className="text-xs font-semibold text-slate-800 underline hover:text-slate-900"
                  >
                    Create a What‑If scenario from this →
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
                        const isWhatIf = c.type === 'what_if';
                        const focus = isWhatIf && c.focus === 'whatif' ? '&focus=whatif' : '';
                        const presetName = isWhatIf && c.presetName ? `&presetName=${encodeURIComponent(String(c.presetName))}` : '';
                        const miParamsObj: Record<string, string | number> =
                          isWhatIf && c.miParams && typeof c.miParams === 'object' ? c.miParams : {};
                        const miParams = isWhatIf
                          ? Object.entries(miParamsObj)
                              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
                              .join('&')
                          : '';
                        const href = isWhatIf
                          ? `/predictive-insights?shop=${encodeURIComponent(shop)}${focus}${presetName}${
                              miParams ? `&${miParams}` : ''
                            }#what-if-planner`
                          : `/market-intelligence?shop=${encodeURIComponent(shop)}${c.hrefHash || '#market-adjusted'}`;
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

