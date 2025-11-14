'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const DRAFT_TEXT =
  "Hi! We've processed an exchange for your order. A replacement is already on the way. Let us know if you need anything else!";

const PLAYBOOK_STEPS = [
  'Inventory checked',
  'Replacement created',
  'Customer updated',
  'CRM synced',
];

const STAGE_DURATIONS = [1400, 1400, 2000, 1600, 1400] as const;
const FINAL_STAGE = STAGE_DURATIONS.length - 1;

const popupBase =
  'popup border border-white/15 bg-white/10 px-7 py-6 rounded-[22px] shadow-[0_30px_90px_rgba(4,5,12,0.55)] backdrop-blur-[32px] text-left text-sm text-white/80';

export default function Hero() {
  const [stage, setStage] = useState(0);
  const [typedDraft, setTypedDraft] = useState('');
  const [playbookProgress, setPlaybookProgress] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (stage >= FINAL_STAGE) return;
    const timeout = setTimeout(() => {
      setStage((prev) => Math.min(prev + 1, FINAL_STAGE));
    }, STAGE_DURATIONS[stage]);
    return () => clearTimeout(timeout);
  }, [stage]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (stage === 2) {
      setTypedDraft('');
      let index = 0;
      interval = setInterval(() => {
        index += 1;
        setTypedDraft(DRAFT_TEXT.slice(0, index));
        if (index >= DRAFT_TEXT.length && interval) clearInterval(interval);
      }, 18);
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
        if (progress >= PLAYBOOK_STEPS.length && interval) clearInterval(interval);
      }, 260);
    } else if (stage > 3) {
      setPlaybookProgress(PLAYBOOK_STEPS.length);
    } else {
      setPlaybookProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;
      setParallax({ x, y });
    };
    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, []);

  const analyticsActive = stage >= FINAL_STAGE;

  const noiseTexture = useMemo(
    () =>
      'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%271%27/%3E%3C/filter%3E%3Crect width=%2740%27 height=%2740%27 filter=%27url(%23n)%27 opacity=%270.12%27/%3E%3C/svg%3E")',
    [],
  );

  const blobs = [
    { className: 'left-[6%] top-[8%]', color: '#FF8A5C', delay: 0, depth: 0.35 },
    { className: 'right-[10%] top-[30%]', color: '#FF6A3D', delay: 4, depth: 0.25 },
    { className: 'left-[18%] bottom-[6%]', color: '#FCE3DA', delay: 8, depth: 0.2 },
  ];

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, index) => ({
        id: index,
        style: {
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        },
        delay: Math.random() * 8,
      })),
    [],
  );

  return (
    <section
      className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-white"
      style={{
        background:
          'linear-gradient(180deg,#FFF4EF 0%,#FFD7C5 20%,#FF8F6A 60%,#E14A2A 100%)',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80 mix-blend-soft-light"
        style={{ backgroundImage: noiseTexture }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {blobs.map((blob) => (
          <motion.div
            key={blob.className}
            className={`blob absolute h-[320px] w-[320px] rounded-full blur-[160px] ${blob.className}`}
            style={{ backgroundColor: blob.color, opacity: blob.color === '#FCE3DA' ? 0.4 : 0.35 }}
            animate={{ y: [0, -40, 30, 0], x: [0, 30, -20, 0] }}
            transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity, delay: blob.delay }}
          />
        ))}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-1 w-1 rounded-full bg-white/60 blur-[1px]"
            style={particle.style}
            animate={{ y: -80, opacity: [0.2, 0.6, 0] }}
            transition={{ duration: 12, ease: 'linear', repeat: Infinity, delay: particle.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 flex max-w-5xl flex-col items-center text-center text-white">
        <h1 className="text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
          Meet ZYYP — Your AI Autopilot for Support, Analytics & Growth.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/80">
          Automate interactions, analyze performance, and unlock faster growth — all from one intelligent platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/integrations"
            className="rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-orange-500/30 transition hover:-translate-y-0.5"
          >
            Launch your autopilot
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/30 px-8 py-3 text-base font-semibold text-white transition hover:border-white hover:text-white"
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="relative z-10 mt-16 flex w-full max-w-6xl flex-col items-center">
        <motion.div
          className="pointer-events-none absolute -left-8 top-4 hidden h-24 w-24 rounded-full border border-white/20 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-lg md:block"
          animate={{
            x: ['0%', '12%', '-8%', '10%', '0%'],
            y: ['0%', '10%', '-6%', '4%', '0%'],
          }}
          transition={{ duration: 12, repeat: Infinity }}
          style={{ transform: `translate(${parallax.x * 0.4}px, ${parallax.y * 0.4}px)` }}
        >
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-[38%] top-[85%] h-6 w-6 rotate-45 rounded bg-white/70 shadow-lg shadow-orange-500/30" />
        </motion.div>

        <div className="relative grid min-h-[560px] w-full place-items-center">
          <PopupInbox stage={stage} parallax={parallax} />
          <PopupOrder stage={stage} parallax={parallax} />
          <PopupDraft stage={stage} typedText={typedDraft} parallax={parallax} />
          <PopupPlaybook stage={stage} progress={playbookProgress} parallax={parallax} />
          <PopupAnalytics stage={stage} active={analyticsActive} parallax={parallax} />
        </div>
      </div>
    </section>
  );
}

function PopupInbox({ stage, parallax }: { stage: number; parallax: { x: number; y: number } }) {
  return (
    <motion.div
      className={`${popupBase} absolute left-[8%] top-[12%] w-[360px]`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={
        stage >= 0
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 30, scale: 0.95 }
      }
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ transform: `translate(${parallax.x * 1.2}px, ${parallax.y * 1.2}px)` }}
    >
      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
        <span>Inbox</span>
        <span>2:14 AM</span>
      </div>
      <p className="mt-4 text-base text-white/90">
        “Hi, I need to exchange my order. Got the wrong size.”
      </p>
      <motion.div
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em]"
        animate={stage >= 0 ? { opacity: [0.5, 1, 0.5] } : { opacity: 0 }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]" />
        AI Detecting Intent…
      </motion.div>
    </motion.div>
  );
}

