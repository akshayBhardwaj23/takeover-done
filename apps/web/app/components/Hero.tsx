'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const EMAIL_TEXT = `Hey Jordan,

We detected a shipping delay on Order #48291, so I already queued an express reship and credited $42 back to their wallet. Let me know if you'd like me to notify the CX channel as well.

— ZYYP Autopilot`;

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

  useEffect(() => {
    const canvas = document.getElementById('neuronCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let nodes = Array.from({ length: 32 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      blur: Math.random() > 0.5 ? 12 : 0,
    }));

    let animationFrame: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.filter = n.blur ? `blur(${n.blur}px)` : 'none';
        ctx.fill();
      });

      nodes.forEach((a, i) => {
        nodes.forEach((b, j) => {
          if (i !== j && Math.hypot(a.x - b.x, a.y - b.y) < 150) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    const mathLayer = document.getElementById('mathLayer');
    if (mathLayer) {
      mathLayer.innerHTML = '';
      const equations = [
        '∂/∂x (x² + 3x)',
        'Σ (xᵢ × wᵢ)',
        'softmax(x) = eˣ / Σeˣ',
        '∇f(x)',
        'xᵀWx',
        'embeddingₙ • vector',
      ];

      equations.forEach((eq) => {
        const el = document.createElement('div');
        el.className = 'math-equation';
        el.textContent = eq;
        el.style.left = `${Math.random() * 90}%`;
        el.style.top = `${Math.random() * 80}%`;
        el.style.animationDuration = `${8 + Math.random() * 8}s`;
        mathLayer.appendChild(el);
      });
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  const previewProgress = typedPreview.length / EMAIL_TEXT.length;

  return (
    <>
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-6 py-[170px] text-[#1A1A1A]">
        <div className="relative overflow-hidden hero-bg w-full">
          <canvas id="neuronCanvas" className="absolute inset-0 h-full w-full pointer-events-none" />
          <div id="mathLayer" className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none" />

          <div className="hero-content relative z-10 mt-6 mx-auto flex max-w-5xl flex-col items-center text-center gap-7">
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

          <div className="relative z-10 mt-12 mx-auto flex w-full max-w-5xl justify-center px-4">
            <LivePreviewPanel text={typedPreview} progress={previewProgress} />
          </div>
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
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fb 100%);
          position: relative;
          overflow: hidden;
        }
        #neuronCanvas {
          opacity: 0.16;
          mix-blend-mode: multiply;
        }
        #mathLayer {
          opacity: 0.12;
          position: absolute;
          font-size: 18px;
          color: #000;
          filter: blur(5px);
        }
        .math-equation {
          position: absolute;
          white-space: nowrap;
          animation: floatEquation 12s linear infinite alternate;
        }
        @keyframes floatEquation {
          from {
            transform: translateY(0px);
            opacity: 0.08;
          }
          to {
            transform: translateY(-30px);
            opacity: 0.18;
          }
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

