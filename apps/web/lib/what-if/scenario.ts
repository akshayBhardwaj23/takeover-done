export type BaseForecastDay = {
  date: string; // YYYY-MM-DD
  sessions: number | null;
  cvr: number | null; // fraction
  aov: number; // currency units
  revenue: number; // daily expected revenue
  revenueLow: number;
  revenueHigh: number;
};

export type ScenarioConfig = {
  // Traffic & Acquisition
  metaSpendChangePct: number; // -100..+500
  cpcChangePct: number; // -80..+200
  organicTrafficGrowthPct: number; // -100..+300
  emailTrafficGrowthPct: number; // -100..+300

  // Conversion & Funnel
  overallCvrUpliftPct: number; // -100..+300
  mobileCvrUpliftPct: number; // -100..+300
  checkoutCompletionUpliftPct: number; // -100..+300

  // Revenue Quality
  aovChangePct: number; // -100..+300
  aovChangeAbsolute: number; // currency units (can be 0)
  discountIntensityChangePct: number; // -100..+300 (higher => more discount)
  refundRateChangePct: number; // -100..+300 (higher => more refunds)

  // Constraints
  inventoryCapOrdersPerDay: number | null; // null disables
  stockOutDate: string | null; // YYYY-MM-DD inclusive => 0 orders from this date onward
};

export type ScenarioDay = {
  date: string;
  base: {
    sessions: number | null;
    orders: number | null;
    aov: number;
    cvr: number | null;
    revenue: number;
  };
  scenario: {
    sessions: number | null;
    orders: number | null;
    aov: number;
    cvr: number | null;
    revenue: number;
    revenueLow: number;
    revenueHigh: number;
  };
  cumulative: {
    baseRevenue: number;
    scenarioRevenue: number;
    baseRevenueLow: number;
    baseRevenueHigh: number;
    scenarioRevenueLow: number;
    scenarioRevenueHigh: number;
    baseOrders: number;
    scenarioOrders: number;
    baseSessions: number;
    scenarioSessions: number;
  };
};

export type ScenarioTotals = {
  horizonDays: 7 | 30 | 90;
  base: {
    revenue: number;
    revenueLow: number;
    revenueHigh: number;
    orders: number;
    sessions: number;
    aovAvg: number;
    cvrAvg: number | null;
  };
  scenario: {
    revenue: number;
    revenueLow: number;
    revenueHigh: number;
    orders: number;
    sessions: number;
    aovAvg: number;
    cvrAvg: number | null;
  };
  uplift: {
    revenuePct: number | null;
    ordersPct: number | null;
    sessionsPct: number | null;
    aovPct: number | null;
    cvrPct: number | null;
  };
};

export type RiskLabel = 'Low' | 'Medium' | 'High';

export type ScenarioRisk = {
  label: RiskLabel;
  reasons: string[];
};