function PopupOrder({ stage, parallax }: { stage: number; parallax: { x: number; y: number } }) {
  return (
    <motion.div
      className={`${popupBase} absolute right-[8%] top-[18%] w-[340px]`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={
        stage >= 1
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 30, scale: 0.95 }
      }
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ transform: `translate(${parallax.x * 0.9}px, ${parallax.y * 0.9}px)` }}
    >
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Order Panel</p>
      <div className="mt-4 flex items-center justify-between text-base text-white/90">
        <span>Order #48291</span>
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
          Delivered
        </span>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <p>Items — Hoodie (Size M)</p>
        <p className="mt-2 text-white/60">Detected intent: Exchange</p>
      </div>
    </motion.div>
  );
}

function PopupDraft({
  stage,
  typedText,
  parallax,
}: {
  stage: number;
  typedText: string;
  parallax: { x: number; y: number };
}) {
  return (
    <motion.div
      className={`${popupBase} absolute right-[6%] bottom-[8%] w-[420px]`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={
        stage >= 2
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 40, scale: 0.95 }
      }
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ transform: `translate(${parallax.x * 0.7}px, ${parallax.y * 0.7}px)` }}
    >
      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
        <span>AI Draft</span>
        <span>Live</span>
      </div>
      <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-base leading-relaxed text-white/90">
        <p>{typedText}</p>
        {stage === 2 && typedText.length < DRAFT_TEXT.length && (
          <span className="inline-flex h-4 w-1 animate-pulse rounded-full bg-white/80" />
        )}
      </div>
    </motion.div>
  );
}

