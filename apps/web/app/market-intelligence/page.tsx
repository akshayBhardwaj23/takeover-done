'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Activity,
  Boxes,
  BadgeDollarSign,
  ShieldAlert,
  ChevronRight,
  Gauge,
  Info,
  Package,
  Sparkles,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative ml-2 inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Info"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold text-slate-700 shadow-sm shadow-slate-900/10 ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-7 z-50 w-[260px] -translate-x-1/2 rounded-2xl bg-slate-900 px-3 py-2 text-[11px] font-medium text-white shadow-xl shadow-slate-900/25"
        >
          {props.text}
        </span>
      ) : null}
    </span>
  );
}

function dirArrow(direction: string | null | undefined) {
  const d = String(direction || '').toLowerCase();
  if (d.includes('rise') || d.includes('up') || d.includes('increas')) return '↑';
  if (d.includes('declin') || d.includes('down') || d.includes('decreas')) return '↓';
  return '→';
}

function softCardClassName(extra?: string) {
  return `border-0 bg-white/70 shadow-sm shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/15 ${
    extra || ''
  }`;
}

function useCountUp(args: {
  value: number | null | undefined;
  durationMs?: number;
}) {
  const { value, durationMs = 650 } = args;
  const [out, setOut] = useState<number | null>(value == null ? null : 0);
  const raf = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);
  const toRef = useRef<number>(0);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      setOut(null);
      return;
    }
    if (raf.current != null) cancelAnimationFrame(raf.current);
    startRef.current = performance.now();
    fromRef.current = out ?? 0;
    toRef.current = value;

    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / durationMs);
      // easeOutCubic
      const e = 1 - Math.pow(1 - p, 3);
      const v = fromRef.current + (toRef.current - fromRef.current) * e;
      setOut(v);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return out;
}

function PctValue(props: { value: number | null | undefined }) {
  const v = useCountUp({ value: props.value ?? null });
  if (v == null) return <span>—</span>;
  const r = Math.round(v * 10) / 10;
  return <span>{`${r > 0 ? '+' : ''}${r}%`}</span>;
}

