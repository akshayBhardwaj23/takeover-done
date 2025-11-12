'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

const trustedLogos = [
  'Aurora Threads',
  'BrightCart',
  'Luna Skincare',
  'Fable Furnishings',
  'Peak Gear',
  'Nectar Living',
  'Sora Coffee',
  'Vista Outdoors',
];

const supportEvents = [
  { id: 'Order #48219', time: '2m ago', intent: 'Refund approved' },
  { id: 'Order #48102', time: '4m ago', intent: 'Shipping update sent' },
  { id: 'Order #48011', time: '9m ago', intent: 'Exchange initiated' },
  { id: 'Order #48240', time: '14m ago', intent: 'Address corrected' },
  { id: 'Order #47988', time: '18m ago', intent: 'Return instructions sent' },
  { id: 'Order #47972', time: '24m ago', intent: 'Partial refund queued' },
  { id: 'Order #47891', time: '31m ago', intent: 'Backorder ETA shared' },
  { id: 'Order #47860', time: '37m ago', intent: 'Warranty info delivered' },
  { id: 'Order #47744', time: '44m ago', intent: 'Order reshipped' },
  { id: 'Order #47611', time: '55m ago', intent: 'Product recommendation' },
  { id: 'Order #47583', time: '1h ago', intent: 'Subscription paused' },
  { id: 'Order #47492', time: '1h ago', intent: 'Invoice resent' },
];

const channelCards = [
  {
    name: 'Gmail',
    model: 'Support Inbox',
    status: 'Connected',
    badge: 'Primary',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    name: 'Shopify',
    model: 'Orders & Customers',
    status: 'Synced',
    badge: 'Realtime',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Slack',
    model: 'Escalations',
    status: 'Standby',
    badge: 'Optional',
    accent: 'from-purple-500 to-fuchsia-500',
  },
  {
    name: 'Mailgun',
    model: 'Outbound Replies',
    status: 'Active',
    badge: 'Automated',
    accent: 'from-sky-500 to-cyan-500',
  },
];

const useCases = [
  {
    title: 'Scaling DTC brands',
    description:
      'Automate repetitive order status, refund, and exchange requests while keeping human approval for sensitive cases.',
  },
  {
    title: 'Support agencies',
    description:
      'Manage multiple Shopify stores from one inbox, triage messages by intent, and keep every client in the loop.',
  },
  {
    title: 'Ops and CX teams',
    description:
      'Give operators the context they need—order history, shipping status, and recommended action—alongside every thread.',
  },
];

const benefits = [
  {
    title: 'Resolve tickets in minutes',
    description:
      'AI drafts the perfect response and proposed Shopify action so your team only approves and ships.',
  },
  {
    title: 'Eliminate tab switching',
    description:
      'Inbox, order history, AI suggestions, and macros live together, reducing handle time by 60%+. ',
  },
  {
    title: 'See ROI instantly',
    description:
      'Track savings, response times, and CSAT improvements with a support analytics dashboard built for ecommerce.',
  },
];

