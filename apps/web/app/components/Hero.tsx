'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const EMAIL_TEXT = `Hey Jordan,

We detected a shipping delay on Order #48291, so I already queued an express reship and credited $42 back to their wallet. Let me know if you'd like me to notify the CX channel as well.

— ZYYP Autopilot`;

const EQUATION_TOKENS = [
  'Σ',
  '∂',
  '→',
  '%',
  'α',
  'β',
  'λ',
  '•',
  '=',
  '≈',
  '⇒',
  '∂x/∂t',
  'x = 0.42',
  'w(t)=Σ(aᵢ·xᵢ)',
  'softmax(x)',
  '∇f(x)',
];

const NEURON_CLUSTERS = [
  { id: 'left-upper', left: '9%', top: '20%' },
  { id: 'left-mid', left: '15%', top: '55%' },
  { id: 'right-upper', left: '78%', top: '18%' },
  { id: 'right-mid', left: '82%', top: '60%' },
  { id: 'bottom-center', left: '50%', top: '88%' },
];

type Parallax = { x: number; y: number };

export default function Hero() {
  const [typedPreview, setTypedPreview] = useState('');
  const [parallax, setParallax] = useState<Parallax>({ x: 0, y: 0 });

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

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      setParallax({
        x: ((event.clientX - innerWidth / 2) / innerWidth) * 10,
        y: ((event.clientY - innerHeight / 2) / innerHeight) * 10,
      });
    };
    window.addEventListener('pointermove', handler);
    return () => window.removeEventListener('pointermove', handler);
  }, []);

  const previewProgress = typedPreview.length / EMAIL_TEXT.length;

  return (
    <>
      <section
        className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-[170px] text-[#1A1A1A]"
        style={{
          background: 'linear-gradient(180deg,#FFFFFF 0%,#F6F7F9 100%)',
          fontFamily: '"General Sans","Inter Tight",sans-serif',
        }}
      >
        <NeuronBackground parallax={parallax} />
        <EquationField parallax={parallax} />

        <div className="relative z-10 mt-6 flex max-w-5xl flex-col items-center text-center gap-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/70 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
            ZYYP AUTOPILOT
          </div>
          <div className="flex flex-col items-center gap-5">
            <h1
              className="text-4xl font-semibold leading-tight text-[#1A1A1A] md:text-6xl lg:text-[64px]"
              style={{ letterSpacing: '0.2px', fontFamily: '"Satoshi Black","Neue Montreal",sans-serif' }}
            >
              Meet <span className="gradient-text font-black">ZYYP</span> — Your{' '}
              <span className="gradient-text font-black">AI Autopilot</span> for Support, Analytics & Growth.
            </h1>
            <span className="block h-px w-32 bg-gradient-to-r from-transparent via-[#1A1A1A]/20 to-transparent" />
          </div>
          <p className="max-w-[620px] text-lg text-[#1A1A1A]/70">
            Watch your business run itself — replies drafted, actions taken, and insights delivered while you focus on bigger moves.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
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
      className="w-full max-w-[115%] rounded-[24px] border border-white/70 bg-white/80 p-10 text-left text-[#1A1A1A] backdrop-blur-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/60">Live drafter preview</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[1.15fr_0.95fr]">
        <motion.div
          className="rounded-2xl border border-white/80 bg-white/85 p-6 text-sm leading-relaxed shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        >
          <p className="font-semibold text-[#1A1A1A]">AI drafting reply…</p>
          <p className="mt-4 whitespace-pre-line text-base text-[#1A1A1A]/80">
            {text}
            <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-[#1A1A1A]/60" />
          </p>
        </motion.div>
        <div className="flex flex-col gap-5">
          <motion.div
            className="rounded-2xl border border-white/80 bg-white/80 p-5 text-sm text-[#1A1A1A] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
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
            className="rounded-2xl border border-white/80 bg-white/80 p-5 text-sm text-[#1A1A1A] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
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

function NeuronBackground({ parallax }: { parallax: Parallax }) {
  const clusters = useMemo(
    () =>
      NEURON_CLUSTERS.map((cluster) => ({
        ...cluster,
        nodes: Array.from({ length: 5 }).map((_, index) => ({
          id: `${cluster.id}-node-${index}`,
          x: (Math.random() - 0.5) * 70,
          y: (Math.random() - 0.5) * 50,
        })),
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.55), transparent 75%)',
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.55), transparent 75%)',
      }}
    >
      {clusters.map((cluster) => (
        <div key={cluster.id} className="absolute" style={{ left: cluster.left, top: cluster.top }}>
          {cluster.nodes.map((node, index) => (
            <motion.span
              key={node.id}
              className="absolute block rounded-full"
              style={{
                width: index % 2 === 0 ? 3 : 4,
                height: index % 2 === 0 ? 3 : 4,
                background:
                  'radial-gradient(circle, rgba(255,165,100,0.35) 0%, rgba(255,165,100,0) 70%)',
                boxShadow: '0 0 6px rgba(255,165,100,0.25)',
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
              animate={{
                x: [node.x, node.x + parallax.x * 0.3, node.x],
                y: [node.y, node.y + parallax.y * 0.3 + (index % 2 === 0 ? 1 : -1), node.y],
                opacity: [0.95, 1, 0.95],
              }}
              transition={{ duration: 9 + index, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          {cluster.nodes.slice(0, cluster.nodes.length - 1).map((node, index) => {
            const next = cluster.nodes[index + 1];
            const dx = next.x - node.x;
            const dy = next.y - node.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <motion.span
                key={`${cluster.id}-line-${index}`}
                className="absolute block origin-left rounded-full"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: length,
                  height: 1,
                  background: 'rgba(0,0,0,0.06)',
                  transform: `rotate(${angle}deg)`,
                }}
                animate={{ opacity: [0.6, 0.9, 0.6], x: [0, parallax.x * 0.1, 0], y: [0, parallax.y * 0.1, 0] }}
                transition={{ duration: 10 + index, repeat: Infinity, ease: 'easeInOut' }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EquationField({ parallax }: { parallax: Parallax }) {
  const layers = useMemo(() => {
    const generateLayer = (count: number, blur: number, opacity: number, speed: number) =>
      Array.from({ length: count }).map((_, index) => {
        let left = 0;
        let top = 0;
        do {
          left = Math.random() * 100;
          top = Math.random() * 100;
        } while (left > 30 && left < 70 && top > 28 && top < 68);
        return {
          id: `eq-${blur}-${index}`,
          token: EQUATION_TOKENS[Math.floor(Math.random() * EQUATION_TOKENS.length)],
          left,
          top,
          blur,
          opacity,
          duration: speed + Math.random() * 4,
          driftX: (Math.random() - 0.5) * 25,
          driftY: (Math.random() - 0.5) * 25,
          scale: 0.8 + Math.random() * 0.6,
          rotation: -10 + Math.random() * 20,
          delay: Math.random() * 2,
        };
      });
    return {
      near: generateLayer(12, 2, 0.08, 10),
      mid: generateLayer(14, 4, 0.05, 14),
      far: generateLayer(18, 6, 0.03, 18),
    };
  }, []);

  const renderLayer = (items: ReturnType<typeof useMemo>['near'], depth: number) =>
    items.map((item) => (
      <motion.span
        key={item.id}
        className="absolute text-base font-light tracking-wide"
        style={{
          left: `${item.left}%`,
          top: `${item.top}%`,
          color: depth === 0 ? 'rgba(0,0,0,0.08)' : depth === 1 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
          filter: `blur(${item.blur}px)`,
          fontSize: `${item.scale}rem`,
          transform: `rotate(${item.rotation}deg) translateZ(0)`,
        }}
        animate={{
          opacity: [item.opacity * 0.6, item.opacity, item.opacity * 0.6],
          x: [0, item.driftX + parallax.x * 0.2, 0],
          y: [0, item.driftY + parallax.y * 0.2, 0],
        }}
        transition={{
          duration: item.duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: item.delay,
        }}
      >
        {item.token}
      </motion.span>
    ));

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {renderLayer(layers.far, 2)}
      {renderLayer(layers.mid, 1)}
      {renderLayer(layers.near, 0)}
    </div>
  );
}

