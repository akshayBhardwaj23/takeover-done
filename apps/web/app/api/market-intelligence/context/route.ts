import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { decryptSecure } from '@ai-ecom/api';
import { computeScenario, defaultScenarioConfig } from '../../../../lib/what-if/scenario';

import {
  buildCompetitionSignals,
  buildDemandIndex,
  buildMarketAdjustedForecast,
  buildPricingPressure,
  buildRecommendations,
  buildStoreVsMarket,
  buildTrendDrivers,
  buildBuyerIntent,
  pctChange,
} from '../../../../lib/market-intelligence/compute';
import type {
  MarketIntelligenceContext,
  InventoryInsight,
  NextBestAction,
  RiskAlert,
  ScenarioSuggestion,
} from '../../../../lib/market-intelligence/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

function parseTrendsJson(text: string): any | null {
  // Google Trends responses usually start with `)]}',`
  const cleaned = text.replace(/^\)\]\}',?\s*/g, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function makeDateKeyFormatter(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return (date: Date) => {
    const parts = fmt.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  };
}

async function fetchGoogleTrendsSeries(args: {
  keyword: string;
  geo: string; // e.g. 'US' or '' for worldwide
  time: string; // e.g. 'today 3-m'
}): Promise<Array<{ date: string; value: number }>> {
  try {
    const exploreUrl = new URL('https://trends.google.com/trends/api/explore');
    exploreUrl.searchParams.set('hl', 'en-US');
    exploreUrl.searchParams.set('tz', '0');
    exploreUrl.searchParams.set(
      'req',
      JSON.stringify({
        comparisonItem: [{ keyword: args.keyword, geo: args.geo, time: args.time }],
        category: 0,
        property: '',
      }),
    );

    const exploreRes = await fetch(exploreUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (MarketIntelligenceBot)' },
    });
    if (!exploreRes.ok) return [];
    const exploreText = await exploreRes.text();
    const exploreJson = parseTrendsJson(exploreText);
    const widgets: any[] = Array.isArray(exploreJson?.widgets) ? exploreJson.widgets : [];
    const tsWidget = widgets.find((w) => String(w?.id || '').toUpperCase().includes('TIMESERIES'));
    if (!tsWidget?.token || !tsWidget?.request) return [];

    const multilineUrl = new URL('https://trends.google.com/trends/api/widgetdata/multiline');
    multilineUrl.searchParams.set('hl', 'en-US');
    multilineUrl.searchParams.set('tz', '0');
    multilineUrl.searchParams.set('req', JSON.stringify(tsWidget.request));
    multilineUrl.searchParams.set('token', String(tsWidget.token));

    const mlRes = await fetch(multilineUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (MarketIntelligenceBot)' },
    });
    if (!mlRes.ok) return [];
    const mlText = await mlRes.text();
    const mlJson = parseTrendsJson(mlText);
    const timeline: any[] = Array.isArray(mlJson?.default?.timelineData)
      ? mlJson.default.timelineData
      : [];

    // timelineData: { time: "170..."; value: [<number>] }
    const points = timeline
      .map((p) => {
        const t = parseInt(String(p?.time || ''), 10);
        const v = Array.isArray(p?.value) ? Number(p.value[0]) : Number(p?.value);
        if (!Number.isFinite(t) || !Number.isFinite(v)) return null;
        const d = new Date(t * 1000);
        const date = d.toISOString().slice(0, 10);
        return { date, value: v };
      })
      .filter((p): p is { date: string; value: number } => !!p && p.date.length === 10);

    return points;
  } catch {
    return [];
  }
}

function sumWindow(values: number[], startIdx: number, len: number): number {
  const slice = values.slice(startIdx, startIdx + len);
  return slice.reduce((s, v) => s + v, 0);
}

function pctChangeLastWindow(values: number[], window: number): number | null {
  if (values.length < window * 2) return null;
  const cur = sumWindow(values, values.length - window, window);
  const prev = sumWindow(values, values.length - window * 2, window);
  return pctChange(cur, prev);
}

function alignToDateKeys(args: {
  dateKeys: string[];
  series: Array<{ date: string; value: number }>;
}): Array<number | null> {
  const map = new Map<string, number>();
  for (const p of args.series) map.set(p.date, p.value);
  return args.dateKeys.map((d) => (map.has(d) ? map.get(d)! : null));
}

function weightedAverageAlignedSeries(args: {
  dateKeys: string[];
  alignedSeries: Array<Array<number | null>>;
  weights: number[];
}): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < args.dateKeys.length; i++) {
    let num = 0;
    let den = 0;
    for (let j = 0; j < args.alignedSeries.length; j++) {
      const v = args.alignedSeries[j]?.[i];
      const w = args.weights[j] ?? 0;
      if (typeof v === 'number' && Number.isFinite(v) && w > 0) {
        num += v * w;
        den += w;
      }
    }
    out.push(den > 0 ? num / den : null);
  }
  return out;
}

function indexTo100(values: Array<number | null>) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const base = nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
  return values.map((v) => (v == null ? null : base > 0 ? (100 * v) / base : 0));
}

