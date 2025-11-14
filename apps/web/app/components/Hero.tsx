'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const DRAFT_TEXT =
  "Hi! We've processed an exchange for your order. A replacement is already on the way. Let us know if you need anything else!";

const PLAYBOOK_STEPS = [
  'Inventory checked',
  'Replacement created',
  'Customer updated',
  'CRM synced',
];

const STAGE_DURATIONS = [1200, 900, 1500, 1100, 1100, 900] as const;
const RESET_STAGE = STAGE_DURATIONS.length - 1;

const windowVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92, filter: 'blur(12px)' },
  visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: 80, scale: 0.9, filter: 'blur(16px)' },
};

const glowBorder = 'border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(4,5,12,0.55)] backdrop-blur-xl';

function getStageVariant(stage: number, threshold: number) {
  if (stage === RESET_STAGE) return 'exit';
  return stage >= threshold ? 'visible' : 'hidden';
}

export default function Hero() {
  const [stage, setStage] = useState(0);
  const [typedDraft, setTypedDraft] = useState('');
  const [playbookProgress, setPlaybookProgress] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let currentStage = 0;

    const loop = () => {
      setStage(currentStage);
      timeout = setTimeout(() => {
        currentStage = (currentStage + 1) % STAGE_DURATIONS.length;
        loop();
      }, STAGE_DURATIONS[currentStage]);
    };

    loop();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (stage === 2) {
      setTypedDraft('');
      let index = 0;
      interval = setInterval(() => {
        index += 1;
        setTypedDraft(DRAFT_TEXT.slice(0, index));
        if (index >= DRAFT_TEXT.length && interval) {
          clearInterval(interval);
        }
      }, 20);
    } else if (stage > 2) {
      setTypedDraft(DRAFT_TEXT);
    } else {
      setTypedDraft('');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (stage === 3) {
      setPlaybookProgress(0);
      let progress = 0;
      interval = setInterval(() => {
        progress += 1;
        setPlaybookProgress(progress);
        if (progress >= PLAYBOOK_STEPS.length && interval) {
          clearInterval(interval);
        }
      }, 240);
    } else if (stage > 3) {
      setPlaybookProgress(PLAYBOOK_STEPS.length);
    } else {
      setPlaybookProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage]);

  const analyticsActive = stage >= 4 && stage !== RESET_STAGE;

  return (
    <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#05060b] px-6 py-24 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,142,92,0.25)_0,rgba(2,6,23,0)_60%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,142,92,0.08),rgba(255,78,189,0.12))]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)1px,transparent_1px)] bg-[length:60px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.04)1px,transparent_1px)] bg-[length:60px] mix-blend-screen" />
      </div>
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-[40%] bg-[radial-gradient(circle,rgba(255,142,92,0.3),transparent_70%)] blur-[160px]" />
      <div className="pointer-events-none absolute right-[-5%] bottom-[-5%] h-[26rem] w-[26rem] rounded-[45%] bg-[radial-gradient(circle,rgba(255,78,189,0.35),transparent_70%)] blur-[150px]" />

      <div className="relative z-10 flex max-w-5xl flex-col items-center text-center">
        <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/80">
          Living operating system
        </p>
        <h1 className="text-4xl font-black leading-tight text-white md:text-6xl lg:text-7xl">
          Meet ZYYP — Your AI Autopilot for Support, Analytics & Growth.
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-white/70">
          Automate interactions, analyze performance, and unlock faster growth — all from one intelligent platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
          <Link
            href="/integrations"
            className="rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-orange-500/30 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Launch your autopilot
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/20 px-8 py-3 text-base font-semibold text-white transition hover:border-white hover:text-white"
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="relative mt-16 flex w-full max-w-6xl flex-col items-center">
        <motion.div
          className="absolute -left-6 top-10 hidden h-20 w-20 rounded-full border border-white/20 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-lg md:block"
          animate={{
            x: ['0%', '12%', '-8%', '10%', '0%'],
            y: ['0%', '10%', '-6%', '4%', '0%'],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-[38%] top-[85%] h-6 w-6 rotate-45 rounded bg-white/70 shadow-lg shadow-orange-500/30" />
        </motion.div>

        <div className="relative grid min-h-[520px] w-full place-items-center">
          {/* Inbox */}
          <motion.div
            className={`absolute -left-4 -top-8 w-[280px] rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={getStageVariant(stage, 0)}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 0 && stage !== RESET_STAGE ? { y: [-4, 4, -4] } : { y: 0 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/50">
                <span>Inbox</span>
                <span>2:14 AM</span>
              </div>
              <p className="mt-4 text-sm text-white/80">
                “Hi, I need to exchange my order. Got the wrong size.”
              </p>
              <motion.div
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/70"
                animate={
                  stage >= 0 && stage !== RESET_STAGE
                    ? { opacity: [0.6, 1, 0.6] }
                    : { opacity: 0 }
                }
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]" />
                AI Detecting Intent…
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Order panel */}
          <motion.div
            className={`absolute right-0 top-6 w-[260px] rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={getStageVariant(stage, 1)}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 1 && stage !== RESET_STAGE ? { y: [3, -3, 3] } : { y: 0 }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">Order Panel</p>
              <div className="mt-4 space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>Order #48291</span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
                    Delivered
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                  <p>Items — Hoodie (Size M)</p>
                  <p className="mt-2 text-white/60">Detected intent: Exchange</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* AI Draft */}
          <motion.div
            className={`absolute left-1/2 top-1/2 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={getStageVariant(stage, 2)}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 2 && stage !== RESET_STAGE ? { y: [-2, 2, -2] } : { y: 0 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/50">
                <span>AI Draft</span>
                <span>Live</span>
              </div>
              <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-relaxed text-white/80">
                <p>{typedDraft}</p>
                {stage >= 2 && typedDraft.length < DRAFT_TEXT.length && (
                  <span className="inline-flex h-4 w-1 animate-pulse rounded-full bg-white/80" />
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Playbook */}
          <motion.div
            className={`absolute left-2 bottom-0 w-[260px] rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={getStageVariant(stage, 3)}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 3 && stage !== RESET_STAGE ? { y: [2, -2, 2] } : { y: 0 }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                Exchange Playbook
              </p>
              <div className="mt-4 space-y-3">
                {PLAYBOOK_STEPS.map((step, index) => (
                  <motion.div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
                    animate={{
                      opacity:
                        stage > 3 || playbookProgress > index ? 1 : stage === 3 ? 0.3 : 0.1,
                      x: stage > 3 || playbookProgress > index ? 0 : -10,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.1 }}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                        playbookProgress > index || stage > 3
                          ? 'border-[#ff8a5c]/80 bg-[#ff8a5c]/20 text-white'
                          : 'border-white/20 text-white/40'
                      }`}
                    >
                      ✔
                    </span>
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Analytics */}
          <motion.div
            className={`absolute right-8 bottom-6 w-[320px] rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={getStageVariant(stage, 4)}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 4 && stage !== RESET_STAGE ? { y: [-1, 1, -1] } : { y: 0 }}
              transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">Analytics</p>
              <div className="mt-4 space-y-4 text-sm">
                {[
                  { label: 'CSAT Projection', value: '+18%' },
                  { label: 'Time saved', value: '4m 12s' },
                  { label: 'Revenue risk prevented', value: '$240' },
                ].map((metric, index) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex items-center justify-between text-white/70">
                      <span>{metric.label}</span>
                      <span className="font-semibold text-white">{metric.value}</span>
                    </div>
                    <motion.div
                      className="h-2 rounded-full bg-white/10"
                      animate={{
                        background:
                          analyticsActive && stage !== RESET_STAGE
                            ? 'linear-gradient(90deg,#ff8a5c,#ff4ebd)'
                            : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <motion.span
                        className="block h-full rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]"
                        animate={{
                          width: analyticsActive ? ['20%', '95%'] : '18%',
                        }}
                        transition={{
                          duration: 1.4,
                          ease: 'easeInOut',
                          delay: index * 0.1,
                        }}
                      />
                    </motion.div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