function MoneyValue(props: { value: number | null | undefined; currency: string }) {
  const v = useCountUp({ value: props.value ?? null });
  if (v == null) return <span>—</span>;
  return <span>{formatCurrency(v, props.currency)}</span>;
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

  const primaryAction = Array.isArray(ctx?.actions) && ctx.actions.length ? (ctx.actions as any[])[0] : null;
  const moreActions = Array.isArray(ctx?.actions) ? (ctx.actions as any[]).slice(1) : [];

  const demandDir = String(pulse?.demand?.direction || '').toLowerCase();
  const demandTheme =
    demandDir === 'declining'
      ? {
          icon: TrendingDown,
          bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50',
          ring: 'ring-amber-200/60',
          accent: 'text-amber-700',
        }
      : demandDir === 'rising'
        ? {
            icon: TrendingUp,
            bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50',
            ring: 'ring-emerald-200/60',
            accent: 'text-emerald-700',
          }
        : {
            icon: Activity,
            bg: 'bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50',
            ring: 'ring-sky-200/60',
            accent: 'text-sky-700',
          };

  const priceTheme = {
    icon: BadgeDollarSign,
    bg: 'bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50',
    ring: 'ring-fuchsia-200/60',
    accent: 'text-violet-700',
  };

  const compTheme = {
    icon: Swords,
    bg: 'bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50',
    ring: 'ring-emerald-200/60',
    accent: 'text-emerald-700',
  };

  const DemandIcon = demandTheme.icon;
  const PriceIcon = priceTheme.icon;
  const CompIcon = compTheme.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-28">
        {/* background blobs */}
        <div className="pointer-events-none absolute left-0 top-24 h-[380px] w-[380px] -translate-x-1/3 rounded-full bg-gradient-to-br from-fuchsia-300/20 via-indigo-300/15 to-sky-300/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-48 h-[420px] w-[420px] translate-x-1/3 rounded-full bg-gradient-to-br from-emerald-300/16 via-amber-300/10 to-rose-300/12 blur-3xl" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Market Intelligence</h1>
            <p className="mt-1 text-sm text-slate-600">
              Simple market context to explain what’s happening — and what to do next.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white/70 px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-indigo-900/10"
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
                    <li><span className="font-semibold">Category demand</span>: A signal that estimates whether demand is rising or falling (uses your store trend + Google Trends when available).</li>
                    <li><span className="font-semibold">Discount pressure</span>: A signal for price sensitivity (are shoppers hunting for discounts more than usual?).</li>
                    <li><span className="font-semibold">Paid saturation</span>: A signal for ad competition (often shows up as rising CPC).</li>
                    <li><span className="font-semibold">Market-adjusted forecast</span>: An optional market-based adjustment. We never overwrite your base Predictive Insights forecast.</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {!shop && stores.length > 0 ? (
            <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur">
              Detecting store…
            </div>
          ) : !shop ? (
            <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur">
              Select a shop via Stores → or add ?shop=
            </div>
          ) : null}
          {stores.length > 1 && (
            <select
              className="h-9 rounded-full bg-white/70 px-4 text-sm text-slate-900 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur"
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
              className="h-9 rounded-full bg-white/70 px-4 text-sm text-slate-900 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur"
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
          <Card className={softCardClassName('mt-6 p-6')}>
            <div className="text-sm text-slate-700">
              Open this page with a connected Shopify store selected, e.g.{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">/market-intelligence?shop=your-shop.myshopify.com</code>.
            </div>
          </Card>
        )}

        {shop && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-10">
              {/* Left: main content */}
              <div className="lg:col-span-7">
                <div className="space-y-6">
                  {/* Today’s Focus */}
                  <Card className={softCardClassName('relative overflow-hidden p-6')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-fuchsia-500/10 to-sky-500/10" />
                    <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/25 to-indigo-400/10 blur-2xl" />
                    <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-sky-400/20 to-emerald-400/10 blur-2xl" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-900/20">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Today’s focus
                            </div>
                            <div className="mt-2 text-xl font-semibold text-slate-900">
                              {primaryAction?.title || 'Keep decisions simple today.'}
                            </div>
                            <div className="mt-1 text-sm text-slate-700">
                              {primaryAction?.rationale ||
                                'Use the signals below to decide whether to optimize conversion, protect margin, or scale.'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-900/10 ring-1 ring-slate-900/10 backdrop-blur">
                            Confidence: {primaryAction?.confidence || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {(primaryAction?.ctas || []).slice(0, 2).map((c: any, idx: number) => (
                          <Link
                            key={idx}
                            href={(c.href as any)}
                            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/30"
                          >
                            {c.label}
                            <ChevronRight className="h-4 w-4 opacity-80 transition group-hover:translate-x-0.5" />
                          </Link>
                        ))}
                      </div>

                      {(moreActions.length > 0 || (ctx?.alerts || []).length > 0) && (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {moreActions.length > 0 && (
                            <details className="rounded-2xl bg-white/60 p-4 ring-1 ring-slate-900/5">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                                More actions ({moreActions.length})
                              </summary>
                              <div className="mt-3 space-y-3">
                                {moreActions.slice(0, 5).map((a: any, i: number) => (
                                  <div key={a.id || i} className="rounded-xl bg-white/70 p-3 ring-1 ring-slate-900/5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                                      <span className="rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                        {a.confidence || '—'}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">{a.rationale}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(a.ctas || []).slice(0, 2).map((c: any, j: number) => (
                                        <Link
                                          key={j}
                                          href={(c.href as any)}
                                          className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:bg-white"
                                        >
                                          {c.label}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {(ctx?.alerts || []).length > 0 && (
                            <details className="rounded-2xl bg-white/60 p-4 ring-1 ring-slate-900/5">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                                Risks to watch ({(ctx?.alerts || []).length})
                              </summary>
                              <div className="mt-3 space-y-3">
                                {(ctx.alerts as any[]).slice(0, 4).map((r, i) => (
                                  <div key={r.id || i} className="rounded-xl bg-white/70 p-3 ring-1 ring-slate-900/5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="text-sm font-semibold text-slate-900">{r.title}</div>
                                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                                        {r.severity}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">{r.message}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(r.ctas || []).slice(0, 2).map((c: any, j: number) => (
                                        <Link
                                          key={j}
                                          href={(c.href as any)}
                                          className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:bg-white"
                                        >
                                          {c.label}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Market Signal Strip */}
                  <div className="rounded-3xl bg-gradient-to-r from-white/60 via-white/50 to-white/60 p-5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Market signals</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Quick read — tap or hover the <span className="font-semibold">i</span> to see what each signal means.
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {/* Category demand */}
                      <div className={`relative overflow-hidden rounded-3xl p-4 shadow-lg shadow-amber-900/5 ring-1 ${demandTheme.ring} ${demandTheme.bg}`}>
                        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/40 blur-xl" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center">
                            <div className={`text-xs font-semibold ${demandTheme.accent}`}>
                              {dirArrow(pulse?.demand?.direction)} Category demand
                            </div>
                            <InfoTip text="Is interest in your category going up or down? 7d/30d compares the last window vs the previous window. Best for timing campaigns." />
                          </div>
                          <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                            {pulse?.demand?.confidence?.label || '—'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="flex items-center gap-3 text-xs text-slate-700">
                          <span>
                              7d{' '}
                              <span className="font-semibold text-slate-900">
                                <PctValue value={pulse?.demand?.pctChange7d} />
                              </span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                              30d{' '}
                              <span className="font-semibold text-slate-900">
                                <PctValue value={pulse?.demand?.pctChange30d} />
                              </span>
                          </span>
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-white/60">
                            <DemandIcon className={`h-4 w-4 ${demandTheme.accent}`} />
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-700">
                          <span className="font-semibold">What this means:</span>{' '}
                          {String(pulse?.demand?.direction || '').toLowerCase() === 'declining'
                            ? 'Demand is softer. Improve conversion and offer clarity before you scale spend.'
                            : String(pulse?.demand?.direction || '').toLowerCase() === 'rising'
                              ? 'Demand is picking up. Good time to test new creatives and scale gradually.'
                              : 'Demand is steady. Focus on efficiency (CVR/AOV) so you’re ready to scale.'}
                        </div>
                      </div>

                      {/* Price pressure */}
                      <div className={`relative overflow-hidden rounded-3xl p-4 shadow-lg shadow-indigo-900/5 ring-1 ${priceTheme.ring} ${priceTheme.bg}`}>
                        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/40 blur-xl" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center">
                            <div className={`text-xs font-semibold ${priceTheme.accent}`}>
                              {dirArrow(pulse?.pricing?.discountPressure?.direction)} Price pressure
                            </div>
                            <InfoTip text="Are customers more price-sensitive right now? AOV = Average Order Value (revenue ÷ orders). Higher pressure usually means more comparison shopping." />
                          </div>
                          <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                            {pulse?.pricing?.confidence?.label || '—'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="text-xs text-slate-700">
                            AOV{' '}
                            <span className="font-semibold text-slate-900">
                              <MoneyValue value={pulse?.pricing?.storeAov} currency={currency} />
                            </span>
                          {pulse?.pricing?.marketAovRange?.low != null && pulse?.pricing?.marketAovRange?.high != null ? (
                            <span className="text-slate-500">
                              {' '}
                              (market {formatCurrency(pulse.pricing.marketAovRange.low, currency)}–{formatCurrency(
                                pulse.pricing.marketAovRange.high,
                                currency,
                              )})
                            </span>
                          ) : null}
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-white/60">
                            <PriceIcon className={`h-4 w-4 ${priceTheme.accent}`} />
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-700">
                          <span className="font-semibold">What this means:</span>{' '}
                          {String(pulse?.pricing?.pricePressure || '').toLowerCase() === 'high'
                            ? 'Customers are likely price-sensitive. Lead with value (bundles/benefits) before discounting.'
                            : String(pulse?.pricing?.pricePressure || '').toLowerCase() === 'low'
                              ? 'Price sensitivity looks low. Push bundles and upsells to lift AOV.'
                              : 'Moderate price pressure. Use targeted promos and stronger value messaging.'}
                        </div>
                      </div>

                      {/* Competition */}
                      <div className={`relative overflow-hidden rounded-3xl p-4 shadow-lg shadow-emerald-900/5 ring-1 ${compTheme.ring} ${compTheme.bg}`}>
                        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/40 blur-xl" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center">
                            <div className={`text-xs font-semibold ${compTheme.accent}`}>
                              {dirArrow(pulse?.competition?.paidSaturation?.cpcInflationDirection)} Competition
                            </div>
                            <InfoTip text="How competitive ads look right now. CPC = Cost Per Click. Rising CPC usually means more advertisers are competing for attention." />
                          </div>
                          <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                            {pulse?.buyerIntent?.confidence?.label || '—'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="text-xs text-slate-700">
                            CPC (30d){' '}
                            <span className="font-semibold text-slate-900">
                              <PctValue value={pulse?.competition?.paidSaturation?.cpcInflationPct30d} />
                            </span>
                          <span className="text-slate-500">
                            {' '}
                            ({pulse?.competition?.paidSaturation?.label || '—'})
                          </span>
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-white/60">
                            <CompIcon className={`h-4 w-4 ${compTheme.accent}`} />
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-700">
                          <span className="font-semibold">What this means:</span>{' '}
                          {typeof pulse?.competition?.paidSaturation?.cpcInflationPct30d === 'number' &&
                          pulse.competition.paidSaturation.cpcInflationPct30d > 5
                            ? 'Ads are more expensive. Scale only winners; improve landing conversion first.'
                            : typeof pulse?.competition?.paidSaturation?.cpcInflationPct30d === 'number' &&
                                pulse.competition.paidSaturation.cpcInflationPct30d < -5
                              ? 'Ad costs are easing. You can test scaling, but watch conversion closely.'
                              : 'Competition looks stable. Focus on creative + landing-page efficiency.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Automated scenario suggestions */}
                  {Array.isArray(ctx?.scenarioSuggestions) && ctx.scenarioSuggestions.length > 0 && (
                    <Card className={softCardClassName('p-6')}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Suggested scenarios</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Auto-tested based on your current signals — open any in What‑If to validate upside and risk.
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          Confidence: Medium
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                            <div key={s.id || idx} className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-900/5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-slate-900">{s.name}</div>
                                <span className="rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                  {s.risk}
                                </span>
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
                                  className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:bg-white"
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

                  {/* Existing Market & Demand Intelligence + Impact */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className={softCardClassName('p-6')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    Market & Demand Intelligence
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Combines your store trend with market signals to guide growth decisions.
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
                    tooltip="Shows whether interest is rising or falling, based on your store trend and market signals."
                    scopeLabel={scopeLabel}
                    confidenceLabel={demandConfidence}
                    series={(ctx as any).drivers.demandIndex}
                    variant="demand"
                    latestSuffix=""
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-sky-50 p-5 shadow-xl shadow-indigo-900/10 ring-1 ring-indigo-200/60">
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/50 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-900/20">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900">Demand Index</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Demand index is unavailable because we don’t have enough store trend data for this time window.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-gradient-to-r from-fuchsia-500/10 to-sky-500/10 px-3 py-1 font-semibold text-slate-800 ring-1 ring-slate-900/5">
                    Spikes = short-term interest surges
                  </span>
                  <span className="rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-3 py-1 font-semibold text-slate-800 ring-1 ring-slate-900/5">
                    Best for timing campaigns (not discounting)
                  </span>
                </div>

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
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-amber-50 to-rose-50 p-5 shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-200/60">
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/45 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-500 text-white shadow-lg shadow-emerald-900/20">
                        <Swords className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          Ad Cost Pressure (CPC Trend)
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          CPC trend is unavailable because Meta Ads isn’t connected (or insights couldn’t be loaded).
                        </div>
                      </div>
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
                    tooltip="Compares your store trend vs market interest for the same scope."
                    scopeLabel={scopeLabel}
                    confidenceLabel={overlayConfidence}
                    series={(ctx as any).drivers.demandIndex}
                    secondarySeries={(ctx as any).drivers.searchInterest}
                    secondaryLabel="Market interest"
                    variant="neutral"
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 p-5 shadow-xl shadow-indigo-900/10 ring-1 ring-sky-200/60">
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/45 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-indigo-900/20">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          Market Interest vs Store Demand
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          Market-interest overlay is unavailable because Google Trends couldn’t be loaded for this scope.
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-4 rounded-2xl bg-white/60 p-3 text-xs text-slate-700 ring-1 ring-white/60">
                      Fallback: we still use your store trend and ad-cost signals to guide decisions.
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
                    We still compute your store trend and recommendations — market signals add extra context when available.
                  </div>
                </div>
              )}
                    </Card>

                    <Card className={softCardClassName('p-6')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Impact on your store</div>
                  <div className="mt-1 text-xs text-slate-500">
                    A quick “so what?” view — what market signals likely do to your next week.
                  </div>
                </div>
                <span className="rounded-full bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-900/5">
                  Confidence: {ctx?.predictiveInsights?.confidence?.label || '—'}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 p-4 ring-1 ring-sky-200/60 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/10">
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/45 blur-xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-900/20">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Sessions</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {ctx?.impactOnStore?.sessionsImpact?.explanation || '—'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                      {ctx?.impactOnStore?.sessionsImpact?.direction || '—'}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 p-4 ring-1 ring-emerald-200/60 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/45 blur-xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/20">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">CVR</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {ctx?.impactOnStore?.cvrImpact?.explanation || '—'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                      {ctx?.impactOnStore?.cvrImpact?.direction || '—'}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50 p-4 ring-1 ring-fuchsia-200/60 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-900/10">
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/45 blur-xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-900/20">
                        <BadgeDollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">AOV</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {ctx?.impactOnStore?.aovImpact?.explanation || '—'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                      {ctx?.impactOnStore?.aovImpact?.direction || '—'}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 ring-1 ring-amber-200/60 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-900/10">
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/45 blur-xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-900/20">
                        <Gauge className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Forecast confidence</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {ctx?.impactOnStore?.forecastConfidenceImpact?.explanation || '—'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-white/60">
                      {ctx?.impactOnStore?.forecastConfidenceImpact?.direction || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div
                className={`mt-6 rounded-3xl p-5 ring-1 transition hover:-translate-y-0.5 hover:shadow-xl ${
                  ctx?.inventory?.status === 'At risk'
                    ? 'bg-gradient-to-br from-rose-50 via-amber-50 to-white ring-rose-200/60 hover:shadow-rose-900/10'
                    : ctx?.inventory?.status === 'OK'
                      ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white ring-emerald-200/60 hover:shadow-emerald-900/10'
                      : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50 ring-slate-200/60 hover:shadow-slate-900/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg ${
                        ctx?.inventory?.status === 'At risk'
                          ? 'bg-gradient-to-br from-rose-500 to-amber-500 shadow-rose-900/20'
                          : ctx?.inventory?.status === 'OK'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-900/20'
                            : 'bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-indigo-900/20'
                      }`}
                    >
                      {ctx?.inventory?.status === 'At risk' ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : ctx?.inventory?.status === 'OK' ? (
                        <Package className="h-5 w-5" />
                      ) : (
                        <Boxes className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Inventory risk</div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {ctx?.inventory?.status === 'At risk'
                          ? `Possible stockout around ${ctx?.inventory?.estimatedStockoutDate || '—'}.`
                          : ctx?.inventory?.status === 'OK'
                            ? 'No near-term stockout detected for top-selling variants.'
                            : 'Inventory signal is unavailable for this store.'}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-white/60">
                    {ctx?.inventory?.status || '—'}
                  </span>
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
                    className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-indigo-900/15 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/25"
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
                className="mt-6 scroll-mt-24 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-5 ring-1 ring-indigo-200/60 shadow-lg shadow-indigo-900/5"
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
                    <div key={t.horizonDays} className="rounded-2xl bg-white p-3 ring-1 ring-slate-900/5">
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

                  <Card className={softCardClassName('p-6')}>
              <div className="text-sm font-semibold text-slate-800">Market-aware recommendations</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {(ctx?.recommendations || []).map((r: any, idx: number) => (
                  <div key={idx} className="rounded-2xl bg-white/70 p-5 ring-1 ring-slate-900/5">
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
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:bg-white"
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
                </div>
              </div>

              {/* Right: sticky copilot */}
              <aside className="lg:col-span-3">
                <div className="sticky top-24 h-[calc(100vh-7rem)]">
                  <div className="relative h-full overflow-hidden rounded-3xl border-l border-white/40 bg-gradient-to-b from-indigo-600/10 via-white/45 to-fuchsia-600/10 p-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur">
                    <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-400/20 to-fuchsia-400/10 blur-2xl" />
                    <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/15 to-sky-400/10 blur-2xl" />

                    <div className="relative">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-900/20">
                          <Gauge className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Market Intelligence Copilot</div>
                          <div className="mt-1 text-xs text-slate-600">
                            Ask “why”, “should I”, or “what happens if…”
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 h-[calc(100%-2.25rem)]">
                      <MarketCopilotChat shop={shop} scenarioId={scenarioId || undefined} />
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {loading && (
              <div className="mt-6 text-sm text-slate-600">Loading market intelligence…</div>
            )}
            {error && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MarketIntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50">
          <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-28">
            <Card className={softCardClassName('p-6')}>
              <div className="text-sm text-slate-600">Loading Market Intelligence…</div>
            </Card>
          </div>
        </div>
      }
    >
      <MarketIntelligenceInner />
    </Suspense>
  );
}

