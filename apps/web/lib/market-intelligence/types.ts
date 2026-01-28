export type Direction = 'Rising' | 'Stable' | 'Declining';

export type ConfidenceLabel = 'High' | 'Medium' | 'Low';

export type SignalConfidence = {
  score: number; // 0..100
  label: ConfidenceLabel;
  reasons: string[];
};

export type MarketDemandIndex = {
  direction: Direction;
  pctChange7d: number | null;
  pctChange30d: number | null;
  pctChange90d: number | null;
  inputs: {
    // Percent changes used to form demand (when available)
    trafficMomentumPct7d: number | null;
    trafficMomentumPct30d: number | null;
    trafficMomentumPct90d: number | null;
    searchInterestPct7d: number | null;
    searchInterestPct30d: number | null;
    searchInterestPct90d: number | null;
  };
  confidence: SignalConfidence;
};

export type PricePressureLabel = 'Low' | 'Medium' | 'High';

export type PricingPressure = {
  marketAovRange: { low: number | null; high: number | null; currency: string };
  storeAov: number | null;
  marketAdjustedMedianAov: number | null;
  discountPressure: {
    direction: Direction;
    pctChange30d: number | null;
    score01: number | null; // 0..1 proxy
  };
  pricePressure: PricePressureLabel;
  confidence: SignalConfidence;
};

export type CompetitionIntensityLabel = 'Low' | 'Medium' | 'High';

export type CompetitionSignals = {
  paidSaturation: {
    label: CompetitionIntensityLabel;
    cpcInflationDirection: Direction;
    cpcInflationPct30d: number | null;
    evidence: {
      cpcMA7: number | null;
      cpcPrev30: number | null;
      ctrMA7: number | null;
    };
    confidence: SignalConfidence;
  };
  organicReach: {
    direction: Direction;
    // Proxy: store sessions trend minus demand trend
    compressionPct30d: number | null;
    confidence: SignalConfidence;
  };
};

export type StoreVsMarketLabel =
  | 'Store outperforming market'
  | 'Store underperforming market'
  | 'Store aligned with market movement';

export type StoreVsMarket = {
  label: StoreVsMarketLabel;
  evidence: {
    storeRevenuePct30d: number | null;
    storeSessionsPct30d: number | null;
    demandPct30d: number | null;
  };
  confidence: SignalConfidence;
};

export type MarketAdjustedForecast = {
  modifier: {
    sessionsMultiplier: number; // e.g. 1.08
    label: string; // “Market-adjusted (demand proxy)”
    reason: string;
  };
  totals: {
    horizonDays: 7 | 30 | 90;
    baseRevenue: number;
    marketAdjustedRevenue: number;
    deltaRevenue: number;
  }[];
  confidence: SignalConfidence;
};

export type MarketRecommendation = {
  title: string;
  rationale: string;
  ctas: Array<
    | { type: 'what_if'; label: string }
    | { type: 'view_market_adjusted_forecast'; label: string }
  >;
  confidence: ConfidenceLabel;
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  value: number;
};

export type MarketTrendDrivers = {
  demandIndex: TrendPoint[]; // 0..100 indexed series
  searchInterest?: TrendPoint[]; // 0..100 (Google Trends)
  discountInterest?: TrendPoint[]; // 0..100 (Google Trends proxy)
  cpc?: TrendPoint[]; // numeric
};

export type PredictiveInsightsSummary = {
  currency: string;
  today: string;
  forecastTotals: Array<{
    horizonDays: 7 | 30 | 90;
    expected: number;
    best: number;
    worst: number;
  }>;
  confidence: { score: number; label: ConfidenceLabel; reasons: string[] };
};

export type WhatIfActiveScenario = {
  id: string;
  name: string;
  // Minimal summary needed for chat grounding
  outputs?: unknown;
};

export type MarketIntelligenceContext = {
  shop: string;
  store: {
    shopDomain: string;
    storeName: string | null;
    category: string | null;
    timezone: string;
    currency: string;
  };
  generatedAt: string;
  marketPulse: {
    demand: MarketDemandIndex;
    pricing: PricingPressure;
    competition: CompetitionSignals;
    storeVsMarket: StoreVsMarket;
    buyerIntent: {
      state: 'Strong' | 'Neutral' | 'Weak';
      confidence: SignalConfidence;
      reasons: string[];
    };
  };
  drivers: MarketTrendDrivers;
  impactOnStore: {
    sessionsImpact: { direction: Direction; explanation: string };
    cvrImpact: { direction: Direction; explanation: string };
    aovImpact: { direction: Direction; explanation: string };
    forecastConfidenceImpact: { direction: Direction; explanation: string };
  };
  marketAdjustedForecast: MarketAdjustedForecast;
  predictiveInsights: PredictiveInsightsSummary;
  whatIf: {
    activeScenario: WhatIfActiveScenario | null;
  };
  recommendations: MarketRecommendation[];
  dataGaps: string[];
};

export type ChatAnswer = {
  directAnswer: string;
  marketEvidence: string[];
  storeImpact: string[];
  confidence: ConfidenceLabel;
  ctas: Array<{ label: string; href: string }>;
};

