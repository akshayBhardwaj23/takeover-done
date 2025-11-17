'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const EMAIL_TEXT = `Hey Jordan,

We detected a shipping delay on Order #48291, so I already queued an express reship and credited $42 back to their wallet. Let me know if you'd like me to notify the CX channel as well.

— ZYYP Autopilot`;

export default function Hero() {
  const [typedPreview, setTypedPreview] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const configureCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(pixelRatio, pixelRatio);
    };

    const mobileOptimized = () => window.innerWidth < 640;
    const randomVelocity = () => (Math.random() - 0.5) * (mobileOptimized() ? 0.15 : 0.25);

    configureCanvas();

    let nodes = Array.from({
      length: mobileOptimized() ? 34 : 72,
    }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: mobileOptimized() ? 1 + Math.random() * 1.2 : 1.2 + Math.random() * 1.5,
      opacity: 0.12 + Math.random() * 0.08,
      vx: randomVelocity(),
      vy: randomVelocity(),
    }));

    const handleResize = () => {
      configureCanvas();
      nodes = Array.from({
        length: mobileOptimized() ? 34 : 72,
      }).map(() => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: mobileOptimized() ? 1 + Math.random() * 1.2 : 1.2 + Math.random() * 1.5,
        opacity: 0.12 + Math.random() * 0.08,
        vx: randomVelocity(),
        vy: randomVelocity(),
      }));
    };

    window.addEventListener('resize', handleResize);

    let animationFrame: number;

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const boundaryPadding = mobileOptimized() ? 12 : 20;
      const linkDistance = mobileOptimized() ? 110 : 160;
      const strokeOpacity = mobileOptimized() ? 0.1 : 0.14;

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < -boundaryPadding) n.x = window.innerWidth + boundaryPadding;
        if (n.x > window.innerWidth + boundaryPadding) n.x = -boundaryPadding;
        if (n.y < -boundaryPadding) n.y = window.innerHeight + boundaryPadding;
        if (n.y > window.innerHeight + boundaryPadding) n.y = -boundaryPadding;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(0,0,0,${n.opacity})`;
        ctx.filter = 'none';
        ctx.fill();
      });

      nodes.forEach((a, i) => {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) < linkDistance) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,0,0,${strokeOpacity})`;
            ctx.lineWidth = mobileOptimized() ? 0.8 : 1;
            ctx.stroke();
          }
        }
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    // no overlay labels active

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
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
        <div className="hero-bg absolute inset-0">
          <canvas ref={canvasRef} id="neuronCanvas" className="absolute inset-0 h-full w-full pointer-events-none" />
        </div>

        <div className="hero-content relative z-10 mt-6 mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/70 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
            ZYYP AUTOPILOT
          </div>
          <div className="flex flex-col items-center gap-5">
            <h1
              className="text-4xl font-semibold leading-tight text-[#1A1A1A] md:text-6xl lg:text-[64px]"
              style={{ letterSpacing: '0.2px', fontFamily: '"Satoshi Black","Neue Montreal",sans-serif' }}
            >
              Meet <span className="gradient-text font-black">ZYYP</span> — Your <span className="gradient-text font-black">AI Autopilot</span> for Support,
              Analytics & Growth.
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

        <div className="relative z-10 mt-12 w-full max-w-5xl px-4">
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
        .hero-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .hero-bg::before,
        .hero-bg::after {
          content: '';
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255, 214, 190, 0.22), transparent 65%);
          opacity: 0.45;
        }
        .hero-bg::before {
          bottom: 5%;
          left: -10%;
        }
        .hero-bg::after {
          top: 0;
          right: -15%;
          background: radial-gradient(circle, rgba(209, 215, 230, 0.34), transparent 65%);
        }
        #neuronCanvas {
          opacity: 0.32;
          mix-blend-mode: normal;
        }
        .hero-content {
          position: relative;
          z-index: 2;
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
      className="w-full max-w-full rounded-[24px] border border-white/70 bg-white/85 px-5 py-6 text-left text-[#1A1A1A] backdrop-blur-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:px-7 sm:py-8 lg:p-10"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/60">Live drafter preview</p>
      <div className="mt-6 grid gap-5 md:grid-cols-[1.15fr_0.95fr]">
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