export type WhatIfResult = {
  config: ScenarioConfig;
  days: ScenarioDay[];
  totals: ScenarioTotals[];
  risk: ScenarioRisk;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

function mean(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

function pctToMult(pct: number): number {
  return 1 + pct / 100;
}

function safeDiv(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

function dateGte(a: string, b: string): boolean {
  // YYYY-MM-DD lexical compare works
  return a >= b;
}

export function defaultScenarioConfig(): ScenarioConfig {
  return {
    metaSpendChangePct: 0,
    cpcChangePct: 0,
    organicTrafficGrowthPct: 0,
    emailTrafficGrowthPct: 0,
    overallCvrUpliftPct: 0,
    mobileCvrUpliftPct: 0,
    checkoutCompletionUpliftPct: 0,
    aovChangePct: 0,
    aovChangeAbsolute: 0,
    discountIntensityChangePct: 0,
    refundRateChangePct: 0,
    inventoryCapOrdersPerDay: null,
    stockOutDate: null,
  };
}

export function computeScenario(args: {
  base: BaseForecastDay[]; // future days only (tomorrow onward)
  config: ScenarioConfig;
  volatilityK: number; // base revenue volatility (0.05..0.35)
  driverVolatility?: {
    sessionsCoefVar?: number | null;
    cvrCoefVar?: number | null;
    aovCoefVar?: number;
  };
  metaConnected?: boolean;
}): WhatIfResult {
  const cfg = args.config;
  const k = clamp(args.volatilityK, 0.03, 0.6);

  // Traffic multipliers (explainable heuristics)
  // Paid multiplier: spend up increases sessions, CPC up decreases sessions for same spend.
  // Cap impact to avoid absurd multipliers.
  const paidMultRaw = safeDiv(pctToMult(cfg.metaSpendChangePct), pctToMult(cfg.cpcChangePct));
  const paidMult = clamp(paidMultRaw, 0.2, 3.0);
  const organicMult = clamp(pctToMult(cfg.organicTrafficGrowthPct), 0, 4.0);
  const emailMult = clamp(pctToMult(cfg.emailTrafficGrowthPct), 0, 4.0);

  // If Meta isn't connected, still allow spend/CPC sliders but down-weight their effect.
  const metaEffectWeight = args.metaConnected ? 1 : 0.35;
  const trafficMultiplier = organicMult * emailMult * (1 + (paidMult - 1) * metaEffectWeight);

  // Conversion multipliers
  const overallCvrMult = clamp(pctToMult(cfg.overallCvrUpliftPct), 0, 4.0);
  const checkoutMult = clamp(pctToMult(cfg.checkoutCompletionUpliftPct), 0, 4.0);

  // Mobile CVR uplift applies partially (assume 60% mobile share; keep explainable constant).
  const mobileShare = 0.6;
  const mobileMult = clamp(pctToMult(cfg.mobileCvrUpliftPct), 0, 4.0);
  const deviceMult = mobileShare * mobileMult + (1 - mobileShare) * 1;

  const conversionMultiplier = overallCvrMult * checkoutMult * deviceMult;

  // AOV / quality multipliers
  const aovPctMult = clamp(pctToMult(cfg.aovChangePct), 0, 4.0);
  // Discount intensity reduces AOV (simple, explainable): 0.6 sensitivity
  const discountSens = 0.6;
  const discountMult = clamp(1 - (cfg.discountIntensityChangePct / 100) * discountSens, 0.2, 1.2);
  // Refund rate reduces NET revenue, modeled here as AOV multiplier only (does not change orders).
  const refundMult = clamp(1 - cfg.refundRateChangePct / 100, 0.2, 1.0);

  const days: ScenarioDay[] = [];
  let cumBaseRev = 0;
  let cumScenarioRev = 0;
  let cumBaseLow = 0;
  let cumBaseHigh = 0;
  let cumScenarioLow = 0;
  let cumScenarioHigh = 0;
  let cumBaseOrders = 0;
  let cumScenarioOrders = 0;
  let cumBaseSessions = 0;
  let cumScenarioSessions = 0;

  for (const d of args.base) {
    const baseSessions = d.sessions;
    const baseCvr = d.cvr;
    const baseAov = d.aov;
    const baseOrders =
      baseSessions != null && baseCvr != null ? baseSessions * baseCvr : null;

    // Scenario sessions
    const scenarioSessions =
      baseSessions != null ? Math.max(0, baseSessions * trafficMultiplier) : null;

    // Scenario CVR
    const scenarioCvr =
      baseCvr != null ? clamp(baseCvr * conversionMultiplier, 0, 0.2) : null;

    // Scenario orders
    let scenarioOrders =
      scenarioSessions != null && scenarioCvr != null
        ? scenarioSessions * scenarioCvr
        : null;

    // Constraints
    if (scenarioOrders != null) {
      if (cfg.stockOutDate && dateGte(d.date, cfg.stockOutDate)) {
        scenarioOrders = 0;
      }
      if (cfg.inventoryCapOrdersPerDay != null && cfg.inventoryCapOrdersPerDay >= 0) {
        scenarioOrders = Math.min(scenarioOrders, cfg.inventoryCapOrdersPerDay);
      }
    }

    // Scenario AOV
    let scenarioAov =
      baseAov * aovPctMult * discountMult * refundMult + cfg.aovChangeAbsolute;
    // Clamp to reasonable bounds around base (0.5x..2x) to prevent explosions.
    scenarioAov = clamp(scenarioAov, Math.max(0, baseAov * 0.5), baseAov * 2);

    // Scenario daily revenue (net modeled via refundMult already)
    const scenarioRevenue =
      scenarioOrders != null ? scenarioOrders * scenarioAov : d.revenue;

    // Bands: apply same k around scenario daily revenue (simple & deterministic)
    const scenarioLow = scenarioRevenue * (1 - k);
    const scenarioHigh = scenarioRevenue * (1 + k);

    // Base bands from base series
    const baseLow = d.revenueLow;
    const baseHigh = d.revenueHigh;

    cumBaseRev += d.revenue;
    cumScenarioRev += scenarioRevenue;
    cumBaseLow += baseLow;
    cumBaseHigh += baseHigh;
    cumScenarioLow += scenarioLow;
    cumScenarioHigh += scenarioHigh;
    cumBaseOrders += baseOrders ?? 0;
    cumScenarioOrders += scenarioOrders ?? 0;
    cumBaseSessions += baseSessions ?? 0;
    cumScenarioSessions += scenarioSessions ?? 0;

    days.push({
      date: d.date,
      base: {
        sessions: baseSessions,
        orders: baseOrders,
        aov: baseAov,
        cvr: baseCvr,
        revenue: d.revenue,
      },
      scenario: {
        sessions: scenarioSessions,
        orders: scenarioOrders,
        aov: scenarioAov,
        cvr: scenarioCvr,
        revenue: scenarioRevenue,
        revenueLow: scenarioLow,
        revenueHigh: scenarioHigh,
      },
      cumulative: {
        baseRevenue: cumBaseRev,
        scenarioRevenue: cumScenarioRev,
        baseRevenueLow: cumBaseLow,
        baseRevenueHigh: cumBaseHigh,
        scenarioRevenueLow: cumScenarioLow,
        scenarioRevenueHigh: cumScenarioHigh,
        baseOrders: cumBaseOrders,
        scenarioOrders: cumScenarioOrders,
        baseSessions: cumBaseSessions,
        scenarioSessions: cumScenarioSessions,
      },
    });
  }

  const horizons: Array<7 | 30 | 90> = [7, 30, 90];
  const totals: ScenarioTotals[] = horizons.map((horizonDays) => {
    const slice = days.slice(0, horizonDays);
    const baseRevenue = sum(slice.map((x) => x.base.revenue));
    const scenarioRevenue = sum(slice.map((x) => x.scenario.revenue));
    const baseRevenueLow = sum(slice.map((x) => x.base.revenue)) * (1 - k); // approximation for display
    const baseRevenueHigh = sum(slice.map((x) => x.base.revenue)) * (1 + k); // approximation for display
    const scenarioRevenueLow = sum(slice.map((x) => x.scenario.revenueLow));
    const scenarioRevenueHigh = sum(slice.map((x) => x.scenario.revenueHigh));

    const baseOrders = sum(slice.map((x) => x.base.orders ?? 0));
    const scenarioOrders = sum(slice.map((x) => x.scenario.orders ?? 0));
    const baseSessions = sum(slice.map((x) => x.base.sessions ?? 0));
    const scenarioSessions = sum(slice.map((x) => x.scenario.sessions ?? 0));

    const baseAovAvg = mean(slice.map((x) => x.base.aov));
    const scenarioAovAvg = mean(slice.map((x) => x.scenario.aov));

    const baseCvrVals = slice.map((x) => x.base.cvr).filter((v): v is number => typeof v === 'number');
    const scenarioCvrVals = slice.map((x) => x.scenario.cvr).filter((v): v is number => typeof v === 'number');
    const baseCvrAvg = baseCvrVals.length ? mean(baseCvrVals) : null;
    const scenarioCvrAvg = scenarioCvrVals.length ? mean(scenarioCvrVals) : null;

    const upliftPct = (sc: number, b: number) =>
      b > 0 ? ((sc - b) / b) * 100 : null;

    return {
      horizonDays,
      base: {
        revenue: baseRevenue,
        revenueLow: baseRevenueLow,
        revenueHigh: baseRevenueHigh,
        orders: baseOrders,
        sessions: baseSessions,
        aovAvg: baseAovAvg,
        cvrAvg: baseCvrAvg,
      },
      scenario: {
        revenue: scenarioRevenue,
        revenueLow: scenarioRevenueLow,
        revenueHigh: scenarioRevenueHigh,
        orders: scenarioOrders,
        sessions: scenarioSessions,
        aovAvg: scenarioAovAvg,
        cvrAvg: scenarioCvrAvg,
      },
      uplift: {
        revenuePct: upliftPct(scenarioRevenue, baseRevenue),
        ordersPct: upliftPct(scenarioOrders, baseOrders),
        sessionsPct: upliftPct(scenarioSessions, baseSessions),
        aovPct: upliftPct(scenarioAovAvg, baseAovAvg),
        cvrPct:
          scenarioCvrAvg != null && baseCvrAvg != null
            ? upliftPct(scenarioCvrAvg, baseCvrAvg)
            : null,
      },
    };
  });

  const risk = computeRisk({
    cfg,
    totals,
    driverVol: args.driverVolatility,
    metaConnected: args.metaConnected ?? false,
  });

  return { config: cfg, days, totals, risk };
}

function computeRisk(args: {
  cfg: ScenarioConfig;
  totals: ScenarioTotals[];
  driverVol?: { sessionsCoefVar?: number | null; cvrCoefVar?: number | null; aovCoefVar?: number };
  metaConnected: boolean;
}): ScenarioRisk {
  const reasons: string[] = [];

  // Magnitude of assumptions
  const magnitude =
    Math.abs(args.cfg.metaSpendChangePct) +
    Math.abs(args.cfg.cpcChangePct) +
    Math.abs(args.cfg.organicTrafficGrowthPct) +
    Math.abs(args.cfg.emailTrafficGrowthPct) +
    Math.abs(args.cfg.overallCvrUpliftPct) +
    Math.abs(args.cfg.checkoutCompletionUpliftPct) +
    Math.abs(args.cfg.aovChangePct) +
    Math.abs(args.cfg.discountIntensityChangePct) +
    Math.abs(args.cfg.refundRateChangePct);

  let score = 0;
  score += clamp(magnitude / 250, 0, 3); // 0..3

  // Volatility sensitivity
  const volSessions = args.driverVol?.sessionsCoefVar ?? 0.5;
  const volCvr = args.driverVol?.cvrCoefVar ?? 0.7;
  const volAov = args.driverVol?.aovCoefVar ?? 0.7;
  score += clamp((volSessions + volCvr + volAov) / 2.2, 0, 2); // 0..2

  // Dependency concentration: heavy meta reliance
  const metaDelta = Math.abs(args.cfg.metaSpendChangePct) + Math.abs(args.cfg.cpcChangePct);
  if (metaDelta > 80) {
    score += 1;
    reasons.push('Growth depends heavily on Meta spend/efficiency assumptions.');
  }
  if (!args.metaConnected && metaDelta !== 0) {
    score += 0.75;
    reasons.push('Meta is not connected; paid-traffic assumptions are less verifiable.');
  }

  // Growth-quality penalty: revenue up mainly from AOV while orders down
  const t30 = args.totals.find((t) => t.horizonDays === 30);
  if (t30) {
    const revUp = (t30.uplift.revenuePct ?? 0) > 0;
    const ordersDown = (t30.uplift.ordersPct ?? 0) < 0;
    const aovUp = (t30.uplift.aovPct ?? 0) > 0;
    if (revUp && ordersDown && aovUp) {
      score += 1.25;
      reasons.push('Revenue grows mainly from higher AOV, but orders decline (AOV-led growth risk).');
    }
  }

  // Inventory caps
  if (args.cfg.inventoryCapOrdersPerDay != null) {
    score += 0.75;
    reasons.push('Inventory cap may limit upside (orders clamped).');
  }
  if (args.cfg.stockOutDate) {
    score += 1.0;
    reasons.push('Stock-out date may cut growth short.');
  }

  const label: RiskLabel =
    score >= 4.25 ? 'High' : score >= 2.5 ? 'Medium' : 'Low';

  if (!reasons.length) {
    reasons.push('Assumptions are within typical ranges and drivers are reasonably stable.');
  }

  return { label, reasons: reasons.slice(0, 3) };
}

