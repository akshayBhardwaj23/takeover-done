'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

const DRAFT_TEXT =
  "Hi! We've processed an exchange for your order. A replacement is already on the way. Let us know if you need anything else!";

const PLAYBOOK_STEPS = [
  'Inventory checked',
  'Replacement created',
  'Customer updated',
  'CRM synced',
];

const STAGE_DURATIONS = [1200, 1300, 2000, 1700, 1500] as const;
const FINAL_STAGE = STAGE_DURATIONS.length - 1;

const popupCard =
  'z-[2] border border-white/15 bg-white/10 px-7 py-6 text-left text-sm text-white/85 shadow-[0_30px_80px_rgba(4,5,12,0.55)] rounded-[22px] backdrop-blur-[32px]';

const popupVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.94, filter: 'blur(12px)' },
  visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
};

type Parallax = { x: number; y: number };

export default function Hero() {
  const [stage, setStage] = useState(0);
  const [typedDraft, setTypedDraft] = useState('');
  const [playbookProgress, setPlaybookProgress] = useState(0);
  const [parallax, setParallax] = useState<Parallax>({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement | null>(null);

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
    const handleMove = (event: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const relativeX = event.clientX - (rect.left + rect.width / 2);
      const relativeY = event.clientY - (rect.top + rect.height / 2);
      setParallax({
        x: relativeX / 40,
        y: relativeY / 40,
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const analyticsActive = stage >= FINAL_STAGE;

  const noiseTexture = useMemo(
    () =>
      'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%271%27/%3E%3C/filter%3E%3Crect width=%2740%27 height=%2740%27 filter=%27url(%23n)%27 opacity=%270.12%27/%3E%3C/svg%3E")',
    [],
  );

  const blobs = useMemo(
    () => [
      { id: 'blob-1', className: 'left-[6%] top-[8%]', color: '#FF8A5C', opacity: 0.35, delay: 0, depth: 1.2 },
      { id: 'blob-2', className: 'right-[10%] top-[34%]', color: '#FF6A3D', opacity: 0.3, delay: 4, depth: 0.9 },
      { id: 'blob-3', className: 'left-[18%] bottom-[8%]', color: '#FCE3DA', opacity: 0.4, delay: 8, depth: 0.6 },
    ],
    [],
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 6,
        duration: 12 + Math.random() * 8,
      })),
    [],
  );

  return (
    <section
      ref={heroRef}
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

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {blobs.map((blob) => (
          <div
            key={blob.id}
            className={`absolute h-[320px] w-[320px] ${blob.className}`}
            style={{
              transform: `translate3d(${parallax.x * blob.depth}px, ${parallax.y * blob.depth}px, 0)`,
            }}
          >
            <motion.div
              className="h-full w-full rounded-full blur-[160px]"
              style={{ backgroundColor: blob.color, opacity: blob.opacity }}
              animate={{ y: [0, -40, 20, 0], x: [0, 30, -15, 0] }}
              transition={{ duration: 20, ease: 'easeInOut', repeat: Infinity, delay: blob.delay }}
            />
          </div>
        ))}

        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: particle.left,
              top: particle.top,
              transform: `translate3d(${parallax.x * 0.2}px, ${parallax.y * 0.2}px, 0)`,
            }}
          >
            <motion.div
              className="h-1 w-1 rounded-full bg-white/70 blur-[1px]"
              animate={{ y: [0, -80], opacity: [0, 0.7, 0] }}
              transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: 'easeInOut' }}
            />
          </div>
        ))}
      </div>

      <div className="relative z-[3] flex max-w-5xl flex-col items-center text-center text-white">
        <h1 className="text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
          Meet ZYYP — Your AI Autopilot for Support, Analytics & Growth.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/85">
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

      <div className="relative z-[3] mt-16 flex w-full max-w-6xl flex-col items-center">
        <div className="relative grid min-h-[620px] w-full place-items-center">
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

function PopupInbox({ stage, parallax }: { stage: number; parallax: Parallax }) {
  return (
    <div
      className="absolute left-[6%] top-1/2 -translate-y-1/2"
      style={{ transform: `translate3d(${parallax.x * 1.2}px, ${parallax.y * 1.2}px, 0)` }}
    >
      <motion.div
        className={`${popupCard} w-[360px]`}
        variants={popupVariants}
        initial="hidden"
        animate={stage >= 0 ? 'visible' : 'hidden'}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-white/55">
          <span>Inbox</span>
          <span>2:14 AM</span>
        </div>
        <p className="mt-4 text-base text-white">
          “Hi, I need to exchange my order. Got the wrong size.”
        </p>
        <motion.div
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em]"
          animate={stage >= 0 ? { opacity: [0.5, 1, 0.5] } : { opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]" />
          AI detecting intent
        </motion.div>
      </motion.div>
    </div>
  );
}

