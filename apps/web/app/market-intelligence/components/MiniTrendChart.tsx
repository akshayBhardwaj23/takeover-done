'use client';

import { useMemo } from 'react';

type Point = { date: string; value: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extent(values: number[]) {
  if (!values.length) return { min: 0, max: 1 };
  let min = values[0]!;
  let max = values[0]!;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function pathFromPoints(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export function MiniTrendChart(props: {
  title: string;
  series: Point[];
  secondarySeries?: Point[];
  secondaryLabel?: string;
}) {
  const width = 520;
  const height = 120;
  const padding = { left: 36, right: 10, top: 10, bottom: 18 };

  const model = useMemo(() => {
    const primary = (props.series || []).filter((p) => Number.isFinite(p.value));
    const secondary = (props.secondarySeries || []).filter((p) => Number.isFinite(p.value));
    const n = Math.max(primary.length, secondary.length);

    const xs = Array.from({ length: n }, (_, i) =>
      padding.left + (i * (width - padding.left - padding.right)) / Math.max(1, n - 1),
    );

    const allValues = [
      ...primary.map((p) => p.value),
      ...secondary.map((p) => p.value),
    ];
    const { min, max } = extent(allValues.length ? allValues : [0, 1]);

    const yFor = (v: number) =>
      padding.top +
      (1 - (v - min) / (max - min)) * (height - padding.top - padding.bottom);

    const primaryPts = primary.map((p, i) => ({ x: xs[i] ?? padding.left, y: yFor(p.value) }));
    const secondaryPts = secondary.map((p, i) => ({ x: xs[i] ?? padding.left, y: yFor(p.value) }));

    return {
      primaryPath: pathFromPoints(primaryPts),
      secondaryPath: pathFromPoints(secondaryPts),
      yMin: min,
      yMax: max,
      lastValue: primary.length ? primary[primary.length - 1]!.value : null,
    };
  }, [props.series, props.secondarySeries]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-800">{props.title}</div>
        {model.lastValue != null && (
          <div className="text-[11px] text-slate-500">
            Latest: {Math.round(model.lastValue * 10) / 10}
          </div>
        )}
      </div>
      <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[120px] w-full">
          {/* grid */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e2e8f0" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />

          {/* primary */}
          {model.primaryPath && (
            <path d={model.primaryPath} fill="none" stroke="#0f172a" strokeWidth="2" />
          )}

          {/* secondary */}
          {model.secondaryPath && (
            <path d={model.secondaryPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" opacity="0.9" />
          )}

          {/* y labels */}
          <text x={6} y={padding.top + 10} fontSize="10" fill="#64748b">
            {Math.round(model.yMax)}
          </text>
          <text x={6} y={height - padding.bottom} fontSize="10" fill="#64748b">
            {Math.round(model.yMin)}
          </text>
        </svg>
      </div>
      {props.secondarySeries && props.secondaryLabel && (
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-900" /> {props.title}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> {props.secondaryLabel}
          </span>
        </div>
      )}
    </div>
  );
}

