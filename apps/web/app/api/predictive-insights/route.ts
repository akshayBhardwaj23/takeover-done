import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { decryptSecure } from '@ai-ecom/api';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

type ActualPoint = {
  date: string; // YYYY-MM-DD in chosen timezone
  revenue: number;
  orders: number;
  sessions: number; // 0 if missing
  aov: number; // revenue/orders when orders > 0 else 0
  cvr: number | null; // orders/sessions if sessions > 0 and GA available
};

type ForecastPoint = {
  date: string; // YYYY-MM-DD
  revenue: number;
  revenueLow: number;
  revenueHigh: number;
  sessions: number | null;
  aov: number;
  cvr: number | null;
};

type DebugMetrics = {
  timezone: string;
  last21Days: Array<Pick<ActualPoint, 'date' | 'revenue' | 'orders' | 'sessions' | 'aov' | 'cvr'>>;
  last30Revenue: number;
  last30Orders: number;
  last30Aov: number;
  sessionsMA7: number | null;
  sessionsSlope14: number | null;
  minSessionsFloor: number | null;
  cvrBaseline: number | null;
  aovBaseline: number;
  volatilityK: number;
  confidence?: {
    daysWithShopify: number;
    daysWithGA: number;
    completenessFactor: number;
    stabilityFactor: number;
    sampleFactor: number;
    coefVarRevenue: number;
  };
  meta?: {
    clicksMA7?: number;
    clicksSlope14?: number;
    cpcMA7?: number;
    ctrMA7?: number;
    sessionsNudgePct?: number;
  };
  first7Forecast: ForecastPoint[];
  checkpoints?: {
    day: 7 | 30 | 90;
    date: string;
    sessions: number | null;
    cvr: number | null;
    aov: number;
    dailyRevenue: number;
    cumRevenue: number;
  }[];
};

type DriverVolatility = {
  sessionsCoefVar: number | null;
  cvrCoefVar: number | null;
  aovCoefVar: number;
  revenueCoefVar: number;
  volatilityK: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((s, v) => s + (v - m) * (v - m), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function fitSlope(values: number[]): number {
  // Least squares slope for x = 0..n-1
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i] ?? 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function makeDateKeyFormatter(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return (d: Date) => fmt.format(d); // en-CA yields YYYY-MM-DD
}

function utcNoonFromDateKey(dateKey: string): Date {
  // dateKey = YYYY-MM-DD
  const [y, m, d] = dateKey.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y!, (m || 1) - 1, d || 1, 12, 0, 0));
}

function addDaysDateKey(dateKey: string, deltaDays: number, timeZone: string): string {
  const fmt = makeDateKeyFormatter(timeZone);
  const d = utcNoonFromDateKey(dateKey);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return fmt(d);
}

function zonedDateTimeToUtcMs(args: {
  year: number;
  month: number;
  day: number;
  hour: number;
  timeZone: string;
}): number {
  // Iterative correction: convert a wall-clock time in `timeZone` into UTC ms.
  const desiredUtc = Date.UTC(args.year, args.month - 1, args.day, args.hour, 0, 0);
  let utc = desiredUtc;
  const partsFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: args.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });

  for (let i = 0; i < 3; i++) {
    const parts = partsFmt.formatToParts(new Date(utc));
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? '0';
    const y = parseInt(get('year'), 10);
    const m = parseInt(get('month'), 10);
    const d = parseInt(get('day'), 10);
    const h = parseInt(get('hour'), 10);
    const asUtc = Date.UTC(y, m - 1, d, h, 0, 0);
    const delta = desiredUtc - asUtc;
    utc += delta;
    if (delta === 0) break;
  }
  return utc;
}