export async function GET(req: NextRequest) {
  let stage = 'start';
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    'unknown';
  const baseHeaders: Record<string, string> = {
    'cache-control': 'no-store, max-age=0',
    'x-zyyp-commit': commit,
    vary: 'cookie',
  };
  const json = (body: any, status = 200) =>
    NextResponse.json(body, { status, headers: baseHeaders });
  try {
    stage = 'auth.session';
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return json({ error: 'not authenticated', commit }, 401);
    }

    stage = 'auth.user_lookup';
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return json({ error: 'user not found', commit }, 401);

    stage = 'params';
    const shop = req.nextUrl.searchParams.get('shop') || '';
    const scenarioId = req.nextUrl.searchParams.get('scenarioId') || '';
    const categoryOverride = req.nextUrl.searchParams.get('category') || '';
    const geoModeParam = (req.nextUrl.searchParams.get('geo') || 'top').toLowerCase();
    const geoMode: 'top' | 'global' = geoModeParam === 'global' ? 'global' : 'top';

    // Reuse Predictive Insights endpoint as a truth source for internal metrics.
    stage = 'fetch.predictive_insights';
    const baseUrl = req.nextUrl.origin;
    const piUrl = new URL(`${baseUrl}/api/predictive-insights`);
    piUrl.searchParams.set('days', '120');
    if (shop) piUrl.searchParams.set('shop', shop);

    const piRes = await fetch(piUrl.toString(), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const piText = await piRes.text().catch(() => '');
    let pi: any = null;
    try {
      pi = piText ? JSON.parse(piText) : null;
    } catch {
      pi = null;
    }
    if (!piRes.ok || !pi) {
      return json(
        {
          error: 'failed to load predictive insights',
          stage,
          commit,
          status: piRes.status,
          detail: pi?.error || piText.slice(0, 300),
        },
        500,
      );
    }

    const shopDomain: string = String(pi?.shop || shop || '');
    const timezone: string = String(pi?.timezone || 'UTC');
    const currency: string = String(pi?.currency || 'USD');
    const today: string = String(pi?.today || new Date().toISOString().slice(0, 10));
    const fmtKey = makeDateKeyFormatter(timezone);

  // Pull store info from Connection metadata (if available).
    const shopifyConnection = shopDomain
    ? await prisma.connection.findFirst({
        where: { userId: user.id, type: 'SHOPIFY' as any, shopDomain },
        select: { id: true, metadata: true },
      })
    : null;
  const meta = (shopifyConnection?.metadata as any) || {};
  const storeName: string | null =
    typeof meta?.storeName === 'string' ? meta.storeName : typeof meta?.name === 'string' ? meta.name : null;
  const category: string | null =
    categoryOverride ||
    (typeof meta?.category === 'string' ? meta.category : null) ||
    (typeof meta?.industry === 'string' ? meta.industry : null) ||
    (typeof meta?.niche === 'string' ? meta.niche : null) ||
    null;

    // Product performance (last ~30 days) from Shopify line items (best-effort).
    stage = 'fetch.products';
    let topProducts: Array<{
      key: string;
      title: string;
      sku: string | null;
      productId: string | null;
      variantId: string | null;
      ordersCount: number;
      quantity: number;
      revenue: number;
    }> = [];
    if (shopifyConnection?.id) {
      try {
        const start = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
        const lineItems = await prisma.orderLineItem.findMany({
          where: {
            order: {
              connectionId: shopifyConnection.id,
              OR: [{ processedAt: { gte: start } }, { processedAt: null, createdAt: { gte: start } }],
            },
          },
          select: {
            title: true,
            quantity: true,
            price: true,
            sku: true,
            variantId: true,
            productId: true,
            orderId: true,
            order: { select: { status: true, name: true, email: true } },
          },
          take: 5000,
        });

        const agg = new Map<
          string,
          {
            key: string;
            title: string;
            sku: string | null;
            productId: string | null;
            variantId: string | null;
            orderIds: Set<string>;
            quantity: number;
            revenue: number;
          }
        >();

        for (const li of lineItems) {
          const status = String(li.order?.status || '').toLowerCase();
          const name = String(li.order?.name || '').toLowerCase();
          const email = String(li.order?.email || '').toLowerCase();
          if (status.includes('cancel') || status.includes('void')) continue;
          if (name.includes('test') || email.includes('example.com')) continue;

          const key = String(li.productId || li.variantId || li.sku || li.title || '').slice(0, 160);
          if (!key) continue;
          const cur = agg.get(key) || {
            key,
            title: li.title,
            sku: li.sku ?? null,
            productId: li.productId ?? null,
            variantId: li.variantId ?? null,
            orderIds: new Set<string>(),
            quantity: 0,
            revenue: 0,
          };
          cur.orderIds.add(li.orderId);
          cur.quantity += Number(li.quantity || 0);
          cur.revenue += (Number(li.price || 0) / 100) * Number(li.quantity || 0);
          agg.set(key, cur);
        }

        topProducts = Array.from(agg.values())
          .map((p) => ({
            key: p.key,
            title: p.title,
            sku: p.sku,
            productId: p.productId,
            variantId: p.variantId,
            ordersCount: p.orderIds.size,
            quantity: p.quantity,
            revenue: Math.round(p.revenue * 100) / 100,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8);
      } catch (e: any) {
        // Do not fail MI if product aggregation fails.
        topProducts = [];
      }
    }

    stage = 'build.actual_series';
    const actualSeries: Array<any> = Array.isArray(pi?.actualSeries) ? pi.actualSeries : [];

  // Build internal session & revenue arrays aligned to actualSeries dates.
  const dateKeys: string[] = actualSeries.map((p) => String(p.date)).filter((d) => d.length === 10);
  const revenueByDay: number[] = actualSeries.map((p) => Number(p.revenue || 0));
  const sessionsByDay: number[] = actualSeries.map((p) => Number(p.sessions || 0));
  const aovByDay: number[] = actualSeries.map((p) => (Number(p.orders || 0) > 0 ? Number(p.aov || 0) : 0));

  const revenuePct7 = pctChangeLastWindow(revenueByDay, 7);
  const revenuePct30 = pctChangeLastWindow(revenueByDay, 30);
  const sessionsPct7 = pctChangeLastWindow(sessionsByDay, 7);
  const sessionsPct30 = pctChangeLastWindow(sessionsByDay, 30);
  const sessionsPct90 = pctChangeLastWindow(sessionsByDay, 90);

  const storeAov30 = (() => {
    const last30 = actualSeries.slice(-30).filter((p) => Number(p.orders || 0) > 0);
    const rev = last30.reduce((s, p) => s + Number(p.revenue || 0), 0);
    const ord = last30.reduce((s, p) => s + Number(p.orders || 0), 0);
    return ord > 0 ? rev / ord : null;
  })();

  const storeAov90Median = (() => {
    const last90 = aovByDay.slice(-90).filter((v) => v > 0);
    if (!last90.length) return null;
    return median(last90);
  })();

  // Volatility proxy (AOV coefficient of variation)
  const aov90 = aovByDay.slice(-90).filter((v) => v > 0);
  const aovMean = mean(aov90);
  const aovStd =
    aov90.length && aovMean > 0
      ? Math.sqrt(mean(aov90.map((v) => (v - aovMean) * (v - aovMean))))
      : null;
  const aovCv = aovStd != null && aovMean > 0 ? aovStd / aovMean : null;

  // Geography: compute store top revenue countries (last ~90 days) from Shopify orders + customer countryCode.
  stage = 'compute.top_countries';
  let topCountries: Array<{ code: string; revenue: number; share: number }> = [];
  let scopeLabel = 'Global';
  try {
    if (shopifyConnection?.id) {
      const startUtc = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);
      const orders = await prisma.order.findMany({
        where: {
          connectionId: shopifyConnection.id,
          OR: [{ processedAt: { gte: startUtc } }, { processedAt: null, createdAt: { gte: startUtc } }],
        },
        select: {
          totalAmount: true,
          status: true,
          name: true,
          email: true,
          customer: { select: { countryCode: true } },
        },
        take: 5000,
      });
      const by = new Map<string, number>();
      let total = 0;
      for (const o of orders) {
        const status = String(o.status || '').toLowerCase();
        const name = String(o.name || '').toLowerCase();
        const email = String(o.email || '').toLowerCase();
        if (status.includes('cancel') || status.includes('void')) continue;
        if (name.includes('test') || email.includes('example.com')) continue;
        const cc = String(o.customer?.countryCode || '').toUpperCase();
        if (!cc || cc === 'NULL') continue;
        const rev = Number(o.totalAmount || 0) / 100;
        by.set(cc, (by.get(cc) || 0) + rev);
        total += rev;
      }
      topCountries = Array.from(by.entries())
        .map(([code, revenue]) => ({ code, revenue, share: total > 0 ? revenue / total : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
    }
  } catch {
    topCountries = [];
  }

  if (geoMode === 'top' && topCountries.length) {
    scopeLabel = topCountries.map((c) => c.code).join(' / ');
  } else {
    scopeLabel = 'Global';
  }

  // External trends (best-effort) scoped by geo.
  const categoryKeyword = category || 'ecommerce';
  stage = 'fetch.google_trends';
  let searchSeries: Array<{ date: string; value: number }> = [];
  let discountSeries: Array<{ date: string; value: number }> = [];
  try {
    if (geoMode === 'global' || !topCountries.length) {
      const [s, d] = await Promise.all([
        fetchGoogleTrendsSeries({ keyword: categoryKeyword, geo: '', time: 'today 3-m' }),
        fetchGoogleTrendsSeries({ keyword: `${categoryKeyword} discount`, geo: '', time: 'today 3-m' }),
      ]);
      searchSeries = s;
      discountSeries = d;
    } else {
      const countries = topCountries.slice(0, 3);
      const weights = countries.map((c) => c.share);
      const results = await Promise.all(
        countries.map((c) =>
          Promise.all([
            fetchGoogleTrendsSeries({ keyword: categoryKeyword, geo: c.code, time: 'today 3-m' }),
            fetchGoogleTrendsSeries({ keyword: `${categoryKeyword} discount`, geo: c.code, time: 'today 3-m' }),
          ]),
        ),
      );
      const searchAlignedBy = results.map((r) => alignToDateKeys({ dateKeys, series: r[0] || [] }));
      const discountAlignedBy = results.map((r) => alignToDateKeys({ dateKeys, series: r[1] || [] }));
      const searchWeighted = weightedAverageAlignedSeries({ dateKeys, alignedSeries: searchAlignedBy, weights });
      const discountWeighted = weightedAverageAlignedSeries({ dateKeys, alignedSeries: discountAlignedBy, weights });
      searchSeries = dateKeys
        .map((d, i) => ({ date: d, value: searchWeighted[i] }))
        .filter((p): p is { date: string; value: number } => typeof p.value === 'number');
      discountSeries = dateKeys
        .map((d, i) => ({ date: d, value: discountWeighted[i] }))
        .filter((p): p is { date: string; value: number } => typeof p.value === 'number');
    }
  } catch {
    searchSeries = [];
    discountSeries = [];
  }

  const searchAligned = searchSeries.length ? alignToDateKeys({ dateKeys, series: searchSeries }) : null;
  const discountAligned = discountSeries.length ? alignToDateKeys({ dateKeys, series: discountSeries }) : null;

  const searchPct7 = searchAligned ? pctChangeLastWindow(searchAligned.map((v) => v ?? 0), 7) : null;
  const searchPct30 = searchAligned ? pctChangeLastWindow(searchAligned.map((v) => v ?? 0), 30) : null;
  const searchPct90 = searchAligned ? pctChangeLastWindow(searchAligned.map((v) => v ?? 0), 90) : null;

  const discountPct30 = discountAligned ? pctChangeLastWindow(discountAligned.map((v) => v ?? 0), 30) : null;

  // Store demand series for overlay and demand index:
  // - For Global: use store daily revenue (from PI actuals).
  // - For Top Countries: use store daily revenue for customers in those countries (if available), else fall back to global.
  stage = 'compute.store_demand_series';
  let storeDemandRaw: Array<number | null> = revenueByDay.map((v) => v);
  if (geoMode === 'top' && topCountries.length && shopifyConnection?.id) {
    try {
      const wanted = new Set(topCountries.map((c) => c.code));
      const startUtc = new Date(Date.now() - 130 * 24 * 60 * 60 * 1000);
      const orders = await prisma.order.findMany({
        where: {
          connectionId: shopifyConnection.id,
          OR: [{ processedAt: { gte: startUtc } }, { processedAt: null, createdAt: { gte: startUtc } }],
          customer: { isNot: null },
        },
        select: {
          totalAmount: true,
          status: true,
          name: true,
          email: true,
          processedAt: true,
          createdAt: true,
          customer: { select: { countryCode: true } },
        },
        take: 8000,
      });
      const revByDay = new Map<string, number>();
      for (const o of orders) {
        const cc = String(o.customer?.countryCode || '').toUpperCase();
        if (!wanted.has(cc)) continue;
        const status = String(o.status || '').toLowerCase();
        const name = String(o.name || '').toLowerCase();
        const email = String(o.email || '').toLowerCase();
        if (status.includes('cancel') || status.includes('void')) continue;
        if (name.includes('test') || email.includes('example.com')) continue;
        const ts = (o.processedAt as Date | null) ?? (o.createdAt as Date);
        const key = fmtKey(ts);
        revByDay.set(key, (revByDay.get(key) || 0) + Number(o.totalAmount || 0) / 100);
      }
      storeDemandRaw = dateKeys.map((d) => revByDay.get(d) ?? 0);
    } catch {
      // fall back to global
      storeDemandRaw = revenueByDay.map((v) => v);
    }
  }
  const storeDemandIndex = indexTo100(storeDemandRaw);

  const demand = buildDemandIndex({
    trafficMomentumPct7d: sessionsPct7,
    trafficMomentumPct30d: sessionsPct30,
    trafficMomentumPct90d: sessionsPct90,
    searchInterestPct7d: searchPct7,
    searchInterestPct30d: searchPct30,
    searchInterestPct90d: searchPct90,
  });

  // Meta signals (best-effort): should NEVER take down the endpoint.
  stage = 'fetch.meta_connection';
  const metaConn = await prisma.connection.findFirst({
    where: { userId: user.id, type: 'META_ADS' as any },
    select: { accessToken: true, metadata: true },
  });
  const metaMeta = (metaConn?.metadata as any) || {};
  const adAccountId: string | null =
    typeof metaMeta?.adAccountId === 'string' ? metaMeta.adAccountId : null;

  let metaAccessToken: string | null = null;
  if (metaConn?.accessToken) {
    try {
      metaAccessToken = decryptSecure(String(metaConn.accessToken));
    } catch {
      metaAccessToken = null;
    }
  }

  let metaDaily: Array<{ date: string; clicks: number; impressions: number; spend: number }> = [];
  let cpcAligned: Array<number | null> | null = null;
  let ctrAligned: Array<number | null> | null = null;
  let cpcPct30: number | null = null;
  let cpcMA7: number | null = null;
  let cpcPrev30: number | null = null;
  let ctrMA7: number | null = null;
  let metaError: string | null = null;

  stage = 'fetch.meta_insights';
  try {
    const fetchMetaDaily = async (): Promise<
      Array<{ date: string; clicks: number; impressions: number; spend: number }>
    > => {
      try {
        if (!adAccountId || !metaAccessToken) return [];
        const url = new URL(
          `https://graph.facebook.com/v21.0/${adAccountId}/insights`,
        );
        url.searchParams.set('fields', 'date_start,clicks,impressions,spend');
        url.searchParams.set('time_increment', '1');
        // Align to last 45 days from todayKey if possible
        const until = today;
        const since = dateKeys.length
          ? dateKeys[Math.max(0, dateKeys.length - 45)]!
          : until;
        url.searchParams.set('time_range[since]', since);
        url.searchParams.set('time_range[until]', until);
        url.searchParams.set('access_token', metaAccessToken);
        const res = await fetch(url.toString());
        if (!res.ok) return [];
        const json = (await res.json()) as any;
        const rows: any[] = Array.isArray(json?.data) ? json.data : [];
        return rows
          .map((r) => ({
            date: String(r.date_start || ''),
            clicks: parseFloat(String(r.clicks || '0')) || 0,
            impressions: parseFloat(String(r.impressions || '0')) || 0,
            spend: parseFloat(String(r.spend || '0')) || 0,
          }))
          .filter((r) => r.date.length === 10);
      } catch {
        return [];
      }
    };

    metaDaily = await fetchMetaDaily();
    const cpcSeries = metaDaily
      .map((r) => ({
        date: r.date,
        value: r.clicks > 0 ? r.spend / r.clicks : 0,
      }))
      .filter((p) => Number.isFinite(p.value));
    const ctrSeries = metaDaily
      .map((r) => ({
        date: r.date,
        value: r.impressions > 0 ? r.clicks / r.impressions : 0,
      }))
      .filter((p) => Number.isFinite(p.value));

    cpcAligned = cpcSeries.length
      ? alignToDateKeys({ dateKeys, series: cpcSeries })
      : null;
    ctrAligned = ctrSeries.length
      ? alignToDateKeys({ dateKeys, series: ctrSeries })
      : null;

    cpcPct30 = cpcAligned
      ? pctChangeLastWindow(cpcAligned.map((v) => v ?? 0), 30)
      : null;
    cpcMA7 = cpcAligned
      ? mean(cpcAligned.slice(-7).filter((v): v is number => typeof v === 'number'))
      : null;
    cpcPrev30 = cpcAligned
      ? mean(
          cpcAligned
            .slice(-60, -30)
            .filter((v): v is number => typeof v === 'number'),
        )
      : null;
    ctrMA7 = ctrAligned
      ? mean(ctrAligned.slice(-7).filter((v): v is number => typeof v === 'number'))
      : null;
  } catch (e: any) {
    metaError = String(e?.message || e);
    metaDaily = [];
    cpcAligned = null;
    ctrAligned = null;
    cpcPct30 = null;
    cpcMA7 = null;
    cpcPrev30 = null;
    ctrMA7 = null;
  }

  const pricing = buildPricingPressure({
    currency,
    storeAov90dMedian: storeAov90Median,
    storeAov30d: storeAov30,
    aovVolatilityCoefVar: aovCv,
    discountInterestPct30d: discountPct30,
  });

  const competition = buildCompetitionSignals({
    cpcPct30d: cpcPct30,
    cpcMA7,
    cpcPrev30,
    ctrMA7,
    demandPct30d: demand.pctChange30d,
    storeSessionsPct30d: sessionsPct30,
  });

  const storeVsMarket = buildStoreVsMarket({
    storeRevenuePct30d: revenuePct30,
    storeSessionsPct30d: sessionsPct30,
    demandPct30d: demand.pctChange30d,
  });

  const buyerIntent = buildBuyerIntent({
    demandDirection: demand.direction,
    discountDirection: pricing.discountPressure.direction,
    paidSaturation: competition.paidSaturation.label,
  });

    // Inventory insight (best-effort): use Shopify inventory levels for top selling variants.
    stage = 'fetch.inventory';
    const inventory: InventoryInsight = (() => {
      const base: InventoryInsight = {
        status: 'Unknown',
        estimatedStockoutDate: null,
        topSkuAtRisk: [],
        confidence: { score: 35, label: 'Low', reasons: ['Inventory data unavailable.'] },
        notes: [],
      };
      return base;
    })();

    // Build variant candidates from recent line items (only those that have variantId).
    const variantCandidates: Array<{ variantId: string; title: string; sku: string | null; units: number }> = [];
    try {
      if (shopifyConnection?.id) {
        const start = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
        const items = await prisma.orderLineItem.findMany({
          where: {
            variantId: { not: null },
            order: {
              connectionId: shopifyConnection.id,
              OR: [{ processedAt: { gte: start } }, { processedAt: null, createdAt: { gte: start } }],
            },
          },
          select: {
            variantId: true,
            title: true,
            sku: true,
            quantity: true,
            order: { select: { status: true, name: true, email: true } },
          },
          take: 5000,
        });

        const agg = new Map<string, { variantId: string; title: string; sku: string | null; units: number }>();
        for (const li of items) {
          const status = String(li.order?.status || '').toLowerCase();
          const name = String(li.order?.name || '').toLowerCase();
          const email = String(li.order?.email || '').toLowerCase();
          if (status.includes('cancel') || status.includes('void')) continue;
          if (name.includes('test') || email.includes('example.com')) continue;

          const vid = String(li.variantId || '').trim();
          if (!vid) continue;
          const cur = agg.get(vid) || {
            variantId: vid,
            title: li.title,
            sku: li.sku ?? null,
            units: 0,
          };
          cur.units += Number(li.quantity || 0);
          agg.set(vid, cur);
        }
        variantCandidates.push(
          ...Array.from(agg.values())
            .sort((a, b) => b.units - a.units)
            .slice(0, 5),
        );
      }
    } catch {
      // ignore
    }

    // If we can, fetch live inventory levels for these variants.
    try {
      if (shopifyConnection?.id && shopDomain && variantCandidates.length) {
        const shopifyConnForInv = await prisma.connection.findFirst({
          where: { id: shopifyConnection.id },
          select: { accessToken: true, shopDomain: true },
        });
        const tokenEnc = shopifyConnForInv?.accessToken ? String(shopifyConnForInv.accessToken) : '';
        const token = tokenEnc ? decryptSecure(tokenEnc) : '';
        if (!token) throw new Error('Missing Shopify access token');

        const variantIds = variantCandidates.map((v) => v.variantId);
        const inventoryItemIds: Array<{ variantId: string; inventoryItemId: string | null }> = [];

        for (const vid of variantIds) {
          try {
            const res = await fetch(`https://${shopDomain}/admin/api/2024-07/variants/${vid}.json`, {
              headers: { 'X-Shopify-Access-Token': token },
              cache: 'no-store',
            });
            if (!res.ok) {
              inventoryItemIds.push({ variantId: vid, inventoryItemId: null });
              continue;
            }
            const json = (await res.json()) as any;
            const invId = json?.variant?.inventory_item_id;
            inventoryItemIds.push({
              variantId: vid,
              inventoryItemId: invId != null ? String(invId) : null,
            });
          } catch {
            inventoryItemIds.push({ variantId: vid, inventoryItemId: null });
          }
        }

        const ids = inventoryItemIds.map((x) => x.inventoryItemId).filter((v): v is string => !!v);
        const availableByInvId = new Map<string, number>();
        if (ids.length) {
          const url = new URL(`https://${shopDomain}/admin/api/2024-07/inventory_levels.json`);
          url.searchParams.set('inventory_item_ids', ids.join(','));
          const res = await fetch(url.toString(), {
            headers: { 'X-Shopify-Access-Token': token },
            cache: 'no-store',
          });
          if (res.ok) {
            const json = (await res.json()) as any;
            const levels: any[] = Array.isArray(json?.inventory_levels) ? json.inventory_levels : [];
            for (const lvl of levels) {
              const invId = lvl?.inventory_item_id != null ? String(lvl.inventory_item_id) : '';
              const avail = Number(lvl?.available ?? 0);
              if (!invId) continue;
              availableByInvId.set(invId, (availableByInvId.get(invId) || 0) + (Number.isFinite(avail) ? avail : 0));
            }
          }
        }

        // Forecast orders/day (next 30 days)
        const forecast: any[] = Array.isArray(pi?.forecastSeries) ? pi.forecastSeries : [];
        const next30 = forecast.slice(0, 30);
        const totalOrders30 = next30.reduce((s, d) => {
          const sessions = d?.sessions;
          const cvr = d?.cvr;
          if (typeof sessions === 'number' && typeof cvr === 'number') return s + sessions * cvr;
          return s;
        }, 0);
        const ordersPerDay = totalOrders30 > 0 ? totalOrders30 / Math.max(1, next30.length) : 0;

        const totalUnits = variantCandidates.reduce((s, v) => s + v.units, 0);
        const todayDateKey = today;
        const toDateKey = (dt: Date) => dt.toISOString().slice(0, 10);

        const atRisk: InventoryInsight['topSkuAtRisk'] = [];
        let earliest: string | null = null;

        for (const v of variantCandidates) {
          const invId = inventoryItemIds.find((x) => x.variantId === v.variantId)?.inventoryItemId || null;
          const available = invId ? (availableByInvId.get(invId) ?? 0) : null;
          const share = totalUnits > 0 ? v.units / totalUnits : 0;
          const unitsPerDay = ordersPerDay > 0 ? ordersPerDay * share : 0;
          const coverDays =
            available != null && unitsPerDay > 0 ? Math.max(0, available / unitsPerDay) : null;
          if (coverDays != null && coverDays < 60) {
            const d = new Date(Date.now() + Math.floor(coverDays) * 24 * 60 * 60 * 1000);
            const dateKey = toDateKey(d);
            if (!earliest || dateKey < earliest) earliest = dateKey;
            atRisk.push({
              title: v.title,
              variantId: v.variantId,
              sku: v.sku,
              estDaysCover: Math.round(coverDays * 10) / 10,
            });
          }
        }

        if (atRisk.length) {
          inventory.status = atRisk.some((x) => (x.estDaysCover ?? 999) < 14) ? 'At risk' : 'At risk';
          inventory.estimatedStockoutDate = earliest;
          inventory.topSkuAtRisk = atRisk.slice(0, 3);
          inventory.confidence = {
            score: 65,
            label: 'Medium',
            reasons: ['Based on current Shopify inventory levels for top-selling variants.'],
          };
          inventory.notes = [
            `Estimated using the last 30 days product mix and the next 30 days forecasted order volume.`,
          ];
        } else {
          inventory.status = ids.length ? 'OK' : 'Unknown';
          inventory.confidence = ids.length
            ? { score: 55, label: 'Medium', reasons: ['Inventory levels fetched for top variants.'] }
            : inventory.confidence;
        }
      }
    } catch (e: any) {
      // Do not fail MI if inventory fetch fails.
      inventory.status = 'Unknown';
      inventory.confidence = { score: 25, label: 'Low', reasons: ['Inventory fetch failed.'] };
      inventory.notes = [String(e?.message || e)];
    }

  const baseForecastTotals: Array<{ horizonDays: 7 | 30 | 90; expected: number; best: number; worst: number }> =
    Array.isArray(pi?.forecastSeries)
      ? ([7, 30, 90] as const).map((h) => {
          const slice = pi.forecastSeries.slice(0, h);
          const expected = slice.reduce((s: number, p: any) => s + Number(p.revenue || 0), 0);
          const best = slice.reduce((s: number, p: any) => s + Number(p.revenueHigh || 0), 0);
          const worst = slice.reduce((s: number, p: any) => s + Number(p.revenueLow || 0), 0);
          return { horizonDays: h, expected, best, worst };
        })
      : [
          { horizonDays: 7, expected: 0, best: 0, worst: 0 },
          { horizonDays: 30, expected: 0, best: 0, worst: 0 },
          { horizonDays: 90, expected: 0, best: 0, worst: 0 },
        ];

  const marketAdjustedForecast = buildMarketAdjustedForecast({
    baseTotals: baseForecastTotals,
    demandPct30d: demand.pctChange30d,
  });

  const drivers = buildTrendDrivers({
    dateKeys,
    sessionsByDay: storeDemandIndex.map((v) => (typeof v === 'number' ? v : null)),
    ...(searchAligned ? { searchInterestByDay: searchAligned } : {}),
    ...(discountAligned ? { discountInterestByDay: discountAligned } : {}),
    ...(cpcAligned ? { cpcByDay: cpcAligned } : {}),
  });

  const recommendations = buildRecommendations({
    demandDirection: demand.direction,
    pricePressure: pricing.pricePressure,
    paidSaturation: competition.paidSaturation.label,
    storeVsMarketLabel: storeVsMarket.label,
  });

    // Next-best actions (Top 3) + risk alerts (explainable, grounded in computed context).
    const actions: NextBestAction[] = [];
    const alerts: RiskAlert[] = [];

    const shopQs = `shop=${encodeURIComponent(shopDomain)}`;
    const piBase = `/predictive-insights?${shopQs}`;
    const miBase = `/market-intelligence?${shopQs}`;

    // Action: run CPC inflation stress test if paid saturation is high
    if (competition.paidSaturation.label === 'High') {
      actions.push({
        id: 'action.paid_efficiency',
        priority: 1,
        title: 'Protect paid efficiency before scaling',
        rationale:
          'CPC inflation suggests paid saturation; scaling budget now can reduce marginal returns.',
        confidence: 'Medium',
        evidence: [
          `Paid saturation: ${competition.paidSaturation.label}`,
          competition.paidSaturation.cpcInflationPct30d != null
            ? `CPC inflation (30d): ${Math.round(competition.paidSaturation.cpcInflationPct30d)}%`
            : 'CPC inflation (30d): unavailable',
        ],
        ctas: [
          {
            label: 'Run CPC stress test in What‑If',
            href:
              `${piBase}&focus=whatif&presetName=${encodeURIComponent('CPC inflation stress test')}` +
              `&miCpcPct=15&miMetaSpendPct=10#what-if-planner`,
          },
          { label: 'Review Advertisements', href: '/advertisements' },
        ],
      });
    }

    // Action: investigate store-specific friction if underperforming market
    if (storeVsMarket.label === 'Store underperforming market') {
      actions.push({
        id: 'action.fix_funnel',
        priority: actions.length ? 2 : 1,
        title: 'Improve conversion to catch up with the market',
        rationale:
          'Your store is trailing category movement; focus on funnel fixes (CVR) before adding more traffic.',
        confidence: 'High',
        evidence: [
          `Store vs market: ${storeVsMarket.label}`,
          storeVsMarket.evidence.storeRevenuePct30d != null
            ? `Store revenue (30d): ${Math.round(storeVsMarket.evidence.storeRevenuePct30d)}%`
            : 'Store revenue (30d): unavailable',
        ],
        ctas: [
          {
            label: 'Simulate CVR uplift in What‑If',
            href:
              `${piBase}&focus=whatif&presetName=${encodeURIComponent('Improve CVR (+5%)')}` +
              `&miCvrPct=5#what-if-planner`,
          },
          { label: 'Open Predictive Insights', href: piBase },
        ],
      });
    }

    // Action: scale a winner product (if we have product-level data)
    if (topProducts.length > 0) {
      const winner = topProducts[0]!;
      actions.push({
        id: 'action.scale_winner_product',
        priority: actions.length >= 2 ? 3 : 2,
        title: `Prioritize ads for: ${winner.title}`,
        rationale:
          'This product is your recent revenue leader; in noisy paid markets, start from proven sellers.',
        confidence: winner.ordersCount >= 15 ? 'Medium' : 'Low',
        evidence: [
          `${winner.title}: ${Math.round(winner.revenue)} revenue, ${winner.ordersCount} orders, ${winner.quantity} units (last 30d).`,
        ],
        ctas: [
          { label: 'Open Advertisements', href: '/advertisements' },
          {
            label: 'Test small budget in What‑If',
            href:
              `${piBase}&focus=whatif&presetName=${encodeURIComponent('Test spend (+10%)')}` +
              `&miMetaSpendPct=10#what-if-planner`,
          },
        ],
      });
    }

    // Action: improve data reliability if forecast confidence is low
    if ((pi?.confidence?.label || 'Low') === 'Low') {
      actions.push({
        id: 'action.improve_data',
        priority: actions.length >= 3 ? 3 : 2,
        title: 'Improve data coverage to raise forecast confidence',
        rationale:
          'Low confidence usually comes from sparse orders, missing GA sessions, or high volatility.',
        confidence: 'Medium',
        evidence: Array.isArray(pi?.confidence?.reasons) ? pi.confidence.reasons.slice(0, 2) : [],
        ctas: [
          { label: 'Connect integrations', href: '/integrations' },
          { label: 'Open Predictive Insights', href: piBase },
        ],
      });
    }

    // Inventory action/alert if at risk
    if (inventory.status === 'At risk') {
      const stockOut = inventory.estimatedStockoutDate;
      actions.push({
        id: 'action.inventory_risk',
        priority: 1,
        title: 'Prevent stockouts on top sellers',
        rationale:
          'At least one top-selling SKU may stock out soon. This can cap revenue regardless of demand or ads.',
        confidence: inventory.confidence.label,
        evidence: [
          ...(inventory.topSkuAtRisk || []).map((x) => `${x.title}: ~${x.estDaysCover ?? '—'} days cover`),
          stockOut ? `Estimated stockout date: ${stockOut}` : 'Estimated stockout date: unavailable',
        ],
        ctas: [
          {
            label: 'Simulate stockout impact in What‑If',
            href:
              `${piBase}&focus=whatif&presetName=${encodeURIComponent('Stockout constraint')}` +
              `${stockOut ? `&miStockOutDate=${encodeURIComponent(stockOut)}` : ''}` +
              `#what-if-planner`,
          },
          { label: 'Open Business Analytics', href: '/shopify-analytics' },
        ],
      });

      alerts.push({
        id: 'risk.inventory_stockout',
        severity: 'High',
        title: 'Risk: potential stockout on a top seller',
        message:
          'If inventory runs out, growth will be capped even if traffic increases.',
        evidence: [
          stockOut ? `Estimated stockout date: ${stockOut}` : 'Estimated stockout date: unavailable',
        ],
        confidence: inventory.confidence.label,
        ctas: [
          {
            label: 'Simulate stockout in What‑If',
            href:
              `${piBase}&focus=whatif&presetName=${encodeURIComponent('Stockout constraint')}` +
              `${stockOut ? `&miStockOutDate=${encodeURIComponent(stockOut)}` : ''}` +
              `#what-if-planner`,
          },
          { label: 'Open Market Intelligence', href: miBase },
        ],
      });
    }

    // Risk alerts
    if (demand.direction === 'Declining' && storeVsMarket.label === 'Store underperforming market') {
      alerts.push({
        id: 'risk.underperforming_in_decline',
        severity: 'High',
        title: 'Risk: underperforming during demand contraction',
        message:
          'When category demand is down and your store trails the market, scaling spend is likely to be inefficient.',
        evidence: [
          demand.pctChange7d != null
            ? `Demand (7d): ${Math.round(demand.pctChange7d)}%`
            : `Demand: ${demand.direction}`,
          `Store vs market: ${storeVsMarket.label}`,
        ],
        confidence: 'Medium',
        ctas: [
          { label: 'Open Market Intelligence', href: miBase },
          {
            label: 'Stress test spend/CPC in What‑If',
            href:
              `${piBase}&focus=whatif&presetName=${encodeURIComponent('CPC inflation stress test')}` +
              `&miCpcPct=15&miMetaSpendPct=10#what-if-planner`,
          },
        ],
      });
    }

    if (competition.paidSaturation.label === 'High' && (competition.paidSaturation.cpcInflationPct30d ?? 0) > 10) {
      alerts.push({
        id: 'risk.cpc_inflation',
        severity: 'Medium',
        title: 'Risk: CPC inflation may reduce marginal ROAS',
        message:
          'CPC is rising; without CVR improvements, paid growth can get expensive quickly.',
        evidence: [
          competition.paidSaturation.cpcInflationPct30d != null
            ? `CPC inflation (30d): ${Math.round(competition.paidSaturation.cpcInflationPct30d)}%`
            : 'CPC inflation (30d): unavailable',
        ],
        confidence: 'Medium',
        ctas: [
          { label: 'Review Advertisements', href: '/advertisements' },
          { label: 'Simulate CVR uplift', href: `${piBase}&focus=whatif&miCvrPct=5#what-if-planner` },
        ],
      });
    }

    if ((pi?.confidence?.label || 'Low') === 'Low') {
      alerts.push({
        id: 'risk.low_confidence',
        severity: 'Medium',
        title: 'Risk: forecast confidence is low',
        message:
          'Treat the forecast as directional. Use What‑If to test conservative and aggressive ranges.',
        evidence: Array.isArray(pi?.confidence?.reasons) ? pi.confidence.reasons.slice(0, 3) : [],
        confidence: 'High',
        ctas: [
          { label: 'Open Predictive Insights', href: piBase },
          { label: 'Connect integrations', href: '/integrations' },
        ],
      });
    }

    // Automated scenario suggestions (small, explainable set)
    stage = 'compute.scenario_suggestions';
    let scenarioSuggestions: ScenarioSuggestion[] = [];
    try {
      const baseDays = Array.isArray(pi?.forecastSeries)
        ? (pi.forecastSeries as any[]).map((d) => ({
            date: String(d.date || ''),
            sessions: typeof d.sessions === 'number' ? d.sessions : null,
            cvr: typeof d.cvr === 'number' ? d.cvr : null,
            aov: Number(d.aov || 0),
            revenue: Number(d.revenue || 0),
            revenueLow: Number(d.revenueLow || 0),
            revenueHigh: Number(d.revenueHigh || 0),
          }))
        : [];

      const k = Number(pi?.driverVolatility?.volatilityK ?? 0.25);
      const drv = {
        sessionsCoefVar: (pi?.driverVolatility?.sessionsCoefVar ?? null) as number | null,
        cvrCoefVar: (pi?.driverVolatility?.cvrCoefVar ?? null) as number | null,
        aovCoefVar: (pi?.driverVolatility?.aovCoefVar ?? 0.8) as number,
      };
      const metaIsConnected = !!metaConn;

      const presets: Array<{ id: string; name: string; why: string; miParams: Record<string, string | number> }> = [
        {
          id: 'suggestion.cvr_uplift',
          name: 'Improve CVR (+5%)',
          why: 'Focuses on conversion efficiency without relying on more traffic.',
          miParams: { miCvrPct: 5, presetName: 'Improve CVR (+5%)', focus: 'whatif' },
        },
        {
          id: 'suggestion.cpc_stress',
          name: 'CPC inflation stress test',
          why: 'Tests resilience if CPC rises while you scale spend.',
          miParams: { miCpcPct: 15, miMetaSpendPct: 10, presetName: 'CPC inflation stress test', focus: 'whatif' },
        },
        {
          id: 'suggestion.scale_spend',
          name: 'Scale spend (+20%)',
          why: 'Simple growth test: more spend with unchanged efficiency.',
          miParams: { miMetaSpendPct: 20, presetName: 'Scale spend (+20%)', focus: 'whatif' },
        },
        {
          id: 'suggestion.aov_test',
          name: 'AOV lift (+5%)',
          why: 'Tests revenue upside via higher AOV (bundles/upsells).',
          miParams: { miAovPct: 5, presetName: 'AOV lift (+5%)', focus: 'whatif' },
        },
      ];

      const evalPreset = (p: (typeof presets)[number]) => {
        const cfg = defaultScenarioConfig();
        const num = (k: string) => {
          const v = p.miParams[k];
          const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
          return Number.isFinite(n) ? n : null;
        };
        const metaSpend = num('miMetaSpendPct');
        const cpc = num('miCpcPct');
        const cvrU = num('miCvrPct');
        const aovU = num('miAovPct');
        if (metaSpend != null) cfg.metaSpendChangePct = metaSpend;
        if (cpc != null) cfg.cpcChangePct = cpc;
        if (cvrU != null) cfg.overallCvrUpliftPct = cvrU;
        if (aovU != null) cfg.aovChangePct = aovU;

        const res = computeScenario({
          base: baseDays,
          config: cfg,
          volatilityK: k,
          driverVolatility: drv,
          metaConnected: metaIsConnected,
        });
        const t30 = res.totals.find((t) => t.horizonDays === 30);
        const t90 = res.totals.find((t) => t.horizonDays === 90);
        const pick = t30?.uplift?.revenuePct != null ? { horizonDays: 30 as const, uplift: t30.uplift.revenuePct } : t90?.uplift?.revenuePct != null ? { horizonDays: 90 as const, uplift: t90.uplift.revenuePct } : null;
        return {
          id: p.id,
          name: p.name,
          why: p.why,
          horizonDays: (pick?.horizonDays ?? 30) as 30 | 90,
          revenueUpliftPct: pick?.uplift ?? null,
          risk: res.risk.label,
          miParams: p.miParams,
        } satisfies ScenarioSuggestion;
      };

      scenarioSuggestions = presets
        .map(evalPreset)
        .sort((a, b) => (b.revenueUpliftPct ?? -999) - (a.revenueUpliftPct ?? -999))
        .slice(0, 3);
    } catch {
      scenarioSuggestions = [];
    }

  const dataGaps: string[] = [];
  if (!searchSeries.length) dataGaps.push('External search-interest (Google Trends) unavailable.');
  if (!discountSeries.length) dataGaps.push('Discount-intent proxy (Google Trends) unavailable.');
  if (metaError) dataGaps.push(`Meta insights unavailable (${metaError}).`);
  else if (!metaDaily.length) dataGaps.push('Meta CPC/CTR trend unavailable (no Meta connection or no data).');

  // Impact on store: conservative mapping from signals to drivers (no invented numbers).
  const impactOnStore: MarketIntelligenceContext['impactOnStore'] = {
    sessionsImpact: {
      direction: demand.direction,
      explanation:
        demand.direction === 'Rising'
          ? 'Category demand tailwind can lift sessions if distribution holds.'
          : demand.direction === 'Declining'
            ? 'Category demand headwind can reduce sessions even with stable spend.'
            : 'No clear demand tailwind/headwind detected.',
    },
    cvrImpact: {
      direction: pricing.discountPressure.direction === 'Rising' ? 'Declining' : 'Stable',
      explanation:
        pricing.discountPressure.direction === 'Rising'
          ? 'Higher discount pressure often means shoppers compare more and convert less without stronger value.'
          : 'No strong price-sensitivity signal detected from discount pressure proxies.',
    },
    aovImpact: {
      direction: pricing.pricePressure === 'High' ? 'Declining' : 'Stable',
      explanation:
        pricing.pricePressure === 'High'
          ? 'If price pressure is high, AOV can compress if discounts increase or shoppers trade down.'
          : 'No strong AOV compression signal detected.',
    },
    forecastConfidenceImpact: {
      direction: pi?.confidence?.label === 'Low' ? 'Declining' : 'Stable',
      explanation:
        pi?.confidence?.label === 'Low'
          ? 'Forecast confidence is already limited; market volatility increases uncertainty.'
          : 'Forecast confidence looks stable given current data coverage.',
    },
  };

    stage = 'fetch.scenario';
    let activeScenario: MarketIntelligenceContext['whatIf']['activeScenario'] = null;
    if (scenarioId) {
      const ev = await prisma.event.findFirst({
        where: { id: scenarioId, type: 'predictive_insights.scenario_saved' },
        select: { id: true, payload: true },
      });
      if (ev) {
        activeScenario = {
          id: ev.id,
          name: String((ev.payload as any)?.name || 'Scenario'),
          outputs: (ev.payload as any)?.outputs,
        };
      }
    }

    stage = 'response';
    const ctx: MarketIntelligenceContext = {
      shop: shopDomain,
      store: {
        shopDomain,
        storeName,
        category,
        timezone,
        currency,
      },
      scope: {
        mode: geoMode,
        label: scopeLabel,
        topCountries,
      } as any,
      products: {
        windowDays: 30,
        topProducts,
      },
      generatedAt: new Date().toISOString(),
      marketPulse: {
        demand,
        pricing,
        competition,
        storeVsMarket,
        buyerIntent,
      },
      drivers,
      actions: actions
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3),
      alerts,
      inventory,
      scenarioSuggestions,
      impactOnStore,
      marketAdjustedForecast,
      predictiveInsights: {
        currency,
        today,
        forecastTotals: baseForecastTotals,
        confidence: {
          score: Number(pi?.confidence?.score || 0),
          label: (pi?.confidence?.label as any) || 'Low',
          reasons: Array.isArray(pi?.confidence?.reasons) ? pi.confidence.reasons : [],
        },
      },
      whatIf: { activeScenario },
      recommendations,
      dataGaps,
    };

    return json(ctx, 200);
  } catch (err: any) {
    console.error('[Market Intelligence] context failed', {
      stage,
      message: err?.message,
      stack: err?.stack,
    });
    return json(
      {
        error: 'market intelligence failed',
        stage,
        commit,
        message: String(err?.message || err),
      },
      500,
    );
  }
}

