'use client';

import { useMemo, useRef, useState } from 'react';

export type CumulativePoint = {
  date: string; // YYYY-MM-DD
  baseCumRevenue: number;
  scenarioCumRevenue: number;
  baseCumLow: number;
  baseCumHigh: number;
  scenarioCumLow: number;
  scenarioCumHigh: number;
  baseCumOrders: number;
  scenarioCumOrders: number;
  baseCumSessions: number;
  scenarioCumSessions: number;
  scenarioDayAov: number;
  scenarioDayCvr: number | null;
};

type Point = { x: number; y: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function WhatIfCumulativeChart(props: {
  title: string;
  subtitle?: string;
  currencyFormatter: (n: number) => string;
  points: CumulativePoint[]; // tomorrow onward only
}) {
  const width = 960;
  const height = 360;
  const margin = { top: 28, right: 24, bottom: 44, left: 66 };
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const model = useMemo(() => {
    const n = props.points.length;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const xForIndex = (i: number) =>
      margin.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);

    const yValues = props.points.flatMap((p) => [
      p.baseCumLow,
      p.baseCumHigh,
      p.scenarioCumLow,
      p.scenarioCumHigh,
    ]);
    const yMin = Math.min(0, ...yValues);
    const yMax = Math.max(1, ...yValues);
    const pad = (yMax - yMin) * 0.12;
    const y0 = yMin - pad;
    const y1 = yMax + pad;
    const yForValue = (v: number) =>
      margin.top + (1 - (v - y0) / (y1 - y0 || 1)) * innerH;

    const basePts: Point[] = props.points.map((p, i) => ({
      x: xForIndex(i),
      y: yForValue(p.baseCumRevenue),
    }));
    const scenarioPts: Point[] = props.points.map((p, i) => ({
      x: xForIndex(i),
      y: yForValue(p.scenarioCumRevenue),
    }));

    const baseBandUpper: Point[] = props.points.map((p, i) => ({
      x: xForIndex(i),
      y: yForValue(p.baseCumHigh),
    }));
    const baseBandLower: Point[] = props.points
      .map((p, i) => ({
        x: xForIndex(i),
        y: yForValue(p.baseCumLow),
      }))
      .reverse();

    const scenarioBandUpper: Point[] = props.points.map((p, i) => ({
      x: xForIndex(i),
      y: yForValue(p.scenarioCumHigh),
    }));
    const scenarioBandLower: Point[] = props.points
      .map((p, i) => ({
        x: xForIndex(i),
        y: yForValue(p.scenarioCumLow),
      }))
      .reverse();

    const pathFromPoints = (pts: Point[]) =>
      pts
        .map(
          (p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
        )
        .join(' ');

    const bandPath = (upper: Point[], lowerRev: Point[]) =>
      upper.length && lowerRev.length
        ? [
            `M ${upper[0]!.x.toFixed(2)} ${upper[0]!.y.toFixed(2)}`,
            ...upper
              .slice(1)
              .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
            ...lowerRev.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
            'Z',
          ].join(' ')
        : '';

    const basePath = pathFromPoints(basePts);
    const scenarioPath = pathFromPoints(scenarioPts);

    const baseBandPath = bandPath(baseBandUpper, baseBandLower);
    const scenarioBandPath = bandPath(scenarioBandUpper, scenarioBandLower);

    // Delta area between base and scenario expected
    const deltaAreaPath = bandPath(scenarioPts, [...basePts].reverse());

    const yTicks = 4;
    const tickValues = Array.from({ length: yTicks }, (_, i) => {
      const t = i / (yTicks - 1);
      return y0 + (y1 - y0) * (1 - t);
    });

    const idx7 = Math.min(6, n - 1);
    const idx30 = Math.min(29, n - 1);
    const idx90 = Math.min(89, n - 1);

    return {
      n,
      innerW,
      innerH,
      xForIndex,
      yForValue,
      tickValues,
      basePts,
      scenarioPts,
      basePath,
      scenarioPath,
      baseBandPath,
      scenarioBandPath,
      deltaAreaPath,
      markers: [
        { label: '7d', index: idx7 },
        { label: '30d', index: idx30 },
        { label: '90d', index: idx90 },
      ],
    };
  }, [props.points]);

  const indexFromSvgX = (x: number) => {
    const n = model.n;
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
    const p = props.points[hoverIndex];
    if (!p) return null;
    const delta = p.scenarioCumRevenue - p.baseCumRevenue;
    return {
      ...p,
      delta,
      point: model.scenarioPts[hoverIndex],
    };
  }, [hoverIndex, model.scenarioPts, props.points]);

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
            <span className="h-0.5 w-6 rounded-full bg-slate-400" />
            Base
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-indigo-600" />
            Scenario
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-6 rounded bg-indigo-200/60" />
            Delta
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-[360px] w-full"
        role="img"
        aria-label="What-if cumulative revenue chart"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <defs>
          <linearGradient id="piDelta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(79 70 229)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(79 70 229)" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {model.tickValues.map((v, i) => {
          const y = model.yForValue(v);
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
                fill="rgb(100 116 139)"
              >
                {props.currencyFormatter(Math.max(0, v))}
              </text>
            </g>
          );
        })}

        <text
          x={margin.left}
          y={margin.top - 10}
          fontSize="12"
          fill="rgb(100 116 139)"
          fontWeight={600}
        >
          Cumulative Revenue
        </text>

        {/* Delta shading */}
        <path d={model.deltaAreaPath} fill="url(#piDelta)" />

        {/* Base line */}
        <path
          d={model.basePath}
          fill="none"
          stroke="rgb(148 163 184)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Scenario line */}
        <path
          d={model.scenarioPath}
          fill="none"
          stroke="rgb(79 70 229)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Marker chips at 7/30/90 */}
        {model.markers.map((m) => {
          const p = props.points[m.index];
          const pt = model.scenarioPts[m.index];
          if (!p || !pt) return null;
          const label = `${m.label}: ${props.currencyFormatter(p.scenarioCumRevenue)}`;
          const chipW = Math.max(86, Math.min(180, label.length * 6.2));
          const chipH = 18;
          const x = clamp(pt.x - chipW / 2, margin.left, width - margin.right - chipW);
          const y = clamp(pt.y - 26, margin.top, height - margin.bottom - chipH);
          return (
            <g key={m.label}>
              <circle cx={pt.x} cy={pt.y} r={4.5} fill="rgb(79 70 229)" stroke="white" strokeWidth={2} />
              <rect
                x={x}
                y={y}
                width={chipW}
                height={chipH}
                rx={9}
                fill="rgb(241 245 249)"
                stroke="rgb(226 232 240)"
              />
              <text
                x={x + 8}
                y={y + 12.5}
                fontSize="11"
                fill="rgb(71 85 105)"
                fontWeight={600}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Hover overlay */}
        <rect
          x={margin.left}
          y={margin.top}
          width={width - margin.left - margin.right}
          height={height - margin.top - margin.bottom}
          fill="transparent"
        />

        {tooltip && tooltip.point && hoverPos ? (
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
              r={5}
              fill="rgb(79 70 229)"
              stroke="white"
              strokeWidth="2"
            />

            {(() => {
              const boxW = 280;
              const boxH = 92;
              const pad = 10;
              const x = clamp(
                hoverPos.x + 14,
                margin.left,
                width - margin.right - boxW,
              );
              const y = clamp(
                hoverPos.y - boxH - 10,
                margin.top,
                height - margin.bottom - boxH,
              );
              const deltaLabel =
                tooltip.delta >= 0
                  ? `+${props.currencyFormatter(tooltip.delta)}`
                  : `-${props.currencyFormatter(Math.abs(tooltip.delta))}`;
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
                    fontWeight={700}
                  >
                    {tooltip.date}
                  </text>
                  <text x={x + pad} y={y + 36} fontSize="12" fill="rgb(241 245 249)">
                    Cumulative: {props.currencyFormatter(tooltip.scenarioCumRevenue)} ({deltaLabel})
                  </text>
                  <text x={x + pad} y={y + 54} fontSize="11" fill="rgb(148 163 184)">
                    Range: {props.currencyFormatter(tooltip.scenarioCumLow)}–{props.currencyFormatter(tooltip.scenarioCumHigh)}
                  </text>
                  <text x={x + pad} y={y + 72} fontSize="11" fill="rgb(226 232 240)">
                    Sessions: {Math.round(tooltip.scenarioCumSessions).toLocaleString()} · Orders: {Math.round(tooltip.scenarioCumOrders).toLocaleString()}
                  </text>
                  <text x={x + pad} y={y + 88} fontSize="11" fill="rgb(226 232 240)">
                    AOV: {props.currencyFormatter(tooltip.scenarioDayAov)} · CVR: {tooltip.scenarioDayCvr == null ? '—' : `${(tooltip.scenarioDayCvr * 100).toFixed(2)}%`}
                  </text>
                </g>
              );
            })()}
          </g>
        ) : null}
      </svg>
    </div>
  );
}

