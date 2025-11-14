'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

const EMAIL_TEXT = `Hey Jordan,

We detected a shipping delay on Order #48291, so I already queued an express reship and credited $42 back to their wallet. Let me know if you'd like me to notify the CX channel as well.

— ZYYP Autopilot`;

const ORBIT_CHIPS = [
  'Refund processed · $42 saved',
  'AI drafted reply · 94% confidence',
  'Exchange started automatically',
  'Delay detected · customer notified',
  'Sentiment rising +12%',
];

const ORBIT_DURATION = 12; // seconds per full rotation

export default function Hero() {
  const [typedPreview, setTypedPreview] = useState('');
  const [chipFocus, setChipFocus] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      setTypedPreview(EMAIL_TEXT.slice(0, index));
      index += 1;

      if (index <= EMAIL_TEXT.length) {
        timeout = setTimeout(type, 20);
      } else {
        timeout = setTimeout(() => {
          index = 0;
          type();
        }, 2400);
      }
    };

    timeout = setTimeout(type, 400);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setChipFocus((prev) => (prev + 1) % ORBIT_CHIPS.length);
    }, (ORBIT_DURATION * 1000) / ORBIT_CHIPS.length);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const relativeX = event.clientX - (rect.left + rect.width / 2);
      const relativeY = event.clientY - (rect.top + rect.height / 2);
      setTilt({
        x: relativeX / rect.width * 10,
        y: -relativeY / rect.height * 10,
      });
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  const previewProgress = typedPreview.length / EMAIL_TEXT.length;

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-16 text-white"
      style={{
        background:
          'radial-gradient(circle at center,#0A2A43 0%,#001F3F 40%,#000F1F 100%)',
      }}
    >
      <NeuralBackground />
      <FloatingParticles count={20} />

      <div className="relative z-10 mt-16 flex max-w-5xl flex-col items-center text-center md:mt-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs uppercase tracking-[0.4em] text-cyan-200/80">
          ZYYP AUTOPILOT
        </div>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
          Meet ZYYP — Your AI Autopilot for Support, Analytics & Growth.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-cyan-50/80">
          Watch your business run itself — replies drafted, actions taken, insights delivered. Automatically.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/integrations"
            className="rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-[0_20px_60px_rgba(46,238,245,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_25px_70px_rgba(46,238,245,0.5)]"
          >
            Launch your autopilot
          </Link>
          <a
            href="#live-demo"
            className="rounded-full border border-white/30 px-8 py-3 text-base font-semibold text-white/90 backdrop-blur-md transition hover:border-cyan-200 hover:text-white"
          >
            See Live Demo
          </a>
        </div>
      </div>

      <div className="relative z-10 mt-16 flex w-full max-w-5xl flex-col items-center">
        <AutopilotCore chips={ORBIT_CHIPS} focusIndex={chipFocus} tilt={tilt} orbitDuration={ORBIT_DURATION} />
        <LiveActivityPulse />
        <LivePreviewPanel text={typedPreview} progress={previewProgress} />
      </div>
    </section>
  );
}

