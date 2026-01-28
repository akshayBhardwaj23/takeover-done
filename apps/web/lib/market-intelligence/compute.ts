import type {
  ChatAnswer,
  CompetitionIntensityLabel,
  ConfidenceLabel,
  Direction,
  MarketDemandIndex,
  MarketIntelligenceContext,
  MarketRecommendation,
  MarketTrendDrivers,
  MarketAdjustedForecast,
  PricingPressure,
  SignalConfidence,
  StoreVsMarket,
  TrendPoint,
} from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function safeDiv(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

export function pctChange(current: number, prev: number): number | null {
  const r = safeDiv(current - prev, Math.abs(prev));
  if (r == null) return null;
  return r * 100;
}

export function directionFromPct(pct: number | null, threshold = 3): Direction {
  if (pct == null) return 'Stable';
  if (pct > threshold) return 'Rising';
  if (pct < -threshold) return 'Declining';
  return 'Stable';
}

export function confidenceFromParts(parts: Array<{ score01: number; reason: string }>): SignalConfidence {
  const score01 = parts.length ? mean(parts.map((p) => clamp(p.score01, 0, 1))) : 0;
  const score = Math.round(100 * clamp(score01, 0, 1));
  const label: ConfidenceLabel = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const reasons = parts
    .filter((p) => p.score01 < 0.8)
    .map((p) => p.reason)
    .slice(0, 3);
  return { score, label, reasons };
}

export function buildDemandIndex(args: {
  trafficMomentumPct7d: number | null;
  trafficMomentumPct30d: number | null;
  trafficMomentumPct90d: number | null;
  searchInterestPct7d: number | null;
  searchInterestPct30d: number | null;
  searchInterestPct90d: number | null;
}): MarketDemandIndex {
  const hasSearch = args.searchInterestPct30d != null;
  const wSearch = hasSearch ? 0.6 : 0;
  const wTraffic = hasSearch ? 0.4 : 1;

  const blend = (a: number | null, b: number | null): number | null => {
    if (a == null && b == null) return null;
    const aa = a ?? 0;
    const bb = b ?? 0;
    return wTraffic * aa + wSearch * bb;
  };

  const pct7 = blend(args.trafficMomentumPct7d, args.searchInterestPct7d);
  const pct30 = blend(args.trafficMomentumPct30d, args.searchInterestPct30d);
  const pct90 = blend(args.trafficMomentumPct90d, args.searchInterestPct90d);

  const conf = confidenceFromParts([
    {
      score01: args.trafficMomentumPct30d != null ? 0.9 : 0.4,
      reason: 'Traffic momentum coverage is limited.',
    },
    {
      score01: hasSearch ? 0.8 : 0.35,
      reason: 'External search-interest signal is unavailable.',
    },
  ]);

  return {
    direction: directionFromPct(pct7, 2),
    pctChange7d: pct7,
    pctChange30d: pct30,
    pctChange90d: pct90,
    inputs: {
      trafficMomentumPct7d: args.trafficMomentumPct7d,
      trafficMomentumPct30d: args.trafficMomentumPct30d,
      trafficMomentumPct90d: args.trafficMomentumPct90d,
      searchInterestPct7d: args.searchInterestPct7d,
      searchInterestPct30d: args.searchInterestPct30d,
      searchInterestPct90d: args.searchInterestPct90d,
    },
    confidence: conf,
  };
}

export function buildPricingPressure(args: {
  currency: string;
  storeAov90dMedian: number | null;
  storeAov30d: number | null;
  aovVolatilityCoefVar: number | null;
  discountInterestPct30d: number | null;
}): PricingPressure {
  const discountDir = directionFromPct(args.discountInterestPct30d, 5);
  const discountScore01 =
    args.discountInterestPct30d == null ? null : clamp((args.discountInterestPct30d + 30) / 60, 0, 1); // -30..+30 => 0..1

  // Market-adjusted median is a *proxy* anchored on store median, shifted by discount pressure.
  const shift = discountScore01 == null ? 0 : (discountScore01 - 0.5) * 0.12; // +/- 6% max
  const marketAdjustedMedian =
    args.storeAov90dMedian != null ? args.storeAov90dMedian * (1 - shift) : null;

  // Range widens with AOV volatility. Still anchored on observed store distribution (no fabricated external scrape).
  const spread =
    args.aovVolatilityCoefVar == null ? 0.25 : clamp(0.18 + 0.5 * args.aovVolatilityCoefVar, 0.18, 0.45);
  const rangeLow =
    marketAdjustedMedian != null ? Math.round(marketAdjustedMedian * (1 - spread) * 100) / 100 : null;
  const rangeHigh =
    marketAdjustedMedian != null ? Math.round(marketAdjustedMedian * (1 + spread) * 100) / 100 : null;

  const storeAov = args.storeAov30d ?? args.storeAov90dMedian;
  const ratio = storeAov != null && marketAdjustedMedian != null ? storeAov / marketAdjustedMedian : null;

  let pricePressure: PricingPressure['pricePressure'] = 'Medium';
  if (ratio != null) {
    if (ratio > 1.12 && discountDir !== 'Declining') pricePressure = 'High';
    else if (ratio < 0.9 && discountDir === 'Rising') pricePressure = 'Low';
  }

  const conf = confidenceFromParts([
    {
      score01: args.storeAov90dMedian != null ? 0.9 : 0.35,
      reason: 'Not enough orders to estimate AOV reliably.',
    },
    {
      score01: args.discountInterestPct30d != null ? 0.7 : 0.35,
      reason: 'Discount-intent proxy (external) is unavailable.',
    },
  ]);

  return {
    marketAovRange: { low: rangeLow, high: rangeHigh, currency: args.currency },
    storeAov,
    marketAdjustedMedianAov: marketAdjustedMedian != null ? Math.round(marketAdjustedMedian * 100) / 100 : null,
    discountPressure: {
      direction: discountDir,
      pctChange30d: args.discountInterestPct30d,
      score01: discountScore01,
    },
    pricePressure,
    confidence: conf,
  };
}

export function buildCompetitionSignals(args: {
  cpcPct30d: number | null;
  cpcMA7: number | null;
  cpcPrev30: number | null;
  ctrMA7: number | null;
  demandPct30d: number | null;
  storeSessionsPct30d: number | null;
}): {
  paidSaturation: {
    label: CompetitionIntensityLabel;
    cpcInflationDirection: Direction;
    cpcInflationPct30d: number | null;
    evidence: { cpcMA7: number | null; cpcPrev30: number | null; ctrMA7: number | null };
    confidence: SignalConfidence;
  };
  organicReach: {
    direction: Direction;
    compressionPct30d: number | null;
    confidence: SignalConfidence;
  };
} {
  const cpcDir = directionFromPct(args.cpcPct30d, 5);
  let paidLabel: CompetitionIntensityLabel = 'Medium';
  if (args.cpcPct30d != null) {
    if (args.cpcPct30d > 12) paidLabel = 'High';
    else if (args.cpcPct30d < -8) paidLabel = 'Low';
  }

  const paidConf = confidenceFromParts([
    { score01: args.cpcPct30d != null ? 0.8 : 0.3, reason: 'Meta CPC trend is unavailable.' },
  ]);

  // Organic reach proxy: if market demand is up but store sessions are flat/down, interpret as reach compression.
  const compression =
    args.storeSessionsPct30d != null && args.demandPct30d != null
      ? args.storeSessionsPct30d - args.demandPct30d
      : null;
  const organicDir = directionFromPct(compression != null ? -compression : null, 3);
  const organicConf = confidenceFromParts([
    {
      score01: args.storeSessionsPct30d != null && args.demandPct30d != null ? 0.65 : 0.3,
      reason: 'Insufficient data to separate organic reach from total traffic.',
    },
  ]);

  return {
    paidSaturation: {
      label: paidLabel,
      cpcInflationDirection: cpcDir,
      cpcInflationPct30d: args.cpcPct30d,
      evidence: { cpcMA7: args.cpcMA7, cpcPrev30: args.cpcPrev30, ctrMA7: args.ctrMA7 },
      confidence: paidConf,
    },
    organicReach: {
      direction: organicDir,
      compressionPct30d: compression,
      confidence: organicConf,
    },
  };
}

export function buildStoreVsMarket(args: {
  storeRevenuePct30d: number | null;
  storeSessionsPct30d: number | null;
  demandPct30d: number | null;
}): StoreVsMarket {
  const gap = args.storeRevenuePct30d != null && args.demandPct30d != null ? args.storeRevenuePct30d - args.demandPct30d : null;
  let label: StoreVsMarket['label'] = 'Store aligned with market movement';
  if (gap != null) {
    if (gap > 6) label = 'Store outperforming market';
    else if (gap < -6) label = 'Store underperforming market';
  }
  const conf = confidenceFromParts([
    { score01: args.storeRevenuePct30d != null ? 0.85 : 0.35, reason: 'Store revenue trend is unavailable.' },
    { score01: args.demandPct30d != null ? 0.65 : 0.3, reason: 'Market demand trend is unavailable.' },
  ]);
  return { label, evidence: { ...args }, confidence: conf };
}

export function buildMarketAdjustedForecast(args: {
  baseTotals: Array<{ horizonDays: 7 | 30 | 90; expected: number; best: number; worst: number }>;
  demandPct30d: number | null;
}): MarketAdjustedForecast {
  // Modifier: apply a conservative fraction of demand change to sessions/revenue (proxy).
  const demand = args.demandPct30d ?? 0;
  const sessionsMultiplier = clamp(1 + 0.5 * (demand / 100), 0.85, 1.2);
  const totals = args.baseTotals.map((t) => {
    const marketAdjustedRevenue = t.expected * sessionsMultiplier;
    return {
      horizonDays: t.horizonDays,
      baseRevenue: t.expected,
      marketAdjustedRevenue,
      deltaRevenue: marketAdjustedRevenue - t.expected,
    };
  }) as MarketAdjustedForecast['totals'];

  const conf = confidenceFromParts([
    { score01: args.demandPct30d != null ? 0.6 : 0.25, reason: 'Market demand modifier is based on limited signals.' },
  ]);

  return {
    modifier: {
      sessionsMultiplier: Math.round(sessionsMultiplier * 1000) / 1000,
      label: 'Market-adjusted (demand proxy)',
      reason:
        args.demandPct30d == null
          ? 'Market demand signal unavailable; defaulting to no adjustment.'
          : `Applies 50% of the 30-day demand change (${Math.round(demand * 10) / 10}%) to future sessions.`,
    },
    totals,
    confidence: conf,
  };
}

export function buildTrendDrivers(args: {
  dateKeys: string[];
  sessionsByDay: Array<number | null>;
  searchInterestByDay?: Array<number | null>;
  discountInterestByDay?: Array<number | null>;
  cpcByDay?: Array<number | null>;
}): MarketTrendDrivers {
  const toPoints = (vals: Array<number | null>): TrendPoint[] =>
    args.dateKeys
      .map((d, i) => ({ date: d, value: vals[i] }))
      .filter((p): p is TrendPoint & { value: number } => typeof p.value === 'number' && Number.isFinite(p.value));

  // Index sessions to 0..100 by 90-day mean (or available mean)
  const sess = args.sessionsByDay.map((v) => (typeof v === 'number' ? v : null));
  const base = mean(sess.filter((v): v is number => typeof v === 'number'));
  const indexed = sess.map((v) => (v == null ? null : base > 0 ? (100 * v) / base : 0));

  return {
    demandIndex: toPoints(indexed),
    ...(args.searchInterestByDay ? { searchInterest: toPoints(args.searchInterestByDay) } : {}),
    ...(args.discountInterestByDay ? { discountInterest: toPoints(args.discountInterestByDay) } : {}),
    ...(args.cpcByDay ? { cpc: toPoints(args.cpcByDay) } : {}),
  };
}

export function buildRecommendations(args: {
  demandDirection: Direction;
  pricePressure: PricingPressure['pricePressure'];
  paidSaturation: CompetitionIntensityLabel;
  storeVsMarketLabel: StoreVsMarket['label'];
}): MarketRecommendation[] {
  const recs: MarketRecommendation[] = [];

  if (args.demandDirection === 'Declining') {
    recs.push({
      title: 'Be cautious scaling paid spend this week',
      rationale:
        'Demand is contracting; aggressive scaling can inflate CAC and hide weak conversion behind spend.',
      ctas: [
        {
          type: 'what_if',
          label: 'Simulate spend increase in What‑If Planner',
          focus: 'whatif',
          presetName: 'Scale Meta spend (+20%)',
          miParams: { miMetaSpendPct: 20 },
        },
        {
          type: 'view_market_adjusted_forecast',
          label: 'View market‑adjusted forecast',
          hrefHash: '#market-adjusted',
        },
      ],
      confidence: 'Medium',
    });
  }

  if (args.pricePressure === 'High') {
    recs.push({
      title: 'Expect higher price sensitivity',
      rationale:
        'Discount pressure is rising while your AOV sits above the market-adjusted median; test value messaging and bundles before discounting.',
      ctas: [
        {
          type: 'what_if',
          label: 'Simulate AOV/discount changes in What‑If',
          focus: 'whatif',
          presetName: 'Discount pressure response',
          miParams: { miDiscountPct: 10, miAovPct: -5 },
        },
      ],
      confidence: 'Medium',
    });
  }

  if (args.paidSaturation === 'High') {
    recs.push({
      title: 'Optimize paid efficiency before scaling',
      rationale:
        'CPC inflation suggests paid channel saturation. Prioritize creative refresh and landing page CVR before adding budget.',
      ctas: [
        {
          type: 'what_if',
          label: 'Simulate CPC change vs spend change',
          focus: 'whatif',
          presetName: 'CPC inflation stress test',
          miParams: { miCpcPct: 15, miMetaSpendPct: 10 },
        },
      ],
      confidence: 'Medium',
    });
  }

  if (args.storeVsMarketLabel === 'Store underperforming market') {
    recs.push({
      title: 'Investigate store-specific friction',
      rationale:
        'Market demand is not the full explanation; your store is trailing the category trend. Look for funnel drop-offs and offer positioning gaps.',
      ctas: [
        {
          type: 'what_if',
          label: 'Simulate CVR uplift in What‑If',
          focus: 'whatif',
          presetName: 'Improve CVR (+5%)',
          miParams: { miCvrPct: 5 },
        },
      ],
      confidence: 'High',
    });
  }

  if (!recs.length) {
    recs.push({
      title: 'Stay consistent; monitor signals weekly',
      rationale:
        'Signals look stable. Keep executing and watch for shifts in demand or CPC that could change marginal returns.',
      ctas: [
        {
          type: 'view_market_adjusted_forecast',
          label: 'View market‑adjusted forecast',
          hrefHash: '#market-adjusted',
        },
      ],
      confidence: 'Low',
    });
  }

  return recs.slice(0, 4);
}

export function buildChatAnswer(args: { question: string; ctx: MarketIntelligenceContext }): ChatAnswer {
  const q = args.question.toLowerCase();
  const { marketPulse: pulse } = args.ctx;

  const evidence: string[] = [];
  const impact: string[] = [];
  const ctas: Array<{ label: string; href: string }> = [];

  const demand = pulse.demand;
  const pricing = pulse.pricing;
  const comp = pulse.competition;
  const svm = pulse.storeVsMarket;

  const demand30 = demand.pctChange30d;
  const storeRev30 = svm.evidence.storeRevenuePct30d;

  const canUseMarket = demand30 != null || pricing.discountPressure.pctChange30d != null || comp.paidSaturation.cpcInflationPct30d != null;
  const baseConfidence: ConfidenceLabel = canUseMarket ? 'Medium' : 'Low';

  const looksLikeProductQuestion =
    q.includes('product') ||
    q.includes('sku') ||
    q.includes('variant') ||
    q.includes('winner') ||
    q.includes('win right now') ||
    q.includes('run ads') ||
    q.includes('run adverts') ||
    q.includes('advert') ||
    q.includes('which item');

  if (looksLikeProductQuestion) {
    const products = args.ctx.products?.topProducts || [];
    if (!products.length) {
      return {
        directAnswer:
          'I can’t pick winning products yet because I don’t have product-level performance data available for this store.',
        marketEvidence: [
          `Demand: ${demand.direction}${demand.pctChange30d != null ? ` (${Math.round(demand.pctChange30d)}% 30d)` : ''}.`,
          `Paid saturation: ${comp.paidSaturation.label}.`,
        ],
        storeImpact: [
          'If you want product-level answers, we need Shopify line-item performance (product revenue/orders) in the context.',
          'For now, prioritize ads on your proven best-sellers (highest revenue + repeat orders) and test creatives before scaling budget.',
        ],
        confidence: 'Low',
        ctas: [
          { label: 'Open Advertisements', href: '/advertisements' },
          { label: 'Simulate budget changes in What‑If Planner', href: `/predictive-insights?shop=${encodeURIComponent(args.ctx.shop)}&focus=whatif` },
        ],
      };
    }

    const top = products.slice(0, 3);
    const directAnswer =
      top.length === 1
        ? `Your best ad “win” right now (based on the last ${args.ctx.products?.windowDays ?? 30} days) is: ${top[0]!.title}.`
        : `Top products to prioritize for ads right now (based on the last ${args.ctx.products?.windowDays ?? 30} days): ${top
            .map((p) => p.title)
            .join(', ')}.`;

    for (const p of top) {
      evidence.push(
        `${p.title}: ${Math.round(p.revenue)} revenue, ${p.ordersCount} orders, ${p.quantity} units.`,
      );
    }
    evidence.push(`Demand: ${demand.direction}${demand.pctChange30d != null ? ` (${Math.round(demand.pctChange30d)}% 30d)` : ''}.`);
    evidence.push(`Paid saturation: ${comp.paidSaturation.label}${comp.paidSaturation.cpcInflationPct30d != null ? ` (CPC ${Math.round(comp.paidSaturation.cpcInflationPct30d)}% 30d)` : ''}.`);

    impact.push('In high CPC environments, focus budget on products with proven conversion (more orders) rather than only high AOV.');
    impact.push('Start with a small test budget and evaluate ROAS before scaling.');

    const confidence: ConfidenceLabel =
      top[0] && top[0].ordersCount >= 15 ? 'Medium' : 'Low';

    ctas.push({ label: 'Open Advertisements', href: '/advertisements' });
    ctas.push({
      label: 'Simulate spend/CPC stress test in What‑If',
      href: `/predictive-insights?shop=${encodeURIComponent(args.ctx.shop)}&focus=whatif&presetName=${encodeURIComponent(
        'CPC inflation stress test',
      )}&miCpcPct=15&miMetaSpendPct=10#what-if-planner`,
    });

    return { directAnswer, marketEvidence: evidence, storeImpact: impact, confidence, ctas };
  }

  if (q.includes('sales down') || q.includes('revenue down') || q.includes('orders down') || q.includes('this week')) {
    const direct =
      svm.label === 'Store underperforming market'
        ? 'Your dip looks more store-specific than market-wide.'
        : 'Market conditions are a meaningful part of the dip, but store execution still matters.';

    if (demand.pctChange7d != null) evidence.push(`Category demand (7d): ${Math.round(demand.pctChange7d)}% (${demand.direction}).`);
    if (pricing.discountPressure.pctChange30d != null)
      evidence.push(`Discount pressure proxy (30d): ${Math.round(pricing.discountPressure.pctChange30d)}% (${pricing.discountPressure.direction}).`);
    if (svm.evidence.storeRevenuePct30d != null) evidence.push(`Store revenue trend (30d): ${Math.round(svm.evidence.storeRevenuePct30d)}%.`);
    evidence.push(`Store vs market: ${svm.label}.`);

    impact.push('Sessions are likely influenced by category demand and paid saturation.');
    impact.push('If demand is down, scaling spend may not restore conversion efficiently.');

    ctas.push({ label: 'Simulate a recovery plan in What‑If Planner', href: `/predictive-insights` });
    ctas.push({ label: 'View market‑adjusted forecast', href: `/market-intelligence` });

    return { directAnswer: direct, marketEvidence: evidence, storeImpact: impact, confidence: baseConfidence, ctas };
  }

  if (q.includes('market slow') || q.includes('just my store') || q.includes('is it just')) {
    const direct =
      svm.label === 'Store underperforming market'
        ? 'It’s more your store than the market right now.'
        : svm.label === 'Store outperforming market'
          ? 'The market may be soft, but your store is holding up better than the category.'
          : 'Your store is moving roughly in line with the market.';

    if (demand30 != null) evidence.push(`Category demand (30d): ${Math.round(demand30)}% (${directionFromPct(demand30)}).`);
    if (storeRev30 != null) evidence.push(`Store revenue (30d): ${Math.round(storeRev30)}%.`);
    evidence.push(`Store vs market: ${svm.label}.`);

    impact.push('Use this to decide whether to optimize internally (CVR/AOV) vs wait out demand.');
    ctas.push({ label: 'Open Predictive Insights', href: `/predictive-insights` });
    return { directAnswer: direct, marketEvidence: evidence, storeImpact: impact, confidence: baseConfidence, ctas };
  }

  if (q.includes('meta') || q.includes('ad spend') || q.includes('increase spend') || q.includes('scale paid')) {
    const risky =
      demand.direction === 'Declining' || comp.paidSaturation.label === 'High' || pricing.pricePressure === 'High';
    const direct = risky
      ? 'This is a higher-risk window to scale Meta spend.'
      : 'This looks like a reasonable window to test a controlled spend increase.';

    evidence.push(`Demand: ${demand.direction}${demand.pctChange7d != null ? ` (${Math.round(demand.pctChange7d)}% 7d)` : ''}.`);
    evidence.push(`Paid saturation: ${comp.paidSaturation.label}${comp.paidSaturation.cpcInflationPct30d != null ? ` (CPC ${Math.round(comp.paidSaturation.cpcInflationPct30d)}% 30d)` : ''}.`);
    evidence.push(`Price pressure: ${pricing.pricePressure}.`);

    impact.push('Higher CPC inflation reduces marginal ROAS at the same conversion rate.');
    impact.push('If demand is down, incremental traffic may be lower-intent.');

    ctas.push({ label: 'Simulate spend + CPC changes in What‑If', href: `/predictive-insights` });
    return { directAnswer: direct, marketEvidence: evidence, storeImpact: impact, confidence: baseConfidence, ctas };
  }

  if (q.includes('price') || q.includes('price-sensitive') || q.includes('discount')) {
    const direct =
      pricing.pricePressure === 'High'
        ? 'Yes — signals suggest customers are more price-sensitive right now.'
        : 'Price sensitivity looks moderate right now.';

    if (pricing.discountPressure.pctChange30d != null)
      evidence.push(`Discount-intent proxy (30d): ${Math.round(pricing.discountPressure.pctChange30d)}% (${pricing.discountPressure.direction}).`);
    if (pricing.storeAov != null && pricing.marketAdjustedMedianAov != null)
      evidence.push(`Store AOV vs market-adjusted median: ${Math.round(pricing.storeAov)} vs ${Math.round(pricing.marketAdjustedMedianAov)}.`);

    impact.push('Higher price pressure can reduce CVR unless value is clear.');
    impact.push('If you discount, protect margins by focusing on bundles/threshold offers.');
    ctas.push({ label: 'Simulate discount vs AOV tradeoffs', href: `/predictive-insights` });

    return { directAnswer: direct, marketEvidence: evidence, storeImpact: impact, confidence: baseConfidence };
  }

  if (q.includes('aov') || q.includes('average order value')) {
    const direct =
      pricing.storeAov != null && pricing.marketAdjustedMedianAov != null
        ? pricing.storeAov > pricing.marketAdjustedMedianAov
          ? 'Your AOV is higher than the market-adjusted median.'
          : 'Your AOV is lower than the market-adjusted median.'
        : 'I don’t have enough data to compare your AOV to the market.';

    if (pricing.marketAovRange.low != null && pricing.marketAovRange.high != null)
      evidence.push(`Estimated category AOV range: ${pricing.marketAovRange.low}–${pricing.marketAovRange.high} ${pricing.marketAovRange.currency}.`);
    if (pricing.storeAov != null) evidence.push(`Store AOV (recent): ${Math.round(pricing.storeAov)}.`);

    impact.push('AOV shifts affect revenue even if orders stay flat.');
    ctas.push({ label: 'Simulate AOV increase vs CVR changes', href: `/predictive-insights` });
    return { directAnswer: direct, marketEvidence: evidence, storeImpact: impact, confidence: baseConfidence, ctas };
  }

  if (q.includes('trending') || q.includes('trend') || q.includes('category')) {
    const direct =
      demand.direction === 'Rising'
        ? 'Your category is trending up.'
        : demand.direction === 'Declining'
          ? 'Your category is trending down.'
          : 'Your category looks stable.';
    if (demand.pctChange30d != null) evidence.push(`Category demand (30d): ${Math.round(demand.pctChange30d)}%.`);
    if (comp.paidSaturation.cpcInflationPct30d != null) evidence.push(`CPC inflation (30d): ${Math.round(comp.paidSaturation.cpcInflationPct30d)}%.`);
    impact.push('Use this to adjust how aggressively you pursue growth vs efficiency.');
    return { directAnswer: direct, marketEvidence: evidence, storeImpact: impact, confidence: baseConfidence, ctas };
  }

  // Default: cautious, context-only
  evidence.push(`Demand: ${demand.direction}${demand.pctChange30d != null ? ` (${Math.round(demand.pctChange30d)}% 30d)` : ''}.`);
  evidence.push(`Price pressure: ${pricing.pricePressure}.`);
  evidence.push(`Paid saturation: ${comp.paidSaturation.label}.`);
  impact.push('If you tell me your goal (scale vs protect margin), I can map these signals to sessions/CVR/AOV tradeoffs.');
  ctas.push({ label: 'Simulate options in What‑If Planner', href: `/predictive-insights` });
  return {
    directAnswer: 'I can answer that using your market context — what decision are you trying to make this week?',
    marketEvidence: evidence,
    storeImpact: impact,
    confidence: 'Low',
    ctas,
  };
}

export function buildBuyerIntent(args: {
  demandDirection: Direction;
  discountDirection: Direction;
  paidSaturation: CompetitionIntensityLabel;
}): MarketIntelligenceContext['marketPulse']['buyerIntent'] {
  const reasons: string[] = [];
  let state: 'Strong' | 'Neutral' | 'Weak' = 'Neutral';

  if (args.demandDirection === 'Rising' && args.discountDirection !== 'Rising') {
    state = 'Strong';
    reasons.push('Demand rising without increasing discount pressure.');
  } else if (args.demandDirection === 'Declining' || args.discountDirection === 'Rising') {
    state = 'Weak';
    reasons.push('Demand weakening and/or discount pressure increasing.');
  }

  if (args.paidSaturation === 'High') reasons.push('Paid saturation can reduce incremental intent efficiency.');

  const conf = confidenceFromParts([
    { score01: 0.65, reason: 'Buyer intent is inferred from proxy signals.' },
  ]);

  return {
    state,
    confidence: conf,
    reasons: reasons.slice(0, 3),
  };
}