function PopupPlaybook({
  stage,
  progress,
  parallax,
}: {
  stage: number;
  progress: number;
  parallax: { x: number; y: number };
}) {
  return (
    <motion.div
      className={`${popupBase} absolute left-[6%] bottom-[10%] w-[320px]`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={
        stage >= 3
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 40, scale: 0.95 }
      }
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ transform: `translate(${parallax.x * 1.1}px, ${parallax.y * 1.1}px)` }}
    >
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Exchange Playbook</p>
      <div className="mt-4 space-y-3 text-sm">
        {PLAYBOOK_STEPS.map((step, index) => (
          <motion.div
            key={step}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            animate={{
              opacity: stage > 3 || progress > index ? 1 : stage === 3 ? 0.3 : 0.1,
              x: stage > 3 || progress > index ? 0 : -12,
            }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.1 }}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                progress > index || stage > 3
                  ? 'border-[#ff8a5c]/80 bg-[#ff8a5c]/25 text-white'
                  : 'border-white/25 text-white/50'
              }`}
            >
              ✔
            </span>
            <span>{step}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function PopupAnalytics({
  stage,
  active,
  parallax,
}: {
  stage: number;
  active: boolean;
  parallax: { x: number; y: number };
}) {
  const metrics = [
    { label: 'CSAT Projection', value: '+18%' },
    { label: 'Time saved', value: '4m 12s' },
    { label: 'Revenue risk prevented', value: '$240' },
  ];

  return (
    <motion.div
      className={`${popupBase} absolute left-1/2 bottom-[4%] w-[440px] -translate-x-1/2`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={
        stage >= 4
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 40, scale: 0.95 }
      }
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ transform: `translate(${parallax.x * 0.6}px, ${parallax.y * 0.6}px)` }}
    >
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Analytics Pulse</p>
      <div className="mt-4 space-y-4 text-sm">
        {metrics.map((metric, index) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between text-white/80">
              <span>{metric.label}</span>
              <span className="font-semibold text-white">{metric.value}</span>
            </div>
            <motion.div
              className="mt-2 h-2 rounded-full bg-white/15"
              animate={{
                background: active
                  ? 'linear-gradient(90deg,#ff8a5c,#ff4ebd)'
                  : 'rgba(255,255,255,0.15)',
              }}
            >
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]"
                animate={{ width: active ? ['20%', '95%'] : '18%' }}
                transition={{ duration: 1.4, delay: index * 0.1, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const DRAFT_TEXT =
  "Hi! We've processed an exchange for your order. A replacement is already on the way. Let us know if you need anything else!";

const PLAYBOOK_STEPS = [
  'Inventory checked',
  'Replacement created',
  'Customer updated',
  'CRM synced',
];

const STAGE_DURATIONS = [1400, 1200, 1800, 1400, 1500] as const;
const FINAL_STAGE = STAGE_DURATIONS.length - 1;

const windowVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92, filter: 'blur(12px)' },
  visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
};

const glowBorder =
  'popup border border-white/15 bg-white/10 shadow-[0_30px_80px_rgba(4,5,12,0.55)] backdrop-blur-[32px] px-7 py-6 rounded-[24px]';

export default function Hero() {
  const [stage, setStage] = useState(0);
  const [typedDraft, setTypedDraft] = useState('');
  const [playbookProgress, setPlaybookProgress] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (stage >= FINAL_STAGE) return;

    const timeout = setTimeout(() => {
      setStage((prev) => Math.min(prev + 1, FINAL_STAGE));
    }, STAGE_DURATIONS[stage]);

    return () => clearTimeout(timeout);
  }, [stage]);

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

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;
      setParallax({ x, y });
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const analyticsActive = stage >= FINAL_STAGE;

  const noiseLayer = useMemo(
    () =>
      'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Cfilter id=%27n%27 x=%270%27 y=%270%27 width=%27100%25%27 height=%27100%25%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%2750%27 height=%2750%27 filter=%27url(%23n)%27 opacity=%270.12%27/%3E%3C/svg%3E")',
    [],
  );

  const blobs = [
    { className: 'left-[8%] top-[12%]', color: '#FF8A5C', delay: 0 },
    { className: 'right-[12%] top-[34%]', color: '#FF6A3D', delay: 4 },
    { className: 'left-[20%] bottom-[10%]', color: '#FCE3DA', delay: 8 },
  ];

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, index) => ({
        id: index,
        style: {
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 6}s`,
        },
      })),
    [],
  );

  return (
    <section
      className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-white"
      style={{
        background:
          'linear-gradient(180deg,#FFF4EF 0%,#FFD7C5 20%,#FF8F6A 60%,#E14A2A 100%)',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80 mix-blend-soft-light"
        style={{ backgroundImage: noiseLayer }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        {blobs.map((blob) => (
          <motion.div
            key={blob.className}
            className={`blob absolute h-[320px] w-[320px] rounded-full blur-[160px]`}
            style={{ opacity: blob.color === '#FCE3DA' ? 0.4 : 0.35, backgroundColor: blob.color }}
            animate={{ y: [0, -40, 30, 0], x: [0, 30, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: blob.delay }}
          />
        ))}
        {particles.map((particle) => (
          <div key={particle.id} className="particle absolute h-1 w-1 rounded-full" style={particle.style} />
        ))}
      </div>

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
          className="absolute -left-10 top-4 hidden h-24 w-24 rounded-full border border-white/20 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-lg md:block"
          animate={{
            x: ['0%', '12%', '-8%', '10%', '0%'],
            y: ['0%', '10%', '-6%', '4%', '0%'],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-[38%] top-[85%] h-6 w-6 rotate-45 rounded bg-white/70 shadow-lg shadow-orange-500/30" />
        </motion.div>

        <div className="relative grid min-h-[560px] w-full place-items-center">
          {/* Inbox */}
          <motion.div
            className={`absolute left-[6%] top-0 w-[320px] rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={stage >= 0 ? 'visible' : 'hidden'}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 0 ? { y: [-4, 4, -4] } : { y: 0 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
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
                animate={stage >= 0 ? { opacity: [0.6, 1, 0.6] } : { opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]" />
                AI Detecting Intent…
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Order panel */}
          <motion.div
            className={`absolute right-[8%] top-10 w-[320px] rounded-3xl ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={stage >= 1 ? 'visible' : 'hidden'}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 1 ? { y: [3, -3, 3] } : { y: 0 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
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
            className={`absolute left-1/2 top-1/2 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[32px] ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={stage >= 2 ? 'visible' : 'hidden'}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 2 ? { y: [-2, 2, -2] } : { y: 0 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
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
            className={`absolute left-[4%] bottom-[6%] w-[300px] rounded-[32px] ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={stage >= 3 ? 'visible' : 'hidden'}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 3 ? { y: [2, -2, 2] } : { y: 0 }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
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
            className={`absolute right-[6%] bottom-[4%] w-[360px] rounded-[32px] ${glowBorder}`}
            variants={windowVariants}
            initial="hidden"
            animate={stage >= 4 ? 'visible' : 'hidden'}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={stage >= 4 ? { y: [-1, 1, -1] } : { y: 0 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
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
                        background: analyticsActive
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

