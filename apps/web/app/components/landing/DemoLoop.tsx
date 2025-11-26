'use client';

import { useState, useEffect } from 'react';

export default function DemoLoop() {
  const [activeScene, setActiveScene] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const demoScenes = [
    {
      id: 'email',
      title: 'Customer email arrives',
      description: 'ZYYP reads intent, sentiment, and critical data instantly.',
    },
    {
      id: 'draft',
      title: 'AI drafts the perfect reply',
      description:
        'Suggested response + Shopify action appears, ready for approval.',
    },
    {
      id: 'insight',
      title: 'Insight surfaces',
      description:
        '"Response time reduced 42%" — clear impact in your dashboard.',
    },
    {
      id: 'performance',
      title: 'Growth metrics climb',
      description:
        'Performance graph highlights “Sales up 12%” to keep momentum.',
    },
  ];

  const cursorPositions: Array<{ top: string; left: string }> = [
    { top: '32%', left: '72%' },
    { top: '56%', left: '64%' },
    { top: '38%', left: '44%' },
    { top: '62%', left: '58%' },
  ];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(
      () => setActiveScene((prev) => (prev + 1) % demoScenes.length),
      5000,
    );

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section className="bg-white py-20 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
        <div className="w-full space-y-6 lg:w-[40%]">
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
            See ZYYP Power Your Business.
          </h2>
          <p className="text-lg text-slate-600">
            A silent, looping walkthrough that shows how ZYYP triages customer
            emails, drafts replies, and surfaces the analytics that keep every
            team ahead.
          </p>
          <div className="space-y-4">
            {demoScenes.map((scene, index) => (
              <button
                key={scene.id}
                type="button"
                className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all duration-500 ${
                  index === activeScene
                    ? 'border border-slate-900/15 bg-white text-slate-900 shadow-xl shadow-slate-900/10'
                    : 'border border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
                }`}
                onClick={() => {
                  setActiveScene(index);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 5000);
                }}
              >
                <span
                  className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                    index === activeScene
                      ? 'border-slate-900/10 bg-slate-900/5 text-slate-900'
                      : 'border-slate-200 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p
                    className={`text-base font-semibold ${
                      index === activeScene
                        ? 'text-slate-900'
                        : 'text-slate-700'
                    }`}
                  >
                    {scene.title}
                  </p>
                  <p
                    className={`text-sm ${
                      index === activeScene
                        ? 'text-slate-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {scene.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full overflow-visible lg:w-[60%]">
          <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl shadow-slate-900/10">
            {/* Ambient overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18)_0,rgba(255,255,255,0)_65%)]" />

            {/* Scene 1 */}
            <div
              className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                activeScene === 0
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
            >
              <div className="mx-auto w-full max-w-md rounded-3xl border border-cyan-400/30 bg-white p-6 text-left shadow-xl shadow-cyan-500/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-lg text-cyan-600">
                    ✉️
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Email from Maya
                    </p>
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      2 minutes ago
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  “Order arrived damaged. Need a replacement or refund ASAP.”
                </p>
                <div
                  className={`mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700 ${
                    activeScene === 0 ? 'animate-glow' : ''
                  }`}
                >
                  intent read
                </div>
              </div>
            </div>

            {/* Scene 2 */}
            <div
              className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                activeScene === 1
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
            >
              <div className="mx-auto w-full max-w-lg rounded-[28px] border border-purple-400/40 bg-white p-6 shadow-xl shadow-purple-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                      draft reply
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      AI Response
                    </h3>
                  </div>
                  <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-700">
                    97% confidence
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    Hi Maya — thanks for letting us know. I’ve already queued a
                    replacement to ship today with express delivery.
                  </p>
                  <p>
                    You’ll receive tracking in the next 2 hours. If you prefer a
                    refund, just reply to this email.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-purple-600/80">
                  <span className="rounded-full bg-purple-500/10 px-3 py-1">
                    action: create replacement order
                  </span>
                  <span className="rounded-full border border-purple-400/40 px-3 py-1">
                    smart summary
                  </span>
                </div>
              </div>
            </div>

            {/* Scene 3 */}
            <div
              className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                activeScene === 2
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
            >
              <div className="mx-auto w-full max-w-lg rounded-[28px] border border-emerald-400/30 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 p-6 text-left shadow-lg shadow-emerald-500/15">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-lg text-emerald-600">
                    📊
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-600/80">
                      insight
                    </p>
                    <h3 className="text-lg font-semibold text-emerald-900">
                      Response time reduced 42%
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm text-emerald-700/80">
                  Thanks to instant AI triage, the support team cleared
                  high-priority cases before they aged.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-emerald-700/80">
                  <div className="rounded-2xl border border-emerald-400/30 bg-white/80 p-3">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-500/80">
                      csat
                    </p>
                    <p className="text-lg font-semibold text-emerald-900">
                      4.8 / 5
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/30 bg-white/80 p-3">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-500/80">
                      approvals automated
                    </p>
                    <p className="text-lg font-semibold text-emerald-900">
                      78%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scene 4 */}
            <div
              className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                activeScene === 3
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
            >
              <div className="mx-auto w-full max-w-xl rounded-[28px] border border-sky-400/30 bg-white p-6 shadow-xl shadow-sky-500/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-sky-500/80">
                      performance
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Sales up 12%
                    </h3>
                  </div>
                  <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-700">
                    last 30 days
                  </span>
                </div>
                <div className="mt-4 h-40 w-full rounded-2xl bg-gradient-to-tr from-sky-200/40 via-transparent to-sky-100/50 p-4">
                  <div className="flex h-full items-end gap-2">
                    {[22, 32, 44, 56, 68, 74, 82].map((value, index) => (
                      <div
                        key={index}
                        className={`flex-1 rounded-full bg-sky-400/60 transition-all duration-500 ${
                          activeScene === 3 ? 'animate-rise' : ''
                        }`}
                        style={{
                          height: `${value}%`,
                          animationDelay: `${index * 0.12}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-sky-600/80">
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 px-3 py-1">
                    📈 Forecast improved
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 px-3 py-1">
                    ⚡ Playbooks enabled
                  </span>
                </div>
              </div>
            </div>

            {/* Cursor */}
            <div
              className="pointer-events-none absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/60 shadow-lg shadow-slate-400/20 backdrop-blur transition-all duration-700 ease-out"
              style={{
                top: cursorPositions[activeScene]?.top,
                left: cursorPositions[activeScene]?.left,
              }}
            >
              <div className="h-2 w-2 rounded-full bg-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
