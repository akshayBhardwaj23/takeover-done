'use client';

import { useEffect, useMemo, useState } from 'react';

export type LinePoint = { date: string; value: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDateLabel(dateKey: string) {
  // dateKey expected: YYYY-MM-DD
  if (!dateKey || dateKey.length < 10) return dateKey || '';
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(5, 7));
  const d = Number(dateKey.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  // Use fixed labels like "Jan 26"
  const dt = new Date(Date.UTC(y, Math.max(0, m - 1), d));
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(dt);
}

function niceTickLabel(v: number) {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${Math.round(v).toLocaleString()}`;
  if (abs >= 100) return `${Math.round(v)}`;
  if (abs >= 10) return `${Math.round(v * 10) / 10}`;
  return `${Math.round(v * 100) / 100}`;
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

function catmullRomToBezier(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return '';
  const d: string[] = [];
  d.push(`M${points[0]!.x},${points[0]!.y}`);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`);
  }
  return d.join(' ');
}

function areaPath(points: Array<{ x: number; y: number }>, baseY: number) {
  if (!points.length) return '';
  const line = catmullRomToBezier(points);
  const last = points[points.length - 1]!;
  const first = points[0]!;
  return `${line} L${last.x},${baseY} L${first.x},${baseY} Z`;
}

function findPeakIndices(values: number[]) {
  const peaks: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i]! > values[i - 1]! && values[i]! > values[i + 1]!) peaks.push(i);
  }
  return peaks;
}