function PopupOrder({ stage, parallax }: { stage: number; parallax: Parallax }) {
  return (
    <div
      className="absolute right-[6%] top-1/2 -translate-y-1/2"
      style={{ transform: `translate3d(${parallax.x * 0.9}px, ${parallax.y * 0.9}px, 0)` }}
    >
      <motion.div
        className={`${popupCard} w-[360px]`}
        variants={popupVariants}
        initial="hidden"
        animate={stage >= 1 ? 'visible' : 'hidden'}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Order Panel</p>
        <div className="mt-4 flex items-center justify-between text-base text-white">
          <span>Order #48291</span>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.3em] text-white/65">
            Delivered
          </span>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">
          <p>Items — Hoodie (Size M)</p>
          <p className="mt-2 text-white/60">Detected intent: Exchange</p>
        </div>
      </motion.div>
    </div>
  );
}

function PopupDraft({
  stage,
  typedText,
  parallax,
}: {
  stage: number;
  typedText: string;
  parallax: Parallax;
}) {
  return (
    <div
      className="absolute right-[5%] bottom-[8%]"
      style={{ transform: `translate3d(${parallax.x * 0.7}px, ${parallax.y * 0.7}px, 0)` }}
    >
      <motion.div
        className={`${popupCard} w-[430px]`}
        variants={popupVariants}
        initial="hidden"
        animate={stage >= 2 ? 'visible' : 'hidden'}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-white/55">
          <span>AI Draft</span>
          <span>Live</span>
        </div>
        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-base leading-relaxed text-white/90">
          <p>{typedText}</p>
          {stage === 2 && typedDraftProgress(typedText) && (
            <span className="inline-flex h-5 w-1 animate-pulse rounded-full bg-white/85" />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function typedDraftProgress(current: string) {
  return current.length < DRAFT_TEXT.length;
}

function PopupPlaybook({
  stage,
  progress,
  parallax,
}: {
  stage: number;
  progress: number;
  parallax: Parallax;
}) {
  return (
    <div
      className="absolute left-[5%] bottom-[10%]"
      style={{ transform: `translate3d(${parallax.x * 1.1}px, ${parallax.y * 1.1}px, 0)` }}
    >
      <motion.div
        className={`${popupCard} w-[330px]`}
        variants={popupVariants}
        initial="hidden"
        animate={stage >= 3 ? 'visible' : 'hidden'}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Exchange playbook</p>
        <div className="mt-4 space-y-3 text-sm">
          {PLAYBOOK_STEPS.map((step, index) => (
            <motion.div
              key={step}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-white/85"
              animate={{
                opacity: stage > 3 || progress > index ? 1 : stage === 3 ? 0.35 : 0.1,
                x: stage > 3 || progress > index ? 0 : -10,
              }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.1 }}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[0.65rem] ${
                  progress > index || stage > 3
                    ? 'border-[#ff8a5c]/80 bg-[#ff8a5c]/25 text-white'
                    : 'border-white/30 text-white/50'
                }`}
              >
                ✔
              </span>
              <span>{step}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function PopupAnalytics({
  stage,
  active,
  parallax,
}: {
  stage: number;
  active: boolean;
  parallax: Parallax;
}) {
  const metrics = [
    { label: 'CSAT Projection', value: '+18%' },
    { label: 'Time saved', value: '4m 12s' },
    { label: 'Revenue risk prevented', value: '$240' },
  ];

  return (
    <div
      className="absolute left-1/2 top-[58%]"
      style={{ transform: `translate3d(${parallax.x * 0.6}px, ${parallax.y * 0.6}px, 0)` }}
    >
      <motion.div
        className={`${popupCard} w-[460px] -translate-x-1/2`}
        variants={popupVariants}
        initial="hidden"
        animate={stage >= 4 ? 'visible' : 'hidden'}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Analytics pulse</p>
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
                  background: active ? 'linear-gradient(90deg,#ff8a5c,#ff4ebd)' : 'rgba(255,255,255,0.15)',
                }}
              >
                <motion.span
                  className="block h-full rounded-full bg-gradient-to-r from-[#ff8a5c] to-[#ff4ebd]"
                  animate={{ width: active ? ['16%', '92%'] : '18%' }}
                  transition={{ duration: 1.3, delay: index * 0.1, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