async function refreshGoogleAccessToken(refreshTokenEncrypted: string): Promise<string> {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing Google Analytics OAuth credentials');
  }
  const refreshToken = decryptSecure(refreshTokenEncrypted);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GA token refresh failed: ${text}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function getGAPropertyTimeZone(args: {
  propertyId: string;
  accessToken: string;
}): Promise<string | null> {
  try {
    const res = await fetch(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${args.propertyId}`,
      {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { timeZone?: string | null };
    return typeof json.timeZone === 'string' && json.timeZone.length > 0
      ? json.timeZone
      : null;
  } catch {
    return null;
  }
}

function gaDateToKey(gaDate: string): string {
  // GA date dimension returns YYYYMMDD
  const y = gaDate.slice(0, 4);
  const m = gaDate.slice(4, 6);
  const d = gaDate.slice(6, 8);
  return `${y}-${m}-${d}`;
}

async function fetchGADailySessions(args: {
  propertyId: string;
  accessToken: string;
  startDateKey: string; // YYYY-MM-DD
  endDateKey: string; // YYYY-MM-DD
  storeTimeZone: string;
  gaTimeZone: string | null;
}): Promise<Map<string, number>> {
  const out = new Map<string, number>();

  // If GA timezone equals store timezone, we can use date dimension directly.
  if (args.gaTimeZone && args.gaTimeZone === args.storeTimeZone) {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${args.propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: args.startDateKey, endDate: args.endDateKey }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'sessions' }],
        }),
      },
    );
    if (!res.ok) return out;
    const json = (await res.json()) as {
      rows?: Array<{
        dimensionValues: Array<{ value: string }>;
        metricValues: Array<{ value: string }>;
      }>;
    };
    for (const row of json.rows || []) {
      const dateRaw = row.dimensionValues?.[0]?.value || '';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10) || 0;
      if (dateRaw.length === 8) out.set(gaDateToKey(dateRaw), sessions);
    }
    return out;
  }

  // Otherwise: pull dateHour and re-bucket into store timezone.
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${args.propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: args.startDateKey, endDate: args.endDateKey }],
        dimensions: [{ name: 'dateHour' }],
        metrics: [{ name: 'sessions' }],
        limit: 100000,
      }),
    },
  );
  if (!res.ok) return out;
  const json = (await res.json()) as {
    rows?: Array<{
      dimensionValues: Array<{ value: string }>;
      metricValues: Array<{ value: string }>;
    }>;
  };

  const gaTZ = args.gaTimeZone || 'UTC';
  const storeFmt = makeDateKeyFormatter(args.storeTimeZone);

  for (const row of json.rows || []) {
    const dh = row.dimensionValues?.[0]?.value || '';
    const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10) || 0;
    if (dh.length !== 10) continue; // YYYYMMDDHH
    const y = parseInt(dh.slice(0, 4), 10);
    const m = parseInt(dh.slice(4, 6), 10);
    const d = parseInt(dh.slice(6, 8), 10);
    const h = parseInt(dh.slice(8, 10), 10);
    const utcMs = zonedDateTimeToUtcMs({ year: y, month: m, day: d, hour: h, timeZone: gaTZ });
    const storeKey = storeFmt(new Date(utcMs));
    out.set(storeKey, (out.get(storeKey) || 0) + sessions);
  }

  return out;
}

async function tryFetchShopTimeZone(args: { shopDomain: string; accessToken: string }): Promise<string | null> {
  try {
    const res = await fetch(`https://${args.shopDomain}/admin/api/2024-07/shop.json`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': args.accessToken,
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const tz = json?.shop?.iana_timezone || json?.shop?.timezone;
    return typeof tz === 'string' && tz.length > 0 ? tz : null;
  } catch {
    return null;
  }
}

async function fetchMetaDailyTrend(args: {
  accessToken: string;
  adAccountId: string;
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}): Promise<
  Array<{ date: string; clicks: number; impressions: number; spend: number }>
> {
  try {
    const url = new URL(
      `https://graph.facebook.com/v21.0/${args.adAccountId}/insights`,
    );
    url.searchParams.set('fields', 'date_start,clicks,impressions,spend');
    url.searchParams.set('time_increment', '1');
    url.searchParams.set('time_range[since]', args.since);
    url.searchParams.set('time_range[until]', args.until);
    url.searchParams.set('access_token', args.accessToken);

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: any[] };
    const rows = Array.isArray(json.data) ? json.data : [];
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
}

function weightedAverageRecent(values: number[]): number {
  // Linearly increasing weights: 1..n (more weight to recent)
  const n = values.length;
  if (!n) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const w = i + 1;
    num += (values[i] ?? 0) * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

function buildContinuousDateKeys(args: { endDateKey: string; days: number; timeZone: string }): string[] {
  const keys: string[] = [];
  const start = addDaysDateKey(args.endDateKey, -(args.days - 1), args.timeZone);
  for (let i = 0; i < args.days; i++) {
    keys.push(addDaysDateKey(start, i, args.timeZone));
  }
  return keys;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'user not found' }, { status: 401 });
  }

  const daysParam = parseInt(req.nextUrl.searchParams.get('days') || '90', 10);
  const days = clamp(Number.isFinite(daysParam) ? daysParam : 90, 14, 180);
  const shop = req.nextUrl.searchParams.get('shop') || '';
  const debugEnabled =
    process.env.NODE_ENV === 'development' ||
    req.nextUrl.searchParams.get('debug') === '1';

  const shopifyConnection = shop
    ? await prisma.connection.findFirst({
        where: {
          userId: user.id,
          type: 'SHOPIFY' as any,
          shopDomain: shop,
        },
      })
    : await prisma.connection.findFirst({
        where: {
          userId: user.id,
          type: 'SHOPIFY' as any,
        },
        orderBy: { createdAt: 'asc' },
      });

  if (!shopifyConnection?.shopDomain) {
    return NextResponse.json(
      { error: 'No Shopify store connected' },
      { status: 400 },
    );
  }

  const shopDomain = shopifyConnection.shopDomain;
  const shopifyAccessToken = decryptSecure(shopifyConnection.accessToken);

  // Timezone: store preferred, else UTC
  const existingTz =
    (shopifyConnection.metadata as any)?.timeZone ||
    (shopifyConnection.metadata as any)?.timezone ||
    (shopifyConnection.metadata as any)?.iana_timezone;
  let timeZone: string = typeof existingTz === 'string' && existingTz.length > 0 ? existingTz : 'UTC';

  if (timeZone === 'UTC') {
    const tzFromShop = await tryFetchShopTimeZone({
      shopDomain,
      accessToken: shopifyAccessToken,
    });
    if (tzFromShop) {
      timeZone = tzFromShop;
      // Best-effort persist timezone to metadata
      try {
        const prevMeta = (shopifyConnection.metadata as any) || {};
        await prisma.connection.update({
          where: { id: shopifyConnection.id },
          data: { metadata: { ...prevMeta, timeZone } as any },
        });
      } catch {
        // ignore
      }
    }
  }

  const fmtKey = makeDateKeyFormatter(timeZone);
  const todayKey = fmtKey(new Date());
  const dateKeys = buildContinuousDateKeys({
    endDateKey: todayKey,
    days,
    timeZone,
  });

  const startKey = dateKeys[0]!;
  const endKey = dateKeys[dateKeys.length - 1]!;

  // Convert timeZone day bounds to UTC for DB query.
  const startUtcMs = zonedDateTimeToUtcMs({
    year: parseInt(startKey.slice(0, 4), 10),
    month: parseInt(startKey.slice(5, 7), 10),
    day: parseInt(startKey.slice(8, 10), 10),
    hour: 0,
    timeZone,
  });
  const endExclusiveUtcMs = zonedDateTimeToUtcMs({
    year: parseInt(addDaysDateKey(endKey, 1, timeZone).slice(0, 4), 10),
    month: parseInt(addDaysDateKey(endKey, 1, timeZone).slice(5, 7), 10),
    day: parseInt(addDaysDateKey(endKey, 1, timeZone).slice(8, 10), 10),
    hour: 0,
    timeZone,
  });

  const orders = await prisma.order.findMany({
    where: {
      connectionId: shopifyConnection.id,
      OR: [
        { processedAt: { gte: new Date(startUtcMs), lt: new Date(endExclusiveUtcMs) } },
        { processedAt: null, createdAt: { gte: new Date(startUtcMs), lt: new Date(endExclusiveUtcMs) } },
      ],
    },
    select: {
      createdAt: true,
      processedAt: true,
      totalAmount: true,
      currency: true,
      status: true,
      name: true,
      email: true,
    },
  });

  const revenueByDay = new Map<string, number>();
  const ordersByDay = new Map<string, number>();
  let currency = 'USD';
  if (orders.length > 0) {
    currency = (orders[0]!.currency || 'USD').toUpperCase();
  }

  for (const o of orders) {
    const status = String(o.status || '').toLowerCase();
    const name = String(o.name || '').toLowerCase();
    const email = String(o.email || '').toLowerCase();
    // Exclude cancelled/void/test-ish orders (MVP heuristic).
    if (status.includes('cancel') || status.includes('void')) continue;
    if (name.includes('test') || email.includes('example.com')) continue;

    const ts = (o.processedAt as Date | null) ?? o.createdAt;
    const key = fmtKey(ts);
    revenueByDay.set(key, (revenueByDay.get(key) || 0) + o.totalAmount / 100);
    ordersByDay.set(key, (ordersByDay.get(key) || 0) + 1);
  }

  // GA sessions (optional)
  const gaConnection = await prisma.connection.findFirst({
    where: { userId: user.id, type: 'GOOGLE_ANALYTICS' as any },
  });
  const gaMeta = (gaConnection?.metadata as any) || {};
  const propertyIdRaw = typeof gaMeta.propertyId === 'string' ? gaMeta.propertyId : '';
  const propertyId = propertyIdRaw.replace(/^properties\//, '');

  let gaSessionsByDay: Map<string, number> | null = null;
  let gaFetched = false;
  let gaTimeZone: string | null = null;

  if (gaConnection && propertyId) {
    try {
      const accessToken = gaConnection.refreshToken
        ? await refreshGoogleAccessToken(gaConnection.refreshToken)
        : decryptSecure(gaConnection.accessToken);
      gaTimeZone = await getGAPropertyTimeZone({ propertyId, accessToken });
      gaSessionsByDay = await fetchGADailySessions({
        propertyId,
        accessToken,
        startDateKey: startKey,
        endDateKey: endKey,
        storeTimeZone: timeZone,
        gaTimeZone,
      });
      gaFetched = true;
    } catch {
      gaSessionsByDay = null;
      gaFetched = false;
    }
  }

  const actualSeries: ActualPoint[] = dateKeys.map((date) => {
    const rev = Math.round(((revenueByDay.get(date) || 0) + Number.EPSILON) * 100) / 100;
    const ord = ordersByDay.get(date) || 0;
    const sessions = gaSessionsByDay?.get(date) ?? 0;
    const aov = ord > 0 ? Math.round(((rev / ord) + Number.EPSILON) * 100) / 100 : 0;
    let cvrRaw: number | null = null;
    if (gaFetched && sessions > 0) {
      cvrRaw = ord / sessions;
      if (cvrRaw > 0.5) {
        console.error('[Predictive Insights] CVR scale wrong:', {
          date,
          orders: ord,
          sessions,
          cvrRaw,
        });
      }
    }
    const cvr =
      cvrRaw != null ? clamp(cvrRaw, 0, 0.2) : null;
    return { date, revenue: rev, orders: ord, sessions, aov, cvr };
  });

  // Forecast: tomorrow onward for `days` days.
  const forecastDays = days;
  const futureDates = Array.from({ length: forecastDays }, (_, i) =>
    addDaysDateKey(todayKey, i + 1, timeZone),
  );

  const revenueHist = actualSeries.map((p) => p.revenue);
  const ordersHist = actualSeries.map((p) => p.orders);
  const sessionsHist = actualSeries.map((p) => p.sessions);

  const last7Sessions = sessionsHist.slice(-7);
  const sessionsMA7 = gaFetched ? mean(last7Sessions) : null;
  const sessionsSlope14 = gaFetched ? fitSlope(sessionsHist.slice(-14)) : null;

  // Meta Ads optional modifier (explainable): if clicks trend up/down, nudge sessions forecast slightly.
  const metaConnection = await prisma.connection.findFirst({
    where: { userId: user.id, type: 'META_ADS' as any },
  });
  const metaAdAccountId = (metaConnection as any)?.metadata?.adAccountId as
    | string
    | undefined;
  let sessionsNudgePct = 0;
  let metaDebug:
    | {
        clicksMA7?: number;
        clicksSlope14?: number;
        cpcMA7?: number;
        ctrMA7?: number;
        sessionsNudgePct?: number;
      }
    | undefined;

  if (metaConnection && metaAdAccountId) {
    const metaAccessToken = decryptSecure(metaConnection.accessToken);
    const metaTrend = await fetchMetaDailyTrend({
      accessToken: metaAccessToken,
      adAccountId: metaAdAccountId,
      since: addDaysDateKey(todayKey, -30, timeZone),
      until: todayKey,
    });
    if (metaTrend.length >= 14) {
      const clicksSeries = metaTrend.slice(-14).map((d) => d.clicks);
      const clicksMA7 = mean(clicksSeries.slice(-7));
      const clicksSlope14 = fitSlope(clicksSeries);

      const spendSeries = metaTrend.slice(-7).map((d) => d.spend);
      const clicks7 = metaTrend.slice(-7).map((d) => d.clicks);
      const impressions7 = metaTrend.slice(-7).map((d) => d.impressions);
      const spend7 = spendSeries.reduce((s, v) => s + v, 0);
      const clicks7Total = clicks7.reduce((s, v) => s + v, 0);
      const impressions7Total = impressions7.reduce((s, v) => s + v, 0);

      const cpcMA7 = clicks7Total > 0 ? spend7 / clicks7Total : 0;
      const ctrMA7 = impressions7Total > 0 ? clicks7Total / impressions7Total : 0;

      // Relative click trend per day; keep this small/bounded (MVP).
      const rel = clicksMA7 > 0 ? clicksSlope14 / clicksMA7 : 0;
      sessionsNudgePct = clamp(rel * 1.5, -0.1, 0.1);
      metaDebug = {
        clicksMA7,
        clicksSlope14,
        cpcMA7,
        ctrMA7,
        sessionsNudgePct,
      };
    }
  }

  // AOV baseline: median of last 14 non-zero orders, else last 30 non-zero, else 0.
  const aovNonZero14 = actualSeries
    .slice(-14)
    .filter((p) => p.orders > 0 && p.aov > 0)
    .map((p) => p.aov);
  const aovNonZero30 = actualSeries
    .slice(-30)
    .filter((p) => p.orders > 0 && p.aov > 0)
    .map((p) => p.aov);
  const aovMedian30 = median(aovNonZero30);
  const aovBaselineRaw =
    aovNonZero14.length > 0 ? median(aovNonZero14) : aovMedian30;
  const aovBaseline =
    aovMedian30 > 0
      ? clamp(aovBaselineRaw, aovMedian30 * 0.5, aovMedian30 * 2)
      : Math.max(0, aovBaselineRaw);

  // CVR baseline: weighted average of last 14 cvr values (only days with sessions > 0)
  const cvrValues14 = actualSeries
    .slice(-14)
    .filter((p) => p.cvr != null)
    .map((p) => p.cvr as number);
  const cvrBaseline = gaFetched
    ? clamp(weightedAverageRecent(cvrValues14), 0, 0.2)
    : null;

  // Volatility for band: coefVar on last 30 days revenue.
  const rev30 = revenueHist.slice(-30);
  const revMean = mean(rev30);
  const coefVar = revMean > 0 ? stdev(rev30) / revMean : 1;
  const volatilityK = clamp(coefVar, 0.05, 0.35);

  // Driver volatilities (last 30 days)
  const last30Actual = actualSeries.slice(-30);
  const sessions30 = last30Actual.map((p) => p.sessions);
  const sessions30Mean = mean(sessions30);
  const sessionsCoefVar =
    gaFetched && sessions30Mean > 0 ? stdev(sessions30) / sessions30Mean : null;

  const cvr30 = last30Actual
    .map((p) => p.cvr)
    .filter((v): v is number => typeof v === 'number');
  const cvr30Mean = mean(cvr30);
  const cvrCoefVar =
    gaFetched && cvr30Mean > 0 ? stdev(cvr30) / cvr30Mean : null;

  const aov30 = last30Actual
    .filter((p) => p.orders > 0 && p.aov > 0)
    .map((p) => p.aov);
  const aov30Mean = mean(aov30);
  const aovCoefVar = aov30Mean > 0 ? stdev(aov30) / aov30Mean : 1;

  const driverVolatility: DriverVolatility = {
    sessionsCoefVar: sessionsCoefVar != null ? clamp(sessionsCoefVar, 0, 2) : null,
    cvrCoefVar: cvrCoefVar != null ? clamp(cvrCoefVar, 0, 3) : null,
    aovCoefVar: clamp(aovCoefVar, 0, 3),
    revenueCoefVar: clamp(coefVar, 0, 3),
    volatilityK,
  };

  const forecastSeries: ForecastPoint[] = [];

  if (gaFetched && sessionsMA7 != null && sessionsSlope14 != null && cvrBaseline != null) {
    // Explainable floor: avoid sessions mathematically collapsing to ~0 over long horizons.
    // If MA7 has signal, keep a minimum floor at ~25% of MA7 (>= 1 session).
    const minSessionsFloor =
      sessionsMA7 > 0 ? Math.max(1, Math.round(sessionsMA7 * 0.25)) : 0;
    for (let i = 0; i < futureDates.length; i++) {
      const t = i + 1;
      const sessionsBase = Math.max(0, sessionsMA7 + sessionsSlope14 * t);
      const sessionsAdj = Math.max(0, sessionsBase * (1 + sessionsNudgePct));
      const sessions = Math.max(minSessionsFloor, sessionsAdj);
      const cvr = clamp(cvrBaseline, 0, 0.2);
      const aov = aovBaseline;
      const revenue = sessions * cvr * aov;
      const low = revenue * (1 - volatilityK);
      const high = revenue * (1 + volatilityK);
      forecastSeries.push({
        date: futureDates[i]!,
        revenue: Math.round(revenue * 100) / 100,
        revenueLow: Math.round(low * 100) / 100,
        revenueHigh: Math.round(high * 100) / 100,
        sessions: Math.round(sessions),
        aov: Math.round(aov * 100) / 100,
        cvr,
      });
    }
  } else {
    // Fallback: forecast revenue directly from Shopify revenue (MA7 + slope)
    const ma7 = mean(revenueHist.slice(-7));
    const slope = fitSlope(revenueHist.slice(-14));
    for (let i = 0; i < futureDates.length; i++) {
      const t = i + 1;
      const revenue = Math.max(0, ma7 + slope * t);
      const low = revenue * (1 - volatilityK);
      const high = revenue * (1 + volatilityK);
      forecastSeries.push({
        date: futureDates[i]!,
        revenue: Math.round(revenue * 100) / 100,
        revenueLow: Math.round(low * 100) / 100,
        revenueHigh: Math.round(high * 100) / 100,
        sessions: null,
        aov: aovBaseline,
        cvr: null,
      });
    }
  }

  // Confidence score (0-100)
  const days30 = Math.min(30, actualSeries.length);
  const daysWithShopify = days30; // we always build a continuous series once connected
  const daysWithGA = gaFetched ? days30 : 0;
  const completenessFactor =
    ((daysWithGA / days30) + (daysWithShopify / days30)) / 2;
  // Avoid "0 confidence" just because the series is spiky; keep stability explainable but not binary.
  const stabilityFactor = clamp(1 - clamp(coefVar, 0, 1), 0.15, 1);
  const sampleFactor = clamp(actualSeries.length / 30, 0.3, 1);
  const confidenceScore = clamp(
    Math.round(100 * completenessFactor * stabilityFactor * sampleFactor),
    0,
    100,
  );

  if (confidenceScore === 0 && actualSeries.length > 0) {
    console.warn('[Predictive Insights] Confidence is 0 despite data:', {
      daysWithShopify,
      daysWithGA,
      completenessFactor,
      stabilityFactor,
      sampleFactor,
      coefVarRevenue: coefVar,
    });
  }

  const last30 = actualSeries.slice(-30);
  const last30Revenue = last30.reduce((s, p) => s + p.revenue, 0);
  const last30Orders = last30.reduce((s, p) => s + p.orders, 0);
  const last30Aov = last30Orders > 0 ? last30Revenue / last30Orders : 0;

  const debugMetrics: DebugMetrics | undefined = debugEnabled
    ? {
        timezone: timeZone,
        last21Days: actualSeries.slice(-21),
        last30Revenue: Math.round(last30Revenue * 100) / 100,
        last30Orders,
        last30Aov: Math.round(last30Aov * 100) / 100,
        sessionsMA7,
        sessionsSlope14,
        minSessionsFloor:
          gaFetched && sessionsMA7 != null && sessionsMA7 > 0
            ? Math.max(1, Math.round(sessionsMA7 * 0.25))
            : null,
        cvrBaseline,
        aovBaseline,
        volatilityK,
        confidence: {
          daysWithShopify,
          daysWithGA,
          completenessFactor,
          stabilityFactor,
          sampleFactor,
          coefVarRevenue: coefVar,
        },
        meta: metaDebug,
        first7Forecast: forecastSeries.slice(0, 7),
        checkpoints: ([7, 30, 90] as const).map((day) => {
          const idx = Math.min(day - 1, forecastSeries.length - 1);
          const p = forecastSeries[idx];
          const cum = forecastSeries
            .slice(0, idx + 1)
            .reduce((s, x) => s + x.revenue, 0);
          return {
            day,
            date: p?.date ?? '',
            sessions: p?.sessions ?? null,
            cvr: p?.cvr ?? null,
            aov: p?.aov ?? 0,
            dailyRevenue: p?.revenue ?? 0,
            cumRevenue: Math.round(cum * 100) / 100,
          };
        }),
      }
    : undefined;

  return NextResponse.json({
    shop: shopDomain,
    currency,
    timezone: timeZone,
    today: todayKey,
    actualSeries,
    forecastSeries,
    confidenceScore,
    driverVolatility,
    debugMetrics,
  });
}