const pricingPlans = [
  {
    name: 'Launch',
    price: 49,
    description: 'Solo founders and new stores',
    features: [
      'Up to 3 connected inboxes',
      '1 Shopify storefront',
      '200 AI-assisted replies / month',
      'AI draft + order summary panel',
      'Manual approval workflow',
      'Shared macros & templates',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: 129,
    description: 'Growing CX teams',
    features: [
      'Unlimited inboxes',
      '3 Shopify storefronts',
      '1,000 AI-assisted replies / month',
      'Auto-approve rules & thresholds',
      'Slack escalations',
      'Support analytics dashboard',
      'Priority support',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 249,
    description: 'High-volume brands & agencies',
    features: [
      'Unlimited storefronts',
      'Unlimited AI-assisted replies',
      'Custom tone & brand voice',
      'Role-based access controls',
      'Dedicated success manager',
      'Private data retention policies',
      'SLA-backed support',
    ],
  },
];

const faqs = [
  {
    question: 'What problem does the AI E-Commerce Support Assistant solve?',
    answer:
      'We centralize customer emails, Shopify order data, and AI replies in one workspace so your team resolves issues without juggling tools or copy-pasting order details.',
  },
  {
    question: 'How quickly can we get set up?',
    answer:
      'Connect Shopify and your support inbox, choose recommended automation rules, and you can start approving AI drafts within 15 minutes. No developers required.',
  },
  {
    question: 'Will the AI send messages without approval?',
    answer:
      'You control who approves what. Start with human-in-the-loop for every message, then enable auto-approve when confidence scores meet your thresholds.',
  },
  {
    question: 'What channels do you support out of the box?',
    answer:
      'Shopify, Gmail, Outlook, Slack, and Mailgun are supported today. More channels like Zendesk and Gorgias are on our roadmap.',
  },
  {
    question: 'How is my customer data protected?',
    answer:
      'We encrypt data in transit and at rest, offer regional data residency, and provide granular role permissions to ensure your support workflows stay compliant.',
  },
  {
    question: 'Can I measure the impact on my support team?',
    answer:
      'Yes. Our analytics track response time, AI adoption, refunds issued, escalations, and customer satisfaction so you always know the ROI.',
  },
];

const heroFlares: Array<{ style: CSSProperties; className: string }> = [
  {
    style: {
      top: '-14%',
      left: '-12%',
      width: '30rem',
      height: '30rem',
      animationDuration: '24s',
    },
    className:
      'rounded-full bg-gradient-to-br from-cyan-500/25 via-sky-500/10 to-transparent blur-3xl opacity-80 animate-drift mix-blend-screen',
  },
  {
    style: {
      top: '6%',
      right: '-10%',
      width: '34rem',
      height: '34rem',
      animationDuration: '28s',
    },
    className:
      'rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[160px] opacity-80 animate-drift mix-blend-screen',
  },
  {
    style: {
      bottom: '-16%',
      left: '22%',
      width: '40rem',
      height: '40rem',
      animationDuration: '26s',
    },
    className:
      'rounded-full bg-gradient-to-tr from-blue-400/15 via-teal-400/10 to-transparent blur-[140px] opacity-70 animate-drift mix-blend-screen',
  },
];

const heroSparkles: Array<{ style: CSSProperties; delay: string }> = [
  { style: { top: '18%', left: '18%' }, delay: '0s' },
  { style: { top: '32%', right: '22%' }, delay: '0.6s' },
  { style: { top: '58%', left: '28%' }, delay: '1.2s' },
  { style: { top: '48%', right: '30%' }, delay: '1.5s' },
  { style: { top: '68%', left: '52%' }, delay: '0.9s' },
  { style: { top: '26%', right: '45%' }, delay: '0.3s' },
];

const heroStreams: Array<{
  style: CSSProperties;
  gradient: string;
  duration: string;
  delay?: string;
}> = [
  {
    style: {
      top: '15%',
      left: '10%',
      width: '22rem',
      height: '22rem',
      transform: 'rotate(12deg)',
    },
    gradient: 'from-cyan-400/20 via-blue-500/10 to-transparent',
    duration: '32s',
    delay: '-4s',
  },
  {
    style: {
      bottom: '10%',
      right: '12%',
      width: '26rem',
      height: '26rem',
      transform: 'rotate(-18deg)',
    },
    gradient: 'from-indigo-400/18 via-purple-500/12 to-transparent',
    duration: '36s',
    delay: '-10s',
  },
  {
    style: {
      top: '28%',
      right: '40%',
      width: '18rem',
      height: '18rem',
      transform: 'rotate(35deg)',
    },
    gradient: 'from-sky-300/18 via-cyan-400/10 to-transparent',
    duration: '28s',
  },
];

const ACTION_VERBS = ['AUTOMATE', 'ANALYZE', 'GROW'];

export default function HomePage() {
  const [annual, setAnnual] = useState(false);
  const [activeVerbIndex, setActiveVerbIndex] = useState(0);
  const [activeScene, setActiveScene] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const [insightsInView, setInsightsInView] = useState(false);

  const demoScenes = [
    {
      id: 'email',
      title: 'Customer email arrives',
      description: 'ZYYP reads intent, sentiment, and critical data instantly.',
    },
    {
      id: 'draft',
      title: 'AI drafts the perfect reply',
      description: 'Suggested response + Shopify action appears, ready for approval.',
    },
    {
      id: 'insight',
      title: 'Insight surfaces',
      description: '"Response time reduced 42%" — clear impact in your dashboard.',
    },
    {
      id: 'performance',
      title: 'Growth metrics climb',
      description: 'Performance graph highlights “Sales up 12%” to keep momentum.',
    },
  ];

  const cursorPositions: Array<{ top: string; left: string }> = [
    { top: '32%', left: '72%' },
    { top: '56%', left: '64%' },
    { top: '38%', left: '44%' },
    { top: '62%', left: '58%' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVerbIndex((prev) => (prev + 1) % ACTION_VERBS.length);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(
      () => setActiveScene((prev) => (prev + 1) % demoScenes.length),
      5000,
    );

    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (!insightsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInsightsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(insightsRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.18)_0,rgba(15,23,42,0)_45%)]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {heroFlares.map((flare, index) => (
            <div
              key={`hero-flare-${index}`}
              className={flare.className}
              style={flare.style}
            />
          ))}
          {heroStreams.map((stream, index) => (
            <div
              key={`hero-stream-${index}`}
              className={`absolute rounded-full bg-gradient-to-r ${stream.gradient} blur-[120px] opacity-70`}
              style={{
                ...stream.style,
                animation: `drift ${stream.duration} ease-in-out infinite`,
                animationDelay: stream.delay ?? '0s',
              }}
            />
          ))}
          <div className="absolute left-1/2 top-[18%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/10 bg-white/5 blur-3xl opacity-40 mix-blend-screen" />
          <div className="absolute left-1/2 top-[18%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full border border-white/10 opacity-60 mix-blend-overlay animate-orbit-slow" />
          <div className="absolute left-1/2 top-[18%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full border border-white/5 opacity-30 mix-blend-overlay animate-orbit-reverse" />
          {heroSparkles.map((sparkle, index) => (
            <span
              key={`hero-sparkle-${index}`}
              className="absolute h-2 w-2 rounded-full bg-cyan-100/70 shadow-[0_0_12px_rgba(165,243,252,0.8)]"
              style={{
                ...sparkle.style,
                animation: `drift 14s ease-in-out infinite`,
                animationDelay: sparkle.delay,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.08)_0,rgba(15,23,42,0)_55%)]" />
        </div>
        <div className="relative mx-auto flex min-h-[90vh] w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 pb-24 pt-40 text-center">
          <div className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            AI Business Copilot
          </div>
          <h1 className="text-4xl font-black leading-[1.05] md:text-6xl lg:text-7xl">
            Meet ZYYP - Your{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent animate-gradientShift">
              AI Autopilot
            </span>{' '}
            for Support, Analytics & Growth.
          </h1>
          <p className="max-w-3xl text-lg text-white/70 md:text-xl">
            Automate your customer interactions, analyze your performance, and unlock faster growth — all from one intelligent platform.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
            <span>We help teams</span>
            <span className="relative inline-flex h-6 min-w-[8rem] overflow-hidden">
              {ACTION_VERBS.map((verb, index) => (
                <span
                  key={verb}
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
                    index === activeVerbIndex
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-full opacity-0'
                  }`}
                >
                  {verb}
                </span>
              ))}
            </span>
            <span>on autopilot</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-slate-100"
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
          <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm font-medium text-white/50">
            <span>Purpose-built for modern support & revenue teams</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Trusted by fast-moving operators across industries</span>
          </div>
        </div>
      </section>

      {/* Demo Loop */}
      <section className="bg-slate-950/95 py-20 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
          <div className="w-full space-y-6 lg:w-[40%]">
            <h2 className="text-3xl font-black md:text-4xl">
              See ZYYP Power Your Business.
            </h2>
            <p className="text-lg text-white/70">
              A silent, looping walkthrough that shows how ZYYP triages customer
              emails, drafts replies, and surfaces the analytics that keep every team
              ahead.
            </p>
            <div className="space-y-4">
              {demoScenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-500 ${
                    index === activeScene
                      ? 'border-white/60 bg-white text-slate-900 shadow-lg shadow-slate-900/10'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setActiveScene(index);
                    setIsPaused(true);
                    setTimeout(() => setIsPaused(false), 5000);
                  }}
                >
                  <span
                    className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                      index === activeScene
                        ? 'border-slate-900/10 bg-slate-900/5 text-slate-900'
                        : 'border-white/20 text-white/60'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p
                      className={`text-base font-semibold ${
                        index === activeScene ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {scene.title}
                    </p>
                    <p
                      className={`text-sm ${
                        index === activeScene ? 'text-slate-600' : 'text-white/70'
                      }`}
                    >
                      {scene.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full overflow-visible lg:w-[60%]">
            <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl shadow-cyan-500/10">
              {/* Ambient overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.12)_0,rgba(15,23,42,0)_60%)]" />

              {/* Scene 1 */}
              <div
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 0 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-md rounded-3xl border border-cyan-400/20 bg-white/10 p-6 text-left shadow-xl shadow-cyan-500/10 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/20 text-lg">
                      ✉️
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">Email from Maya</p>
                      <span className="text-xs uppercase tracking-wide text-white/50">
                        2 minutes ago
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-white/80">
                    “Order arrived damaged. Need a replacement or refund ASAP.”
                  </p>
                  <div
                    className={`mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200 ${
                      activeScene === 0 ? 'animate-glow' : ''
                    }`}
                  >
                    intent read
                  </div>
                </div>
              </div>

              {/* Scene 2 */}
              <div
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 1 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-lg rounded-[28px] border border-purple-400/30 bg-white/10 p-6 shadow-xl shadow-purple-500/10 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-white/50">
                        draft reply
                      </p>
                      <h3 className="text-lg font-semibold text-white">AI Response</h3>
                    </div>
                    <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200">
                      97% confidence
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/80">
                    <p>
                      Hi Maya — thanks for letting us know. I’ve already queued a replacement
                      to ship today with express delivery.
                    </p>
                    <p>
                      You’ll receive tracking in the next 2 hours. If you prefer a refund,
                      just reply to this email.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-purple-200/80">
                    <span className="rounded-full bg-purple-500/15 px-3 py-1">
                      action: create replacement order
                    </span>
                    <span className="rounded-full border border-purple-500/40 px-3 py-1">
                      smart summary
                    </span>
                  </div>
                </div>
              </div>

              {/* Scene 3 */}
              <div
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 2 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-lg rounded-[28px] border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 text-left shadow-lg shadow-emerald-500/20 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-lg text-emerald-100">
                      📊
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/80">
                        insight
                      </p>
                      <h3 className="text-lg font-semibold text-white">
                        Response time reduced 42%
                      </h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-emerald-50/80">
                    Thanks to instant AI triage, the support team cleared high-priority cases
                    before they aged.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-emerald-100/80">
                    <div className="rounded-2xl border border-emerald-400/30 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">
                        csat
                      </p>
                      <p className="text-lg font-semibold text-white">4.8 / 5</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/30 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">
                        approvals automated
                      </p>
                      <p className="text-lg font-semibold text-white">78%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scene 4 */}
              <div
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 3 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-xl rounded-[28px] border border-sky-400/25 bg-white/5 p-6 shadow-xl shadow-sky-500/20 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-sky-200/80">
                        performance
                      </p>
                      <h3 className="text-lg font-semibold text-white">Sales up 12%</h3>
                    </div>
                    <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-100">
                      last 30 days
                    </span>
                  </div>
                  <div className="mt-4 h-40 w-full rounded-2xl bg-gradient-to-tr from-sky-500/10 via-transparent to-sky-500/5 p-4">
                    <div className="flex h-full items-end gap-2">
                      {[22, 32, 44, 56, 68, 74, 82].map((value, index) => (
                        <div
                          key={index}
                          className={`flex-1 rounded-full bg-sky-400/40 transition-all duration-500 ${
                            activeScene === 3 ? 'animate-rise' : ''
                          }`}
                          style={{ height: `${value}%`, animationDelay: `${index * 0.12}s` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-xs text-sky-100/80">
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 px-3 py-1">
                      📈 Forecast improved
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 px-3 py-1">
                      ⚡ Playbooks enabled
                    </span>
                  </div>
                </div>
              </div>

              {/* Cursor */}
              <div
                className="pointer-events-none absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 shadow-lg shadow-cyan-500/20 backdrop-blur transition-all duration-700 ease-out"
                style={{
                  top: cursorPositions[activeScene]?.top,
                  left: cursorPositions[activeScene]?.left,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-white/80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Insights Dashboard */}
      <section
        ref={insightsRef}
        className="relative overflow-hidden bg-slate-50 py-24"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12)_0,rgba(241,245,249,0)_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
          <div
            className={`w-full space-y-6 transition-all duration-700 ${
              insightsInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            } lg:w-[38%]`}
          >
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Smarter Insights. Happier Customers. Higher Revenue.
            </h2>
            <p className="text-lg text-slate-600">
              ZYYP continually reviews every interaction to surface the trends and risks
              that matter. Spot churn signals, act on sentiment, and quantify the revenue
              impact of every automation.
            </p>
            <div className="space-y-4">
              {[
                {
                  icon: '💡',
                  title: 'Revenue at risk this week',
                  data: '$1,240 due to delayed responses.',
                },
                {
                  icon: '🧠',
                  title: 'Top 3 refund drivers',
                  data: 'Damaged packaging, late deliveries, sizing issues.',
                },
                {
                  icon: '📬',
                  title: 'Customer sentiment score',
                  data: '92% positive this week across all channels.',
                },
              ].map((card, index) => (
                <div
                  key={card.title}
                  className={`flex items-start gap-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition-all duration-700 ${
                    insightsInView
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-6 opacity-0'
                  } hover:-translate-y-2 hover:shadow-2xl`}
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                    <p className="text-sm text-slate-600">{card.data}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className={`relative w-full transition-all duration-700 ${
              insightsInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            } lg:w-[62%]`}
            style={{ transitionDelay: '160ms' }}
          >
            <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-[36px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08)_0,rgba(255,255,255,0)_55%)]" />
              <div className="relative flex h-full flex-col gap-6 p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Order volume
                      </p>
                      <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-700">
                        +18% WoW
                      </span>
                    </div>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">$182k</h3>
                    <p className="text-sm text-slate-500">Processed in the last 7 days</p>
                    <div className="mt-6 flex items-end gap-1">
                      {[28, 40, 36, 48, 56, 62, 70].map((height, idx) => (
                        <span
                          key={idx}
                          className="flex-1 rounded-full bg-slate-900/15 transition-transform duration-500 hover:bg-slate-900/25"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Sentiment trend
                      </p>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        stable
                      </span>
                    </div>
                    <div className="mt-4 h-32">
                      <svg viewBox="0 0 200 120" className="h-full w-full text-emerald-500">
                        <path
                          d="M5 90 C40 60, 80 110, 120 70 C150 40, 180 60, 195 35"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <circle cx="195" cy="35" r="5" className="fill-emerald-500" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Peak positivity Thursday 3 pm after automated follow-ups.
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Auto-mail performance
                      </p>
                      <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-700">
                        96% delivered
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          opened
                        </p>
                        <p className="text-lg font-semibold text-slate-900">74%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          clicked
                        </p>
                        <p className="text-lg font-semibold text-slate-900">31%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          replies
                        </p>
                        <p className="text-lg font-semibold text-slate-900">12%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          revenue influenced
                        </p>
                        <p className="text-lg font-semibold text-slate-900">$8.4k</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Order health
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3">
                        <span>On-time</span>
                        <span className="font-semibold text-slate-900">87%</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-amber-100/80 px-4 py-3">
                        <span>Escalated</span>
                        <span className="font-semibold text-amber-700">9%</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-rose-100/80 px-4 py-3">
                        <span>At risk</span>
                        <span className="font-semibold text-rose-700">4%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-b border-slate-100 bg-white py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-6 px-6 text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
          {trustedLogos.map((logo) => (
            <span key={logo}>{logo}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              How the assistant works end-to-end
            </h2>
            <p className="text-lg text-slate-600 md:text-xl">
              Centralize conversations, Shopify order data, and AI suggestions
              in one place. Keep a human in the loop while automation clears the
              busywork.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  title: 'Centralize conversations',
                  description:
                    'Ingest every support email automatically, detect intent, and prioritize high-impact tickets.',
                },
                {
                  title: 'Match every order',
                  description:
                    'Surface customer, order, fulfillment, and payment data beside the thread—no extra tabs.',
                },
                {
                  title: 'Approve the AI draft',
                  description:
                    'Review the AI reply and proposed Shopify action, tweak tone, or add macros before sending.',
                },
                {
                  title: 'Measure performance',
                  description:
                    'Track response times, automations approved, refunds issued, and customer sentiment trends.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm shadow-slate-200/40 backdrop-blur-sm transition hover:-translate-y-1 hover:border-slate-300"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-600">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/usage"
                className="rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                Explore the inbox
              </Link>
              <a
                href="mailto:hello@notus.ai"
                className="rounded-full border border-slate-900/10 px-7 py-3 text-sm font-semibold tracking-wide text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-900/20"
              >
                Talk to us
              </a>
            </div>
          </div>
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
              <span>Inbox Overview</span>
              <span>AI + Human · In sync</span>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Customer email parsed
                  </p>
                  <p className="text-xs text-slate-500">
                    Intent: Refund request · Confidence 0.92
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                  AI draft ready
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Shopify order matched
                  </p>
                  <p className="text-xs text-slate-500">
                    Order #48219 · Delivered · 2 items
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                  Needs approval
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Suggested action
                  </p>
                  <p className="text-xs text-slate-500">
                    Partial refund · $38.40
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                  Ready to send
                </span>
              </div>
            </div>
            <div className="grid gap-3">
              {supportEvents.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div className="font-semibold text-slate-700">{event.id}</div>
                  <div className="text-xs text-slate-500">
                    {event.time}
                    <span className="mx-2 text-slate-400">·</span>
                    {event.intent}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Support stack */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Connect the tools you already use
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Bring Shopify orders, support inboxes, outbound email, and
              internal chat into one unified workflow.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {channelCards.map((card) => (
              <div
                key={card.name}
                className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-slate-50/70 p-6 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {card.name}
                    </p>
                    <p className="mt-3 text-2xl font-black text-slate-900">
                      {card.model}
                    </p>
                  </div>
                  <span
                    className={`rounded-full bg-gradient-to-r ${card.accent} px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white`}
                  >
                    {card.badge}
                  </span>
                </div>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>Status</span>
                  <span>{card.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Unified support inbox',
                description:
                  'Every customer message, order, timeline, and AI recommendation in one panel built for ecommerce.',
              },
              {
                title: 'Approve & automate actions',
                description:
                  'Set confidence thresholds, create macros, and allow auto-approve when the AI meets your standards.',
              },
              {
                title: 'Analytics your CFO loves',
                description:
                  'Quantify savings, measure CSAT changes, and capture revenue saved from faster resolutions.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-100 bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/30"
              >
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-4 text-sm text-white/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="careers" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black md:text-4xl">
              Built for modern ecommerce support teams
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Whether you are a solo founder or a CX org supporting multiple
              brands, the assistant adapts to your workflow and approval
              process.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-inner shadow-black/20 transition hover:-translate-y-1 hover:border-white/20"
              >
                <h3 className="text-xl font-semibold">{useCase.title}</h3>
                <p className="mt-3 text-sm text-white/70">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="blog" className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Benefits
            </p>
            <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
              Why fast-growing stores switch to us
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Replace spreadsheets, manual inbox triage, and scattered order
              lookups with a single AI-powered workspace built for ecommerce.
            </p>
            <div className="mt-10 rounded-3xl border border-slate-100 bg-slate-50 p-8 shadow-lg shadow-slate-200/50">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-2xl">
                  🤖
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Dashboard
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    Support intelligence
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Tickets triaged', value: '2,483 / wk' },
                  { label: 'Avg handle time', value: '4m 12s' },
                  { label: 'Revenue saved', value: '$18.7k / mo' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/40 bg-white/80 px-4 py-5 text-center shadow-sm"
                  >
                    <div className="text-sm font-semibold text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-900">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-3xl border border-slate-100 bg-white px-8 py-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-slate-200"
              >
                <h3 className="text-xl font-semibold text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {benefit.description}
                </p>
              </div>
            ))}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Trusted by customer-obsessed brands
              </p>
              <p className="mt-4 text-2xl font-black text-slate-900">
                “We resolve 3x more tickets per agent and finally have
                confidence that every refund and exchange is handled the right
                way.”
              </p>
              <div className="mt-6 text-sm font-semibold text-slate-600">
                <p>Priya Bose</p>
                <p>Head of CX, Luma Living · 68% faster responses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live feed */}
      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black md:text-3xl">
              Live support activity feed
            </h2>
            <p className="text-sm text-white/60">
              Track resolutions in real time—see which actions the AI is
              recommending and what your team approves.
            </p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {supportEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm shadow-inner shadow-black/40"
              >
                <div className="font-semibold tracking-wide text-white/90">
                  {event.id}
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {event.time} · {event.intent}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="about" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Pricing
            </p>
            <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
              Choose a plan that scales with your support volume
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              All plans include Shopify + inbox integrations, AI reply drafts,
              and analytics. Switch to annual billing and save 20%.
            </p>
          </div>
          <div className="mt-10 flex items-center justify-center gap-4 text-sm font-semibold text-slate-600">
            <span>Monthly</span>
            <button
              type="button"
              aria-pressed={annual}
              onClick={() => setAnnual((value) => !value)}
              className={`relative h-9 w-16 rounded-full transition-colors ${annual ? 'bg-slate-900' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition ${annual ? 'right-1' : 'left-1'}`}
              />
            </button>
            <span className={annual ? 'text-slate-900' : ''}>
              Yearly · Save 20%
            </span>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border p-8 shadow-lg transition hover:-translate-y-1 ${
                  plan.featured
                    ? 'border-slate-900 bg-slate-900 text-white shadow-2xl'
                    : 'border-white bg-white text-slate-900 shadow-slate-200/60'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
                    Most Popular
                  </span>
                )}
                <div className="text-sm font-semibold uppercase tracking-[0.35em] text-current/70">
                  {plan.name}
                </div>
                <div className="mt-4 text-4xl font-black">
                  ${annual ? Math.round(plan.price * 0.8) : plan.price}
                  <span className="ml-2 text-sm font-semibold opacity-60">
                    /seat
                  </span>
                </div>
                <p
                  className={`mt-2 text-sm ${plan.featured ? 'text-white/70' : 'text-slate-500'}`}
                >
                  {plan.description}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${plan.featured ? 'bg-white/20 text-white' : 'bg-slate-900/5 text-slate-700'}`}
                      >
                        ✓
                      </span>
                      <span
                        className={
                          plan.featured ? 'text-white/80' : 'text-slate-600'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/integrations"
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 text-white hover:bg-black'
                  }`}
                >
                  {plan.name === 'Enterprise'
                    ? 'Talk to sales'
                    : plan.featured
                      ? 'Start free trial'
                      : 'Get started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">
              For security first teams
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              Keep customer data secure and compliant
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Protect customer PII, payment details, and support history with
              enterprise-grade encryption, fine-grained roles, and audit trails.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              <span className="rounded-full border border-white/20 px-4 py-2">
                CCPA
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                GDPR
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                ISO
              </span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold">
                Zero data retention sandbox
              </h3>
              <p className="mt-3 text-sm text-white/70">
                Keep sensitive conversations inside your boundary with regional
                isolation, private deployments, and custom data retention
                policies.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold">Granular governance</h3>
              <p className="mt-3 text-sm text-white/70">
                Attribute every action to a teammate or AI, monitor approvals,
                export audit logs, and integrate with your compliance workflows.
              </p>
            </div>
            <Link
              href="/integrations"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              View security overview
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              FAQs
            </p>
            <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Find all your doubts and questions in one place. Still need help?{' '}
              <a
                href="mailto:hello@notus.ai"
                className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-500"
              >
                Email our team
              </a>{' '}
              or{' '}
              <a
                href="https://cal.com/notus/demo"
                className="underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-500"
                target="_blank"
                rel="noreferrer"
              >
                book a call
              </a>
              .
            </p>
          </div>
          <div className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm shadow-slate-200/50"
              >
                <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-900 transition group-open:text-slate-700">
                  {faq.question}
                  <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 py-20 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 text-center">
          <h2 className="text-3xl font-black md:text-4xl">
            Deliver five-star support without adding headcount
          </h2>
          <p className="max-w-3xl text-lg text-white/70">
            Connect Shopify, sync your inbox, and let the AI E-Commerce Support
            Assistant handle the repetitive work. Your team approves,
            personalizes, and delivers delight.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Launch your inbox
            </Link>
            <a
              href="https://cal.com/notus/demo"
              className="rounded-full border border-white/30 px-10 py-3 text-sm font-semibold text-white transition hover:border-white"
              target="_blank"
              rel="noreferrer"
            >
              Book a walkthrough
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
