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

        <div className="ai-equation-background">
          <span className="eq eq1">∂x/∂t</span>
          <span className="eq eq2">Σ ai·xi</span>
          <span className="eq eq3">λ = 0.42</span>
          <span className="eq eq4">→</span>
          <span className="eq eq5">α + β</span>
          <span className="eq eq6">x = 12%</span>
          <span className="eq eq7">≈ 0.98</span>
          <span className="eq eq8">w(t)</span>
          <span className="eq eq9">∂L/∂w</span>
          <span className="eq eq10">%</span>
        </div>

        <div className="hero-content relative z-10 mt-6 flex max-w-5xl flex-col items-center text-center gap-7">
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
        .ai-equation-background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .ai-equation-background .eq {
          position: absolute;
          font-size: 18px;
          font-weight: 300;
          opacity: 0.06;
          color: rgba(0, 0, 0, 0.35);
          filter: blur(2px);
          animation: floatAnim 14s ease-in-out infinite alternate;
          transform: translateZ(0);
        }
        .eq1 {
          top: 12%;
          left: 8%;
          animation-duration: 16s;
        }
        .eq2 {
          top: 22%;
          right: 12%;
          animation-duration: 18s;
        }
        .eq3 {
          top: 40%;
          left: 15%;
          animation-duration: 20s;
        }
        .eq4 {
          top: 55%;
          right: 18%;
          animation-duration: 17s;
        }
        .eq5 {
          top: 70%;
          left: 25%;
          animation-duration: 22s;
        }
        .eq6 {
          top: 30%;
          left: 42%;
          animation-duration: 19s;
        }
        .eq7 {
          top: 63%;
          right: 30%;
          animation-duration: 21s;
        }
        .eq8 {
          top: 48%;
          left: 70%;
          animation-duration: 15s;
        }
        .eq9 {
          top: 78%;
          left: 55%;
          animation-duration: 23s;
        }
        .eq10 {
          top: 15%;
          right: 40%;
          animation-duration: 20s;
        }
        @keyframes floatAnim {
          0% {
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.03;
          }
          50% {
            transform: translateY(-18px) translateX(12px) scale(1.05);
            opacity: 0.08;
          }
          100% {
            transform: translateY(12px) translateX(-10px) scale(0.95);
            opacity: 0.04;
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

