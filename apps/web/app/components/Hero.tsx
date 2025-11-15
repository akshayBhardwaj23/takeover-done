'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const EMAIL_TEXT = `Hey Jordan,

We detected a shipping delay on Order #48291, so I already queued an express reship and credited $42 back to their wallet. Let me know if you'd like me to notify the CX channel as well.

— ZYYP Autopilot`;

const EQUATIONS = [
  '∂/∂x (x² + 3x)',
  'Σ (xᵢ · wᵢ)',
  'softmax(x) = eˣ / Σ eˣ',
  '∇f(x)',
  'xᵀWx',
  'embedding_vectorₙ',
];

export default function Hero() {
  const [typedPreview, setTypedPreview] = useState('');

  useEffect(() => {
    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      setTypedPreview(EMAIL_TEXT.slice(0, index));
      index += 1;

      if (index <= EMAIL_TEXT.length) {
        timeout = setTimeout(type, 18);
      } else {
        timeout = setTimeout(() => {
          index = 0;
          type();
        }, 2200);
      }
    };

    timeout = setTimeout(type, 300);
    return () => clearTimeout(timeout);
  }, []);

  const previewProgress = typedPreview.length / EMAIL_TEXT.length;

  return (
    <>
      <section
        className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-12 text-[#1A1A1A]"
        style={{
          background: 'linear-gradient(180deg,#FFFFFF 0%,#F6F7F9 100%)',
        }}
      >
        <NeuralDepthLayer />
        <MathFormulaLayer />

        <div className="relative z-10 mt-10 flex max-w-5xl flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/70 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
            ZYYP AUTOPILOT
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-[#1A1A1A] md:text-6xl lg:text-[64px]">
            Meet <span className="gradient-text">ZYYP</span> — Your{' '}
            <span className="gradient-text">AI Autopilot</span> for Support, Analytics & Growth.
          </h1>
          <p className="max-w-3xl text-lg text-[#1A1A1A]/70">
            Watch your business run itself — replies drafted, actions taken, and insights delivered while you focus on bigger moves.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-[0_15px_45px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(0,0,0,0.25)]"
            >
              Launch your autopilot
            </Link>
            <a
              href="#live-demo"
              className="rounded-full border border-[#1A1A1A]/20 px-8 py-3 text-base font-semibold text-[#1A1A1A] backdrop-blur-sm transition hover:border-[#1A1A1A]/40"
            >
              See Live Demo
            </a>
          </div>
        </div>

        <div className="relative z-10 mt-12 flex w-full max-w-5xl justify-center px-4">
          <LivePreviewPanel text={typedPreview} progress={previewProgress} />
        </div>
      </section>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
        .gradient-text {
          background: linear-gradient(90deg, #ff6b3d, #ff9a5a, #ffcb73);
          background-size: 200%;
          animation: shimmer 7s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </>
  );
}

function LivePreviewPanel({ text, progress }: { text: string; progress: number }) {
  const orderVisible = progress > 0.35;
  const analyticsVisible = progress > 0.65;

  return (
    <motion.div
      id="live-demo"
      className="w-full max-w-4xl rounded-[18px] border border-white/70 bg-white/75 p-8 text-left text-[#1A1A1A] backdrop-blur-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/60">Live drafter preview</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/80 bg-white/80 p-5 text-sm leading-relaxed shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
          <p className="font-semibold text-[#1A1A1A]">AI drafting reply…</p>
          <p className="mt-4 whitespace-pre-line text-base text-[#1A1A1A]/80">
            {text}
            <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-[#1A1A1A]/60" />
          </p>
        </div>
        <div className="flex flex-col gap-5">
          <motion.div
            className="rounded-2xl border border-white/80 bg-white/85 p-4 text-sm text-[#1A1A1A] shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: orderVisible ? 1 : 0.3, x: orderVisible ? 0 : -30 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-[#1A1A1A]/60">
              <span>Order update</span>
              <span>Synced</span>
            </div>
            <p className="mt-3 text-base font-semibold">Order #48291 · Express reship</p>
            <p className="mt-2 text-sm text-[#1A1A1A]/60">ETA pulled forward by 2 days.</p>
          </motion.div>
          <motion.div
            className="rounded-2xl border border-white/80 bg-white/85 p-4 text-sm text-[#1A1A1A] shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: analyticsVisible ? 1 : 0.3, x: analyticsVisible ? 0 : 30 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-[#1A1A1A]/60">
              <span>Insight pulse</span>
              <span>+12%</span>
            </div>
            <p className="mt-3 text-base font-semibold">Customer sentiment rising</p>
            <motion.div
              className="mt-4 h-2 rounded-full bg-[#1A1A1A]/10"
              animate={{ background: 'linear-gradient(90deg,#1A1A1A,#4A4A4A)' }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#1A1A1A] to-[#4A4A4A]"
                animate={{ width: analyticsVisible ? '90%' : '12%' }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function NeuralDepthLayer() {
  const visuals = useMemo(() => {
    const nodes = Array.from({ length: 28 }).map((_, index) => {
      const blur = Math.random() < 0.6;
      return {
        id: `node-${index}`,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: blur ? 10 + Math.random() * 8 : 4 + Math.random() * 3,
        blur,
        opacity: blur ? 0.06 : 0.12,
        duration: 8 + Math.random() * 6,
      };
    });

    const lines = Array.from({ length: 18 }).map((_, index) => {
      const blur = Math.random() < 0.6;
      return {
        id: `line-${index}`,
        left: Math.random() * 100,
        top: Math.random() * 100,
        length: 120 + Math.random() * 180,
        angle: Math.random() * 360,
        blur,
        opacity: blur ? 0.06 : 0.12,
        duration: 10 + Math.random() * 5,
      };
    });

    return { nodes, lines };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {visuals.lines.map((line) => (
        <motion.span
          key={line.id}
          className="absolute block origin-left rounded-full bg-black"
          style={{
            left: `${line.left}%`,
            top: `${line.top}%`,
            width: line.length,
            height: 1,
            opacity: line.opacity,
            filter: line.blur ? 'blur(10px)' : 'none',
            transform: `rotate(${line.angle}deg)`,
          }}
          animate={{ x: [-2, 1, -2], y: [-1, 2, -1] }}
          transition={{ duration: line.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {visuals.nodes.map((node) => (
        <motion.span
          key={node.id}
          className="absolute block rounded-full bg-black"
          style={{
            left: `${node.left}%`,
            top: `${node.top}%`,
            width: node.size,
            height: node.size,
            opacity: node.opacity,
            filter: node.blur ? 'blur(12px)' : 'none',
          }}
          animate={{ x: [-2, 2, -2], y: [1, -1, 1] }}
          transition={{ duration: node.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function MathFormulaLayer() {
  const formulas = useMemo(
    () =>
      EQUATIONS.map((label, index) => ({
        id: `formula-${index}`,
        label,
        left: 10 + Math.random() * 80,
        top: 10 + Math.random() * 70,
        delay: Math.random() * 2,
        duration: 6 + Math.random() * 4,
        drift: Math.random() * 20 - 10,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {formulas.map((formula) => (
        <motion.span
          key={formula.id}
          className="absolute text-base font-medium"
          style={{
            left: `${formula.left}%`,
            top: `${formula.top}%`,
            color: 'rgba(0,0,0,0.05)',
            filter: 'blur(5px)',
          }}
          animate={{ opacity: [0, 0.5, 0], x: [0, formula.drift, 0] }}
          transition={{ duration: formula.duration, repeat: Infinity, ease: 'easeInOut', delay: formula.delay }}
        >
          {formula.label}
        </motion.span>
      ))}
    </div>
  );
}

