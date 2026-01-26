'use client';

import { useMemo, useRef, useState } from 'react';

type Point = { x: number; y: number };

export type ForecastBandPoint = {
  date: string; // YYYY-MM-DD
  expected: number;
  best: number;
  worst: number;
};

export function ForecastRevenueChart(props: {
  title: string;
  subtitle?: string;
  today: string; // YYYY-MM-DD
  currencyFormatter: (n: number) => string;
  historical: Array<{ date: string; value: number }>;
  forecast: ForecastBandPoint[]; // DAILY forecast values (future dates only)
}) {
  const width = 960;
  const height = 320;
  const margin = { top: 24, right: 24, bottom: 38, left: 54 };
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const model = useMemo(() => {
    const hist = props.historical;
    const fc = props.forecast;

    // Convert DAILY forecast into CUMULATIVE projection (tomorrow onward).
    let cum = 0;
    let cumBest = 0;
    let cumWorst = 0;
    const fcCum = fc.map((p) => {
      cum += p.expected;
      cumBest += p.best;
      cumWorst += p.worst;
      return {
        date: p.date,
        expected: cum,
        best: cumBest,
        worst: cumWorst,
      };
    });

    const allDates = [...hist.map((p) => p.date), ...fcCum.map((p) => p.date)];
    const allValues = [
      ...hist.map((p) => p.value),
      ...fcCum.map((p) => p.expected),
    ];
    const allBest = [...hist.map((p) => p.value), ...fcCum.map((p) => p.best)];
    const allWorst = [...hist.map((p) => p.value), ...fcCum.map((p) => p.worst)];

    const n = allDates.length;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const quantile = (values: number[], q: number) => {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      const a = sorted[base] ?? 0;
      const b = sorted[base + 1] ?? a;
      return a + (b - a) * rest;
    };

    // Forecast-first scaling:
    // - keep history only as context
    // - avoid a single spike flattening the forecast line
    const histVals = hist.map((p) => Math.max(0, p.value));
    const fcHigh = fcCum.map((p) => Math.max(0, p.best));
    const fcLow = fcCum.map((p) => Math.max(0, p.worst));

    const robustHistMax = quantile(histVals, 0.9);
    const robustHistMin = quantile(histVals, 0.05);
    const forecastMax = fcHigh.length ? Math.max(...fcHigh) : 0;
    const forecastMin = fcLow.length ? Math.min(...fcLow) : 0;

    const yMin = Math.min(0, forecastMin, robustHistMin);
    const yMax = Math.max(1, forecastMax, robustHistMax);
    const pad = (yMax - yMin) * 0.14;
    const y0 = yMin - pad;
    const y1 = yMax + pad;

    const xForIndex = (i: number) =>
      margin.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
    const yForValue = (v: number) => {
      // Clamp drawing to keep forecast readable (history is context).
      const vv = Math.max(y0, Math.min(y1, v));
      return margin.top + (1 - (vv - y0) / (y1 - y0 || 1)) * innerH;
    };

    const histLen = hist.length;
    const todayIndex =
      hist.findIndex((p) => p.date === props.today) >= 0
        ? hist.findIndex((p) => p.date === props.today)
        : Math.max(0, histLen - 1);

    const toPoints = (vals: number[]): Point[] =>
      vals.map((v, i) => ({ x: xForIndex(i), y: yForValue(v) }));

    const pointsExpected = toPoints(allValues);
    const pointsBest = toPoints(allBest);
    const pointsWorst = toPoints(allWorst);

    const pathFromPoints = (pts: Point[]) =>
      pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');

    const histPath = pathFromPoints(pointsExpected.slice(0, histLen));
    // Forecast starts AFTER today (tomorrow onward), so don't connect to historical.
    const forecastPath = pathFromPoints(pointsExpected.slice(histLen));

    const bandUpper = pointsBest.slice(histLen);
    const bandLower = pointsWorst.slice(histLen).reverse();
    const bandPath =
      bandUpper.length && bandLower.length
        ? [
            `M ${bandUpper[0].x.toFixed(2)} ${bandUpper[0].y.toFixed(2)}`,
            ...bandUpper
              .slice(1)
              .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
            ...bandLower.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
            'Z',
          ].join(' ')
        : '';

    const todayX = xForIndex(todayIndex);

    const yTicks = 4;
    const tickValues = Array.from({ length: yTicks }, (_, i) => {
      const t = i / (yTicks - 1);
      return y0 + (y1 - y0) * (1 - t);
    });

    return {
      allDates,
      allValues,
      allBest,
      allWorst,
      pointsExpected,
      pointsBest,
      pointsWorst,
      histLen,
      todayIndex,
      todayX,
      yForValue,
      y0,
      y1,
      tickValues,
      histPath,
      forecastPath,
      bandPath,
      lastDate: allDates[allDates.length - 1] ?? props.today,
      innerW,
      innerH,
    };
  }, [props.forecast, props.historical, props.today, margin.bottom, margin.left, margin.right, margin.top]);

  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

  const indexFromSvgX = (x: number) => {
    const n = model.allDates.length;
    if (n <= 1) return 0;
    const step = model.innerW / (n - 1);
    const i = Math.round((x - margin.left) / step);
    return clamp(i, 0, n - 1);
  };

  const onPointerMove = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;
    const i = indexFromSvgX(x);
    setHoverIndex(i);
    setHoverPos({ x, y });
  };

  const onPointerLeave = () => {
    setHoverIndex(null);
    setHoverPos(null);
  };

  const tooltip = useMemo(() => {
    if (hoverIndex == null) return null;
    const date = model.allDates[hoverIndex] ?? '';
    const isForecast = hoverIndex >= model.histLen;
    const expected = model.allValues[hoverIndex] ?? 0;
    const best = model.allBest[hoverIndex] ?? expected;
    const worst = model.allWorst[hoverIndex] ?? expected;
    return {
      date,
      isForecast,
      expected,
      best,
      worst,
      point: model.pointsExpected[hoverIndex],
    };
  }, [hoverIndex, model]);

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{props.title}</h3>
          {props.subtitle ? (
            <p className="text-sm text-slate-500">{props.subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-slate-800" />
            Actual (daily, context)
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-0.5 w-6 rounded-full bg-indigo-600"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to right, rgb(79 70 229) 0 8px, transparent 8px 14px)',
              }}
            />
            Forecast (cumulative)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-6 rounded bg-indigo-200/60" />
            Confidence band
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[320px] w-full"
        role="img"
        aria-label="Revenue forecast chart"
        ref={svgRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <defs>
          <linearGradient id="piBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(79 70 229)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="rgb(79 70 229)" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {model.tickValues.map((v, i) => {
          const y = model.yForValue(v);
          const isTopOrBottom = i === 0 || i === model.tickValues.length - 1;
          return (
            <g key={i}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                stroke="rgb(226 232 240)"
                strokeWidth="1"
              />
              <text
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill={isTopOrBottom ? 'rgb(100 116 139)' : 'rgb(148 163 184)'}
              >
                {props.currencyFormatter(Math.max(0, v))}
              </text>
            </g>
          );
        })}

        {/* Y axis label */}
        <text
          x={margin.left}
          y={margin.top - 8}
          fontSize="12"
          fill="rgb(100 116 139)"
          fontWeight={600}
        >
          Cumulative Revenue
        </text>

        {/* Confidence band (forecast only) */}
        {model.bandPath ? (
          <path d={model.bandPath} fill="url(#piBand)" />
        ) : null}

        {/* Historical actual (solid) */}
        <path
          d={model.histPath}
          fill="none"
          stroke="rgb(15 23 42)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Forecast expected (dotted) - cumulative */}
        <path
          d={model.forecastPath}
          fill="none"
          stroke="rgb(79 70 229)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="6 6"
        />

        {/* Hover target area */}
        <rect
          x={margin.left}
          y={margin.top}
          width={width - margin.left - margin.right}
          height={height - margin.top - margin.bottom}
          fill="transparent"
        />

        {/* Hover marker + tooltip */}
        {tooltip && tooltip.point ? (
          <g>
            <line
              x1={tooltip.point.x}
              x2={tooltip.point.x}
              y1={margin.top}
              y2={height - margin.bottom}
              stroke="rgb(203 213 225)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <circle
              cx={tooltip.point.x}
              cy={tooltip.point.y}
              r={4.5}
              fill={tooltip.isForecast ? 'rgb(79 70 229)' : 'rgb(15 23 42)'}
              stroke="white"
              strokeWidth="2"
            />

            {/* Tooltip box */}
            {hoverPos ? (() => {
              const boxW = 190;
              const boxH = tooltip.isForecast ? 64 : 46;
              const pad = 10;
              const x = clamp(hoverPos.x + 14, margin.left, width - margin.right - boxW);
              const y = clamp(hoverPos.y - boxH - 10, margin.top, height - margin.bottom - boxH);
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={boxW}
                    height={boxH}
                    rx={12}
                    fill="rgb(15 23 42)"
                    opacity={0.92}
                  />
                  <text
                    x={x + pad}
                    y={y + 18}
                    fontSize="12"
                    fill="rgb(226 232 240)"
                    fontWeight={600}
                  >
                    {tooltip.date}
                  </text>
                  <text
                    x={x + pad}
                    y={y + 36}
                    fontSize="12"
                    fill="rgb(241 245 249)"
                  >
                    {tooltip.isForecast ? 'Cumulative: ' : 'Actual: '}
                    {props.currencyFormatter(tooltip.expected)}
                  </text>
                  {tooltip.isForecast ? (
                    <text
                      x={x + pad}
                      y={y + 54}
                      fontSize="11"
                      fill="rgb(148 163 184)"
                    >
                      Range: {props.currencyFormatter(tooltip.worst)}–{props.currencyFormatter(tooltip.best)}
                    </text>
                  ) : null}
                </g>
              );
            })() : null}
          </g>
        ) : null}

        {/* Today marker */}
        <line
          x1={model.todayX}
          x2={model.todayX}
          y1={margin.top}
          y2={height - margin.bottom}
          stroke="rgb(148 163 184)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
        <rect
          x={model.todayX - 26}
          y={margin.top - 18}
          width={52}
          height={18}
          rx={9}
          fill="rgb(241 245 249)"
          stroke="rgb(226 232 240)"
        />
        <text
          x={model.todayX}
          y={margin.top - 5}
          textAnchor="middle"
          fontSize="11"
          fill="rgb(71 85 105)"
        >
          Today
        </text>

        {/* X labels (Today + end) */}
        <text
          x={model.todayX}
          y={height - 14}
          textAnchor="middle"
          fontSize="11"
          fill="rgb(100 116 139)"
        >
          {props.today}
        </text>
        <text
          x={width - margin.right}
          y={height - 14}
          textAnchor="end"
          fontSize="11"
          fill="rgb(148 163 184)"
        >
          {model.lastDate}
        </text>
      </svg>
    </div>
  );
}