export function PremiumLineChart(props: {
  title: string;
  tooltip?: string;
  scopeLabel: string;
  confidenceLabel: 'High' | 'Medium' | 'Experimental';
  series: LinePoint[];
  secondarySeries?: LinePoint[];
  secondaryLabel?: string;
  variant?: 'demand' | 'cpc' | 'neutral';
  latestSuffix?: string;
}) {
  const width = 900;
  const height = 260;
  const pad = { left: 24, right: 24, top: 22, bottom: 28 };

  const model = useMemo(() => {
    const primary = (props.series || []).filter((p) => Number.isFinite(p.value));
    const secondary = (props.secondarySeries || []).filter((p) => Number.isFinite(p.value));
    const n = Math.max(primary.length, secondary.length);
    if (n < 2) {
      return {
        empty: true,
        primaryPath: '',
        primaryArea: '',
        secondaryPath: '',
        latest: null as null | { x: number; y: number; value: number },
        peaks: [] as Array<{ x: number; y: number }>,
        yMin: 0,
        yMax: 1,
        firstDate: '',
        midDate: '',
        lastDate: '',
      };
    }

    const xs = Array.from({ length: n }, (_, i) =>
      pad.left + (i * (width - pad.left - pad.right)) / Math.max(1, n - 1),
    );

    const allValues = [
      ...primary.map((p) => p.value),
      ...secondary.map((p) => p.value),
    ];
    const { min, max } = extent(allValues.length ? allValues : [0, 1]);
    const span = max - min || 1;
    const yFor = (v: number) =>
      pad.top +
      (1 - (v - min) / span) * (height - pad.top - pad.bottom);

    const primaryPts = primary.map((p, i) => ({
      x: xs[i] ?? pad.left,
      y: yFor(p.value),
      v: p.value,
    }));
    const secondaryPts = secondary.map((p, i) => ({
      x: xs[i] ?? pad.left,
      y: yFor(p.value),
      v: p.value,
    }));

    const primaryPath = catmullRomToBezier(primaryPts);
    const baseY = height - pad.bottom;
    const primaryArea = areaPath(primaryPts, baseY);

    const secondaryPath = secondaryPts.length ? catmullRomToBezier(secondaryPts) : '';

    const vals = primary.map((p) => p.value);
    const peakIdx = findPeakIndices(vals).slice(-5);
    const peaks = peakIdx
      .map((idx) => primaryPts[idx])
      .filter(Boolean)
      .map((p) => ({ x: p!.x, y: p!.y }));

    const last = primaryPts[primaryPts.length - 1]!;
    const firstDate = primary.length ? String(primary[0]!.date || '') : '';
    const lastDate = primary.length ? String(primary[primary.length - 1]!.date || '') : '';
    const midDate =
      primary.length >= 3 ? String(primary[Math.floor((primary.length - 1) / 2)]!.date || '') : '';
    return {
      empty: false,
      primaryPath,
      primaryArea,
      secondaryPath,
      latest: { x: last.x, y: last.y, value: last.v },
      peaks,
      yMin: min,
      yMax: max,
      firstDate,
      midDate,
      lastDate,
    };
  }, [props.series, props.secondarySeries]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const gradientId = `${props.title.replace(/\s+/g, '-')}-grad`.toLowerCase();
  const strokeId = `${props.title.replace(/\s+/g, '-')}-stroke`.toLowerCase();
  const glowId = `${props.title.replace(/\s+/g, '-')}-glow`.toLowerCase();
  const bgId = `${props.title.replace(/\s+/g, '-')}-bg`.toLowerCase();

  const latestText =
    model.latest != null
      ? `${Math.round(model.latest.value * 10) / 10}${props.latestSuffix ?? ''}`
      : '';

  const confidenceTone =
    props.confidenceLabel === 'High'
      ? 'bg-emerald-50 text-emerald-700'
      : props.confidenceLabel === 'Medium'
        ? 'bg-slate-100 text-slate-700'
        : 'bg-amber-50 text-amber-800';

  return (
    <div
      className={`rounded-3xl bg-white/70 p-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur transition-all duration-500 ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-slate-900">
              {props.title}
            </div>
            {props.tooltip ? (
              <span
                className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700"
                title={props.tooltip}
              >
                i
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              Scope: {props.scopeLabel}
            </span>
            <span className={`rounded-full px-2 py-1 ${confidenceTone}`}>
              Confidence: {props.confidenceLabel}
            </span>
          </div>
        </div>
        {model.latest != null ? (
          <div className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-800">
            Latest: {latestText}
          </div>
        ) : null}
      </div>

      {model.empty ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 text-sm text-slate-600 ring-1 ring-slate-900/5">
          Not enough data to render this chart yet.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-b from-white via-white to-slate-50 ring-1 ring-slate-900/5">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
            <defs>
              {/* background tint */}
              <linearGradient id={bgId} x1="0" x2="1" y1="0" y2="1">
                {props.variant === 'demand' ? (
                  <>
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.14" />
                    <stop offset="45%" stopColor="#60a5fa" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.08" />
                  </>
                ) : props.variant === 'cpc' ? (
                  <>
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.10" />
                    <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0.10" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.10" />
                  </>
                )}
              </linearGradient>

              {/* area fill */}
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                {props.variant === 'demand' ? (
                  <>
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.24" />
                    <stop offset="55%" stopColor="#60a5fa" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </>
                ) : props.variant === 'cpc' ? (
                  <>
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
                    <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </>
                )}
              </linearGradient>

              <linearGradient id={strokeId} x1="0" x2="1" y1="0" y2="0">
                {props.variant === 'demand' ? (
                  <>
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="35%" stopColor="#60a5fa" />
                    <stop offset="70%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </>
                ) : props.variant === 'cpc' ? (
                  <>
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="55%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </>
                )}
              </linearGradient>

              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.18" />
                <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#a78bfa" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* tinted background */}
            <rect x="0" y="0" width={width} height={height} fill={`url(#${bgId})`} opacity="0.55" />

            {/* y-axis labels (min/mid/max) */}
            {(() => {
              const yTop = pad.top + 10;
              const yBottom = height - pad.bottom;
              const yMid = pad.top + 0.5 * (height - pad.top - pad.bottom);
              const yMax = model.yMax;
              const yMin = model.yMin;
              const yMidVal = (yMax + yMin) / 2;
              return (
                <>
                  <text x={6} y={yTop} fontSize="11" fill="#64748b" fontWeight="600">
                    {niceTickLabel(yMax)}
                  </text>
                  <text x={6} y={yMid + 4} fontSize="11" fill="#94a3b8" fontWeight="600">
                    {niceTickLabel(yMidVal)}
                  </text>
                  <text x={6} y={yBottom} fontSize="11" fill="#64748b" fontWeight="600">
                    {niceTickLabel(yMin)}
                  </text>
                </>
              );
            })()}

            {/* faint dotted guides */}
            {[0.25, 0.5, 0.75].map((t) => {
              const y = pad.top + t * (height - pad.top - pad.bottom);
              return (
                <line
                  key={t}
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="2 6"
                />
              );
            })}

            {/* fill */}
            <path d={model.primaryArea} fill={`url(#${gradientId})`} />

            {/* primary line */}
            <path
              d={model.primaryPath}
              fill="none"
              stroke={`url(#${strokeId})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: mounted ? 0 : 1,
                transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />

            {/* secondary line */}
            {model.secondaryPath ? (
              <path
                d={model.secondaryPath}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="3"
                strokeDasharray="7 7"
                opacity="0.85"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                style={{
                  strokeDasharray: '1 1',
                  strokeDashoffset: mounted ? 0 : 1,
                  transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            ) : null}

            {/* peak dots */}
            {model.peaks.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={5}
                fill="#ffffff"
                opacity="0.95"
                stroke="#a78bfa"
                strokeWidth="2"
                filter={`url(#${glowId})`}
              />
            ))}

            {/* latest dot + pill */}
            {model.latest ? (
              <>
                <circle
                  cx={model.latest.x}
                  cy={model.latest.y}
                  r={6}
                  fill="#ffffff"
                  opacity="0.95"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  filter={`url(#${glowId})`}
                />
                <g transform={`translate(${clamp(model.latest.x + 10, 16, width - 170)},${clamp(model.latest.y - 18, 10, height - 40)})`}>
                  <rect rx="13" ry="13" width="155" height="26" fill="#ffffff" opacity="0.72" />
                  <rect rx="13" ry="13" width="155" height="26" fill="none" stroke="#ffffff" opacity="0.55" />
                  <text x="10" y="17" fontSize="12" fill="#0f172a" fontWeight="700">
                    Latest: {latestText}
                  </text>
                </g>
              </>
            ) : null}

            {/* x-axis labels (start/mid/end) */}
            <g>
              <text
                x={pad.left}
                y={height - 6}
                fontSize="11"
                fill="#64748b"
                fontWeight="600"
              >
                {formatDateLabel(model.firstDate)}
              </text>
              {model.midDate ? (
                <text
                  x={width / 2}
                  y={height - 6}
                  fontSize="11"
                  fill="#94a3b8"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {formatDateLabel(model.midDate)}
                </text>
              ) : null}
              <text
                x={width - pad.right}
                y={height - 6}
                fontSize="11"
                fill="#64748b"
                fontWeight="600"
                textAnchor="end"
              >
                {formatDateLabel(model.lastDate)}
              </text>
            </g>

            {/* legend */}
            {props.secondarySeries && props.secondaryLabel ? (
              <g transform={`translate(${pad.left},${height - 10})`}>
                <circle cx="6" cy="-5" r="4" fill="#6366f1" opacity="0.8" />
                <text x="16" y="-1" fontSize="12" fill="#475569">
                  Store demand
                </text>
                <line x1="150" y1="-5" x2="176" y2="-5" stroke="#0ea5e9" strokeWidth="3" strokeDasharray="7 7" opacity="0.9" />
                <text x="186" y="-1" fontSize="12" fill="#475569">
                  {props.secondaryLabel}
                </text>
              </g>
            ) : null}
          </svg>
        </div>
      )}
    </div>
  );
}

