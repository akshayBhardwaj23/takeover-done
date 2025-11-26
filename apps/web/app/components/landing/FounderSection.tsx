'use client';

import { useState, useEffect, useRef } from 'react';

type AutomationSceneId =
  | 'inbox'
  | 'marketing'
  | 'support'
  | 'sales'
  | 'dashboard'
  | 'closing';

function AutomationShowcase() {
  const scenes: Array<{
    id: AutomationSceneId;
    label: string;
    caption: string;
    accent: string;
  }> = [
    {
      id: 'inbox',
      label: 'Inbox Automation',
      caption: '2:14 AM',
      accent: 'from-emerald-300 via-cyan-300 to-sky-400',
    },
    {
      id: 'marketing',
      label: 'Marketing Automation',
      caption: 'Campaign Engine',
      accent: 'from-sky-300 via-indigo-300 to-violet-400',
    },
    {
      id: 'support',
      label: 'Support Panel',
      caption: 'Customer Delight',
      accent: 'from-cyan-300 via-emerald-300 to-teal-300',
    },
    {
      id: 'sales',
      label: 'Sales Panel',
      caption: 'Upsell Engine',
      accent: 'from-amber-300 via-orange-300 to-rose-300',
    },
    {
      id: 'dashboard',
      label: 'Dashboard Update',
      caption: 'Impact Report',
      accent: 'from-purple-300 via-sky-300 to-emerald-300',
    },
    {
      id: 'closing',
      label: 'Overnight Autopilot',
      caption: 'Working While You Sleep',
      accent: 'from-cyan-300 via-white/80 to-indigo-300',
    },
  ];

  const cursorPositions: Array<{ top: string; left: string }> = [
    { top: '68%', left: '78%' },
    { top: '44%', left: '70%' },
    { top: '58%', left: '64%' },
    { top: '46%', left: '68%' },
    { top: '54%', left: '54%' },
    { top: '60%', left: '50%' },
  ];

  const [sceneIndex, setSceneIndex] = useState(0);
  const [isScenePaused, setIsScenePaused] = useState(false);
  const loopTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isScenePaused) return;

    loopTimeoutRef.current = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % scenes.length);
    }, 4000);

    return () => {
      if (loopTimeoutRef.current) {
        clearInterval(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    };
  }, [isScenePaused, scenes.length]);

  useEffect(() => {
    return () => {
      if (loopTimeoutRef.current) clearInterval(loopTimeoutRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  const handleSceneSelect = (index: number) => {
    setSceneIndex(index);
    setIsScenePaused(true);

    if (loopTimeoutRef.current) {
      clearInterval(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = setTimeout(() => {
      setIsScenePaused(false);
    }, 5000);
  };

  const renderSceneContent = (
    sceneId: AutomationSceneId,
    isActive: boolean,
  ) => {
    switch (sceneId) {
      case 'inbox':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Inbox Automation · 2:14 AM
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-sm text-white/80 shadow-inner shadow-black/20">
                “Hi! My order arrived but I need a larger size.”
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition duration-500 ${
                  isActive ? 'shadow-[0_0_25px_rgba(52,211,153,0.35)]' : ''
                }`}
              >
                <span
                  className={`inline-flex h-2 w-2 rounded-full bg-emerald-300 ${
                    isActive ? 'animate-ping' : ''
                  }`}
                />
                <span>AI Detected Intent</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                <span className="text-lg leading-none">✔</span>
                Replacement processed automatically.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 01
              </span>
            </div>
          </div>
        );
      case 'marketing':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Marketing Automation
              </p>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-violet-500/10 p-5 text-sm text-white/80 shadow-inner shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    Next campaign queued
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    2 channels
                  </span>
                </div>
                <p className="mt-4 text-xs text-white/70">
                  Personalized win-back emails scheduled for 7:00 AM with SMS
                  follow-up.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs text-white/70 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Audience
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">VIP</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">
                    Ready
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">+18%</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-400 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 02
              </span>
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Support Panel
              </p>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-teal-500/10 p-5 text-sm text-white/80 shadow-inner shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    Ticket closed with CSAT 5.0
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Resolved
                  </span>
                </div>
                <p className="mt-4 text-xs text-white/70">
                  AI reply approved · Replacement order sent · Customer thanked.
                </p>
              </div>
              <div className="space-y-3 text-xs text-white/70">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="uppercase tracking-[0.25em] text-white/40">
                    Handle Time
                  </span>
                  <span className="text-sm font-semibold text-emerald-200">
                    -62%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="uppercase tracking-[0.25em] text-white/40">
                    Macros Used
                  </span>
                  <span className="text-sm font-semibold text-white">
                    Auto-detected
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-teal-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 03
              </span>
            </div>
          </div>
        );
      case 'sales':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Sales Panel
              </p>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 p-5 text-sm text-white/80 shadow-inner shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    Upsell offer generated automatically
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Personalized
                  </span>
                </div>
                <p className="mt-4 text-xs text-white/70">
                  “Bundle + Free Express Shipping” queued for approval.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    AOV Impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">+12%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Confidence
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">
                    High
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 04
              </span>
            </div>
          </div>
        );
      case 'dashboard':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Dashboard Update
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Customer satisfied', complete: true },
                  { label: 'Ads optimized', complete: true },
                  { label: 'Report generated', complete: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-sm text-emerald-300">✅</span>
                    </div>
                    <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-300 via-sky-300 to-emerald-300 transition-all duration-[1400ms] ease-out"
                        style={{ width: isActive ? '100%' : '22%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-300 via-sky-300 to-emerald-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 05
              </span>
            </div>
          </div>
        );
      case 'closing':
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/80 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Overnight Autopilot
            </p>
            <h3 className="text-3xl font-black tracking-tight text-white">
              ZYYP — Working While You Sleep.
            </h3>
            <p className="max-w-sm text-sm text-white/70">
              Automations keep shipping, marketing, support, and insights
              humming while you rest.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="relative flex h-[360px] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0B0F1E]/95 via-[#0C192D]/90 to-[#111827]/95 p-6 text-white shadow-2xl shadow-cyan-500/10 md:p-8">
        <div className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-6 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/50">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            {scenes[sceneIndex].label}
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-white/40">
            {scenes[sceneIndex].caption}
          </span>
        </div>
        <div className="relative mt-6 flex-1">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              className={`absolute inset-0 z-10 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                sceneIndex === index
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-6 opacity-0'
              }`}
              onClick={() => handleSceneSelect(index)}
            >
              {renderSceneContent(scene.id, sceneIndex === index)}
            </div>
          ))}
          <div
            className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-40 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              top: cursorPositions[sceneIndex].top,
              left: cursorPositions[sceneIndex].left,
            }}
          >
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border border-white/30 shadow-[0_0_18px_rgba(255,255,255,0.25)]" />
              <div className="absolute inset-3 rounded-full border border-white/20" />
              <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-2 px-2">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => handleSceneSelect(index)}
            className={`h-1 flex-1 rounded-full transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
              sceneIndex === index
                ? `scale-y-[1.8] bg-gradient-to-r ${scene.accent} shadow-[0_0_14px_rgba(56,189,248,0.45)]`
                : 'bg-white/10 hover:bg-white/20'
            }`}
            aria-label={`Show ${scene.label}`}
          />
        ))}
      </div>
    </div>
  );
}

function AutomationPoster() {
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0B0F1E]/95 via-[#0C192D]/90 to-[#111827]/95 p-6 text-white shadow-xl shadow-cyan-500/10">
      <div className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          Inbox Automation · 2:14 AM
        </p>
        <div className="mt-4 space-y-4 text-sm text-white/80">
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-inner shadow-black/20">
            “Hi! My order arrived but I need a larger size.”
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            <span>AI Detected Intent</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
            <span className="text-lg leading-none">✔</span>
            Replacement processed automatically.
          </div>
        </div>
      </div>
      <div className="mt-6 h-1 w-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300" />
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/40">
        ZYYP — Working While You Sleep.
      </p>
    </div>
  );
}

export default function FounderSection() {
  const founderRef = useRef<HTMLDivElement | null>(null);
  const [founderInView, setFounderInView] = useState(false);
  const [showAutomationTip, setShowAutomationTip] = useState(false);

  useEffect(() => {
    if (!founderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setFounderInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(founderRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={founderRef}
      className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-24 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.18)_0,rgba(15,23,42,0)_60%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
        <div
          className={`w-full space-y-6 transition-all duration-700 ${
            founderInView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          } lg:w-[40%]`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Made for Founders
          </div>
          <h2 className="text-3xl font-black md:text-4xl">
            Run your business like a $100M brand - even if you’re solo.
          </h2>
          <p className="text-lg text-white/70">
            ZYYP gives entrepreneurs and teams enterprise-grade automation,
            analytics, and growth intelligence — without extra hires.
          </p>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 shadow-lg shadow-cyan-500/10">
            <p className="italic">
              “Finally, an AI that runs my business while I sleep.”
            </p>
            <span className="mt-3 block text-xs uppercase tracking-[0.3em] text-white/50">
              Founder, Slick Stiles
            </span>
          </div>
        </div>
        <div
          className={`relative w-full lg:w-[60%] ${
            founderInView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          } transition-all duration-700`}
          style={{ transitionDelay: '160ms' }}
        >
          <div
            className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0D0D16]/90 via-[#0F1B2E]/90 to-[#111827]/95 p-6 shadow-2xl shadow-cyan-500/10 md:p-8"
            onMouseEnter={() => setShowAutomationTip(true)}
            onMouseLeave={() => setShowAutomationTip(false)}
          >
            <div className="absolute -left-12 top-12 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0,rgba(15,23,42,0)_70%)]" />

            <div className="relative hidden md:block">
              <AutomationShowcase />
            </div>

            <div className="relative block md:hidden">
              <AutomationPoster />
            </div>

            {showAutomationTip && (
              <div className="pointer-events-none absolute -top-4 right-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 shadow-lg shadow-cyan-500/10 backdrop-blur founder-fade-in">
                <span>AI just automated another task 💡</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
