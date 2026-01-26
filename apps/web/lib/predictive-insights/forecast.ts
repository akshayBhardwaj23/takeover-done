export type DatedValue = { date: string; value: number };

export type ForecastPoint = {
  date: string;
  expected: number;
  best: number;
  worst: number;
};

export type ForecastTotals = {
  horizonDays: 7 | 30 | 90;
  expected: number;
  best: number;
  worst: number;
};

export type DriverSnapshot = {
  sessionsSlopePerDay: number;
  conversionRateSlopePerDay: number;
  aovSlopePerDay: number;
  recentSessionsAvg: number;
  recentConversionRateAvg: number;
  recentAovAvg: number;
};

export type ForecastBundle = {
  currency: string;
  today: string; // YYYY-MM-DD
  confidenceScore: number; // 0-100
  drivers: DriverSnapshot;
  series: {
    revenue: ForecastPoint[];
    orders: ForecastPoint[];
    sessions: ForecastPoint[];
    conversionRate: ForecastPoint[]; // 0..1
    aov: ForecastPoint[];
  };
  totals: {
    revenue: ForecastTotals[];
    orders: ForecastTotals[];
  };
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((s, v) => s + (v - m) * (v - m), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function fitLine(values: number[]): { intercept: number; slope: number } {
  // Least squares fit for x = 0..n-1
  const n = values.length;
  if (n < 2) return { intercept: values[0] ?? 0, slope: 0 };
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
  if (denom === 0) return { intercept: values[0] ?? 0, slope: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { intercept, slope };
}

function addDays(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

function alignByDate(
  dates: string[],
  series: Array<{ date: string; value: number }>,
): number[] {
  const map = new Map(series.map((p) => [p.date, p.value]));
  return dates.map((d) => map.get(d) ?? 0);
}

function computeConfidenceScore(args: {
  hasShopify: boolean;
  hasGA: boolean;
  hasMeta: boolean;
  coverageDays: number;
  volatility: number; // ~0..1 (relative error stdev)
}): number {
  let score = 35;
  if (args.hasShopify) score += 20;
  if (args.hasGA) score += 20;
  if (args.hasMeta) score += 10;
  score += Math.round(clamp(args.coverageDays / 30, 0, 1) * 10);
  score -= Math.round(clamp(args.volatility, 0, 1) * 120);
  return clamp(Math.round(score), 10, 95);
}

function pointwiseForecast(args: {
  dates: string[];
  expected: number[];
  bandPct: number[]; // 0..1
  clampMin?: number;
  clampMax?: number;
}): ForecastPoint[] {
  return args.dates.map((date, i) => {
    const expectedRaw = args.expected[i] ?? 0;
    const expected =
      args.clampMin != null || args.clampMax != null
        ? clamp(
            expectedRaw,
            args.clampMin ?? -Infinity,
            args.clampMax ?? Infinity,
          )
        : expectedRaw;
    const pct = clamp(args.bandPct[i] ?? 0, 0, 10);
    const best = expected * (1 + pct);
    const worst = expected * (1 - pct);
    return { date, expected, best, worst };
  });
}

function totalsForHorizons(
  points: ForecastPoint[],
  horizons: Array<7 | 30 | 90>,
): ForecastTotals[] {
  return horizons.map((horizonDays) => {
    const slice = points.slice(0, horizonDays);
    const expected = slice.reduce((s, p) => s + p.expected, 0);
    const best = slice.reduce((s, p) => s + p.best, 0);
    const worst = slice.reduce((s, p) => s + p.worst, 0);
    return {
      horizonDays,
      expected,
      best,
      worst,
    };
  });
}

export function buildForecastBundle(args: {
  today: string; // YYYY-MM-DD
  currency: string;
  // Short context window inputs (ideally 14–30 days)
  sessionsByDay?: DatedValue[]; // from GA trend
  shopifyRevenueByDay?: DatedValue[]; // from Shopify orders
  shopifyOrdersByDay?: DatedValue[]; // from Shopify orders
  shopifyAovByDay?: DatedValue[]; // from Shopify orders
  // Optional Meta trends (used as an explainable modifier, not a model)
  metaClicksByDay?: DatedValue[];
  metaCtrByDay?: DatedValue[];
  metaCpcByDay?: DatedValue[];
  forecastDays?: number; // default 90
}): ForecastBundle {
  const forecastDays = Math.max(7, Math.min(args.forecastDays ?? 90, 120));

  // Build a canonical date axis from the available short context window.
  const dateSet = new Set<string>();
  for (const s of args.sessionsByDay ?? []) dateSet.add(s.date);
  for (const s of args.shopifyRevenueByDay ?? []) dateSet.add(s.date);
  for (const s of args.shopifyOrdersByDay ?? []) dateSet.add(s.date);
  for (const s of args.shopifyAovByDay ?? []) dateSet.add(s.date);

  // Always include today.
  dateSet.add(args.today);
  const dates = Array.from(dateSet).sort();

  // Keep only the last 30ish days if more were provided.
  const contextDates = dates.slice(-30);

  const sessions = alignByDate(
    contextDates,
    (args.sessionsByDay ?? []).map((p) => ({ date: p.date, value: p.value })),
  );
  const revenue = alignByDate(
    contextDates,
    (args.shopifyRevenueByDay ?? []).map((p) => ({ date: p.date, value: p.value })),
  );
  const orders = alignByDate(
    contextDates,
    (args.shopifyOrdersByDay ?? []).map((p) => ({ date: p.date, value: p.value })),
  );
  const aov = alignByDate(
    contextDates,
    (args.shopifyAovByDay ?? []).map((p) => ({ date: p.date, value: p.value })),
  );

  const hasGA = (args.sessionsByDay ?? []).length > 0;
  const hasShopify =
    (args.shopifyRevenueByDay ?? []).length > 0 ||
    (args.shopifyOrdersByDay ?? []).length > 0;
  const hasMeta = (args.metaClicksByDay ?? []).length > 0;

  // Fallback sessions if GA isn't connected: infer a rough baseline from orders.
  const inferredSessions = orders.map((o) => o * 120); // ~0.8%–1.2% CVR assumption
  const sessionsSeries = hasGA ? sessions : inferredSessions;

  // Conversion rate series (orders / sessions).
  const convRateSeries = sessionsSeries.map((s, i) => {
    const o = orders[i] ?? 0;
    if (s <= 0) return 0;
    return clamp(o / s, 0, 0.25);
  });

  // AOV series fallback.
  const aovSeries = aov.map((v, i) => (v > 0 ? v : orders[i] > 0 ? revenue[i] / Math.max(1, orders[i]) : 0));

  // Recent windows for explainable signals.
  const recentWindow = Math.min(14, contextDates.length);
  const recentSessions = sessionsSeries.slice(-recentWindow);
  const recentConv = convRateSeries.slice(-recentWindow);
  const recentAov = aovSeries.slice(-recentWindow);

  const { slope: sessionsSlopePerDay } = fitLine(recentSessions);
  const { slope: conversionRateSlopePerDay } = fitLine(recentConv);
  const { slope: aovSlopePerDay } = fitLine(recentAov);

  const recentSessionsAvg = mean(sessionsSeries.slice(-7));
  const recentConversionRateAvg = mean(convRateSeries.slice(-7));
  const recentAovAvg = mean(aovSeries.slice(-7));

  // Meta "modifier" (small, bounded): if clicks are trending up/down, nudge sessions.
  let sessionsNudgePct = 0;
  if (hasMeta && (args.metaClicksByDay ?? []).length >= 7) {
    const clicks = (args.metaClicksByDay ?? []).slice(-14).map((p) => p.value);
    const { slope } = fitLine(clicks);
    const base = mean(clicks.slice(-7));
    const rel = base > 0 ? slope / base : 0;
    sessionsNudgePct = clamp(rel * 2, -0.08, 0.08);
  }

  const futureDates = Array.from({ length: forecastDays }, (_, i) =>
    addDays(args.today, i + 1),
  );

  // Forecast each driver with rolling average + slope (bounded).
  const sessionsForecast = futureDates.map((_, i) => {
    const day = i + 1;
    const raw = recentSessionsAvg + sessionsSlopePerDay * day;
    const nudged = raw * (1 + sessionsNudgePct);
    return Math.max(0, nudged);
  });

  const conversionForecast = futureDates.map((_, i) => {
    const day = i + 1;
    const raw = recentConversionRateAvg + conversionRateSlopePerDay * day;
    return clamp(raw, 0, 0.25);
  });

  const aovForecast = futureDates.map((_, i) => {
    const day = i + 1;
    const raw = recentAovAvg + aovSlopePerDay * day;
    return Math.max(0, raw);
  });

  const ordersForecast = futureDates.map(
    (_, i) => sessionsForecast[i] * conversionForecast[i],
  );
  const revenueForecast = futureDates.map(
    (_, i) => ordersForecast[i] * aovForecast[i],
  );

  // Volatility from recent revenue vs the explainable identity (orders * aov).
  const modeledRevenueRecent = orders
    .slice(-recentWindow)
    .map((o, i) => o * (aovSeries.slice(-recentWindow)[i] ?? 0));
  const actualRevenueRecent = revenue.slice(-recentWindow);
  const relErrors = actualRevenueRecent.map((act, i) => {
    const pred = modeledRevenueRecent[i] ?? 0;
    const denom = Math.max(1, pred);
    return (act - pred) / denom;
  });
  const revenueVol = clamp(stdev(relErrors), 0.05, 0.6);

  const sessionsVol = clamp(
    stdev(recentSessions.map((v) => (recentSessionsAvg > 0 ? (v - recentSessionsAvg) / recentSessionsAvg : 0))),
    0.05,
    0.6,
  );
  const convVol = clamp(
    stdev(recentConv.map((v) => (recentConversionRateAvg > 0 ? (v - recentConversionRateAvg) / recentConversionRateAvg : 0))),
    0.05,
    0.8,
  );
  const aovVol = clamp(
    stdev(recentAov.map((v) => (recentAovAvg > 0 ? (v - recentAovAvg) / recentAovAvg : 0))),
    0.05,
    0.8,
  );

  const bandPctByDay = futureDates.map((_, i) => {
    const t = i + 1;
    // Expand uncertainty over time: proportional to sqrt(time).
    const expand = Math.sqrt(t / 7);
    // ~80% interval proxy (z ~= 1.28)
    const pct = revenueVol * 1.28 * expand;
    return clamp(pct, 0.08, 0.9);
  });

  const sessionsBandPctByDay = futureDates.map((_, i) => {
    const t = i + 1;
    return clamp(sessionsVol * 1.1 * Math.sqrt(t / 14), 0.06, 0.8);
  });
  const convBandPctByDay = futureDates.map((_, i) => {
    const t = i + 1;
    return clamp(convVol * 1.0 * Math.sqrt(t / 14), 0.06, 1.0);
  });
  const aovBandPctByDay = futureDates.map((_, i) => {
    const t = i + 1;
    return clamp(aovVol * 1.0 * Math.sqrt(t / 14), 0.06, 1.0);
  });
  const ordersBandPctByDay = futureDates.map((_, i) => {
    // Rough compounding of sessions + conversion uncertainty.
    const pct = Math.sqrt(
      Math.pow(sessionsBandPctByDay[i] ?? 0, 2) +
        Math.pow(convBandPctByDay[i] ?? 0, 2),
    );
    return clamp(pct, 0.08, 1.0);
  });

  const coverageDays = Math.max(
    hasGA ? (args.sessionsByDay ?? []).length : 0,
    hasShopify ? (args.shopifyRevenueByDay ?? []).length : 0,
  );

  const confidenceScore = computeConfidenceScore({
    hasShopify,
    hasGA,
    hasMeta,
    coverageDays,
    volatility: revenueVol,
  });

  const revenuePoints = pointwiseForecast({
    dates: futureDates,
    expected: revenueForecast,
    bandPct: bandPctByDay,
    clampMin: 0,
  });
  const ordersPoints = pointwiseForecast({
    dates: futureDates,
    expected: ordersForecast,
    bandPct: ordersBandPctByDay,
    clampMin: 0,
  });
  const sessionsPoints = pointwiseForecast({
    dates: futureDates,
    expected: sessionsForecast,
    bandPct: sessionsBandPctByDay,
    clampMin: 0,
  });
  const conversionPoints = pointwiseForecast({
    dates: futureDates,
    expected: conversionForecast,
    bandPct: convBandPctByDay,
    clampMin: 0,
    clampMax: 0.25,
  });
  const aovPoints = pointwiseForecast({
    dates: futureDates,
    expected: aovForecast,
    bandPct: aovBandPctByDay,
    clampMin: 0,
  });

  return {
    currency: args.currency,
    today: args.today,
    confidenceScore,
    drivers: {
      sessionsSlopePerDay,
      conversionRateSlopePerDay,
      aovSlopePerDay,
      recentSessionsAvg,
      recentConversionRateAvg,
      recentAovAvg,
    },
    series: {
      revenue: revenuePoints,
      orders: ordersPoints,
      sessions: sessionsPoints,
      conversionRate: conversionPoints,
      aov: aovPoints,
    },
    totals: {
      revenue: totalsForHorizons(revenuePoints, [7, 30, 90]),
      orders: totalsForHorizons(ordersPoints, [7, 30, 90]),
    },
  };
}

export function generatePredictiveSummary(args: {
  bundle: ForecastBundle;
  currencyFormatter: (n: number) => string;
  meta?: {
    clicksTrendPct?: number;
    cpcTrendPct?: number;
    ctrTrendPct?: number;
  };
}): { outlook: string; why: string[]; risks: string[] } {
  const b = args.bundle;
  const rev7 = b.totals.revenue.find((t) => t.horizonDays === 7);
  const rev30 = b.totals.revenue.find((t) => t.horizonDays === 30);
  const orders30 = b.totals.orders.find((t) => t.horizonDays === 30);

  const sessionsDir =
    b.drivers.sessionsSlopePerDay > 0.1
      ? 'up'
      : b.drivers.sessionsSlopePerDay < -0.1
        ? 'down'
        : 'flat';
  const convDir =
    b.drivers.conversionRateSlopePerDay > 0.0002
      ? 'up'
      : b.drivers.conversionRateSlopePerDay < -0.0002
        ? 'down'
        : 'flat';
  const aovDir =
    b.drivers.aovSlopePerDay > 0.05
      ? 'up'
      : b.drivers.aovSlopePerDay < -0.05
        ? 'down'
        : 'flat';

  const outlook = [
    rev7
      ? `Next 7 days are projected around ${args.currencyFormatter(rev7.expected)} (range ${args.currencyFormatter(rev7.worst)}–${args.currencyFormatter(rev7.best)}).`
      : 'Short-term revenue projection is available once inputs load.',
    rev30 && orders30
      ? `Next 30 days are projected around ${args.currencyFormatter(rev30.expected)} across ~${Math.round(orders30.expected).toLocaleString()} orders.`
      : '',
    `Overall confidence: ${b.confidenceScore}/100.`,
  ]
    .filter(Boolean)
    .join(' ');

  const why: string[] = [
    `Sessions are trending ${sessionsDir} (recent average ~${Math.round(b.drivers.recentSessionsAvg).toLocaleString()}/day).`,
    `Conversion rate is trending ${convDir} (recent average ~${(b.drivers.recentConversionRateAvg * 100).toFixed(2)}%).`,
    `Average order value is trending ${aovDir} (recent average ~${args.currencyFormatter(b.drivers.recentAovAvg)}).`,
  ];

  if (args.meta?.clicksTrendPct != null) {
    const pct = args.meta.clicksTrendPct;
    why.push(
      `Meta clicks are ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}% recently, which can shift near-term sessions.`,
    );
  }
  if (args.meta?.cpcTrendPct != null) {
    const pct = args.meta.cpcTrendPct;
    why.push(
      `Meta CPC is ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}%, which may affect paid traffic efficiency.`,
    );
  }

  const risks: string[] = [];
  if (b.confidenceScore < 50) {
    risks.push(
      'Confidence is limited due to missing/volatile inputs; treat ranges as directional.',
    );
  }
  if (sessionsDir === 'down') {
    risks.push('Traffic softness would pressure orders and revenue.');
  }
  if (convDir === 'down') {
    risks.push('Lower conversion could offset stable traffic.');
  }
  if (aovDir === 'down') {
    risks.push('Discounting or product-mix shifts could reduce AOV.');
  }
  if (!risks.length) {
    risks.push(
      'Paid traffic volatility and on-site conversion swings are the main near-term risks.',
    );
  }

  return { outlook, why, risks };
}

