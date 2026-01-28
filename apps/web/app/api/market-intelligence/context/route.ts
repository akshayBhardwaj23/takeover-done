import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { decryptSecure } from '@ai-ecom/api';

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
  TrendPoint,
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

  // Pull store info from Connection metadata (if available).
  const shopifyConnection = shopDomain
    ? await prisma.connection.findFirst({
        where: { userId: user.id, type: 'SHOPIFY' as any, shopDomain },
        select: { metadata: true },
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

  // External trends (best-effort). If we can’t fetch, we keep nulls and report data gap.
  const geo = ''; // worldwide (avoid guessing country)
  const categoryKeyword = category || 'ecommerce';
    stage = 'fetch.google_trends';
    const [searchSeries, discountSeries] = await Promise.all([
      fetchGoogleTrendsSeries({ keyword: categoryKeyword, geo, time: 'today 3-m' }),
      fetchGoogleTrendsSeries({ keyword: `${categoryKeyword} discount`, geo, time: 'today 3-m' }),
    ]);

  const searchAligned = searchSeries.length ? alignToDateKeys({ dateKeys, series: searchSeries }) : null;
  const discountAligned = discountSeries.length ? alignToDateKeys({ dateKeys, series: discountSeries }) : null;

  const searchPct7 = searchAligned ? pctChangeLastWindow(searchAligned.map((v) => v ?? 0), 7) : null;
  const searchPct30 = searchAligned ? pctChangeLastWindow(searchAligned.map((v) => v ?? 0), 30) : null;
  const searchPct90 = searchAligned ? pctChangeLastWindow(searchAligned.map((v) => v ?? 0), 90) : null;

  const discountPct30 = discountAligned ? pctChangeLastWindow(discountAligned.map((v) => v ?? 0), 30) : null;

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
    sessionsByDay: sessionsByDay.map((v) => v),
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
      generatedAt: new Date().toISOString(),
      marketPulse: {
        demand,
        pricing,
        competition,
        storeVsMarket,
        buyerIntent,
      },
      drivers,
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