function AutopilotCore({
  chips,
  focusIndex,
  tilt,
  orbitDuration,
}: {
  chips: string[];
  focusIndex: number;
  tilt: { x: number; y: number };
  orbitDuration: number;
}) {
  const radius = 235;

  return (
    <motion.div
      className="relative mt-16 h-[420px] w-[420px] max-w-full rounded-full border border-cyan-300/10 bg-white/5 p-6"
      style={{
        transformStyle: 'preserve-3d',
        overflow: 'visible',
      }}
      animate={{
        rotateX: tilt.y,
        rotateY: tilt.x,
      }}
      transition={{ type: 'spring', stiffness: 80, damping: 12, mass: 0.8 }}
    >
      <motion.div
        className="absolute inset-3 rounded-full border border-cyan-200/30 bg-gradient-to-b from-white/10 to-transparent blur-xl"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
      />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(46,238,245,0.45),rgba(0,20,30,0.3))] blur-[30px]" />
      <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full border border-cyan-200/30 bg-white/5 backdrop-blur-3xl">
        <CoreParticles />
        <div className="flex flex-col items-center text-center text-cyan-100">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">Autopilot Core</p>
          <p className="mt-3 text-3xl font-semibold text-white">Live</p>
          <p className="mt-2 text-sm text-cyan-100/70">Actions streaming in realtime</p>
        </div>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        animate={{ rotate: 360 }}
        transition={{ duration: orbitDuration, repeat: Infinity, ease: 'linear' }}
      >
        {chips.map((label, index) => {
          const angle = (360 / chips.length) * index;
          const isActive = focusIndex === index;
          return (
            <motion.div
              key={label}
              className="absolute left-1/2 top-1/2 flex w-[220px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border border-cyan-200/20 bg-white/10 px-4 py-3 text-sm text-cyan-50/80 shadow-[0_15px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
              style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)` }}
              animate={{
                scale: isActive ? 1.05 : 0.92,
                opacity: isActive ? 1 : 0.65,
                filter: isActive ? 'blur(0px)' : 'blur(0.5px)',
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-200 to-cyan-400 shadow-[0_0_12px_rgba(46,238,245,0.8)]" />
              <p className="text-xs font-medium text-white">{label}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function CoreParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, index) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 90;
        return {
          id: index,
          angle,
          distance,
          duration: 5 + Math.random() * 4,
          delay: Math.random() * 2,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2EEEF5]"
          style={{ opacity: 0.45 }}
          initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
          animate={{
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

function LiveActivityPulse() {
  return (
    <div className="mt-10 flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-cyan-100/80 backdrop-blur-2xl">
      <span className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">Live activity pulse</span>
      <span className="flex items-center text-base text-white">
        ZYYP is processing tasks in realtime
        <span className="ml-3 flex gap-2">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-cyan-200/80"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

function LivePreviewPanel({ text, progress }: { text: string; progress: number }) {
  const orderVisible = progress > 0.35;
  const analyticsVisible = progress > 0.65;

  return (
    <motion.div
      id="live-demo"
      className="mt-16 w-full rounded-[28px] border border-white/15 bg-white/5 p-8 text-left text-white backdrop-blur-3xl shadow-[0_50px_120px_rgba(0,0,0,0.45)]"
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Live preview</p>
      <div className="mt-5 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-relaxed text-white/90">
          <p className="font-semibold text-cyan-100">AI drafting reply…</p>
          <p className="mt-4 whitespace-pre-line text-base text-white/80">
            {text}
            <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-cyan-200/80" />
          </p>
        </div>
        <div className="flex flex-col gap-5">
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: orderVisible ? 1 : 0, x: orderVisible ? 0 : -40 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-cyan-100/70">
              <span>Order update</span>
              <span>Synced</span>
            </div>
            <p className="mt-3 text-base text-white">Order #48291 · Express reship</p>
            <p className="mt-2 text-cyan-100/70">ETA pulled forward by 2 days.</p>
          </motion.div>
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: analyticsVisible ? 1 : 0, x: analyticsVisible ? 0 : 40 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-cyan-100/70">
              <span>Insight pulse</span>
              <span>+12%</span>
            </div>
            <p className="mt-3 text-base text-white">Customer sentiment rising</p>
            <motion.div
              className="mt-4 h-2 rounded-full bg-white/10"
              animate={{ background: 'linear-gradient(90deg,#2EEEF5,#6B95FF)' }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-400"
                animate={{ width: analyticsVisible ? '92%' : '0%' }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function FloatingParticles({ count }: { count: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        id: index,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute h-1 w-1 rounded-full bg-cyan-200/70 mix-blend-screen"
          style={{ left: `${particle.left}%`, top: `${particle.top}%` }}
          animate={{ y: [-15, 15], opacity: [0, 0.8, 0] }}
          transition={{ duration: 14, repeat: Infinity, delay: particle.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    };

    const createNodes = (): Node[] => {
      const rect = canvas.getBoundingClientRect();
      return Array.from({ length: 45 }).map(() => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 1 + Math.random() * 1.5,
      }));
    };

    let nodes: Node[] = [];

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      nodes = createNodes();
    };

    handleResize();

    let animationFrame: number;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.lineWidth = 0.6;

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > rect.width) node.vx *= -1;
        if (node.y < 0 || node.y > rect.height) node.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 180) {
            const alpha = 1 - distance / 200;
            ctx.strokeStyle = `rgba(46,238,245,${alpha * 0.35})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        ctx.fillStyle = 'rgba(46,238,245,0.65)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />;
}

