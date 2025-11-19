'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Hero from './components/Hero';

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

type ChannelCard = {
  name: string;
  model: string;
  status: string;
  badge: string;
  accent: string;
  pricePlan?: string;
};

const channelCards: ChannelCard[] = [
  {
    name: 'Mail',
    model: 'Support Inbox',
    status: 'Connected',
    badge: 'Primary',
    accent: 'from-blue-500 to-indigo-500',
    pricePlan: 'Launch',
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

type AutomationSceneId =
  | 'inbox'
  | 'marketing'
  | 'support'
  | 'sales'
  | 'dashboard'
  | 'closing';

function AutomationShowcase() {
  const scenes: Array<{
    id: AutomationSceneId;
    label: string;
    caption: string;
    accent: string;
  }> = [
    {
      id: 'inbox',
      label: 'Inbox Automation',
      caption: '2:14 AM',
      accent: 'from-emerald-300 via-cyan-300 to-sky-400',
    },
    {
      id: 'marketing',
      label: 'Marketing Automation',
      caption: 'Campaign Engine',
      accent: 'from-sky-300 via-indigo-300 to-violet-400',
    },
    {
      id: 'support',
      label: 'Support Panel',
      caption: 'Customer Delight',
      accent: 'from-cyan-300 via-emerald-300 to-teal-300',
    },
    {
      id: 'sales',
      label: 'Sales Panel',
      caption: 'Upsell Engine',
      accent: 'from-amber-300 via-orange-300 to-rose-300',
    },
    {
      id: 'dashboard',
      label: 'Dashboard Update',
      caption: 'Impact Report',
      accent: 'from-purple-300 via-sky-300 to-emerald-300',
    },
    {
      id: 'closing',
      label: 'Overnight Autopilot',
      caption: 'Working While You Sleep',
      accent: 'from-cyan-300 via-white/80 to-indigo-300',
    },
  ];

  const cursorPositions: Array<{ top: string; left: string }> = [
    { top: '68%', left: '78%' },
    { top: '44%', left: '70%' },
    { top: '58%', left: '64%' },
    { top: '46%', left: '68%' },
    { top: '54%', left: '54%' },
    { top: '60%', left: '50%' },
  ];

  const [sceneIndex, setSceneIndex] = useState(0);
  const [isScenePaused, setIsScenePaused] = useState(false);
  const loopTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isScenePaused) return;

    loopTimeoutRef.current = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % scenes.length);
    }, 4000);

    return () => {
      if (loopTimeoutRef.current) {
        clearInterval(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    };
  }, [isScenePaused, scenes.length]);

  useEffect(() => {
    return () => {
      if (loopTimeoutRef.current) clearInterval(loopTimeoutRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  const handleSceneSelect = (index: number) => {
    setSceneIndex(index);
    setIsScenePaused(true);

    if (loopTimeoutRef.current) {
      clearInterval(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = setTimeout(() => {
      setIsScenePaused(false);
    }, 5000);
  };

  const renderSceneContent = (
    sceneId: AutomationSceneId,
    isActive: boolean,
  ) => {
    switch (sceneId) {
      case 'inbox':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Inbox Automation · 2:14 AM
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-sm text-white/80 shadow-inner shadow-black/20">
                “Hi! My order arrived but I need a larger size.”
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition duration-500 ${
                  isActive ? 'shadow-[0_0_25px_rgba(52,211,153,0.35)]' : ''
                }`}
              >
                <span
                  className={`inline-flex h-2 w-2 rounded-full bg-emerald-300 ${
                    isActive ? 'animate-ping' : ''
                  }`}
                />
                <span>AI Detected Intent</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                <span className="text-lg leading-none">✔</span>
                Replacement processed automatically.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 01
              </span>
            </div>
          </div>
        );
      case 'marketing':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Marketing Automation
              </p>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-violet-500/10 p-5 text-sm text-white/80 shadow-inner shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    Next campaign queued
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    2 channels
                  </span>
                </div>
                <p className="mt-4 text-xs text-white/70">
                  Personalized win-back emails scheduled for 7:00 AM with SMS
                  follow-up.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs text-white/70 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Audience
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">VIP</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">
                    Ready
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">+18%</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-400 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 02
              </span>
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Support Panel
              </p>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-teal-500/10 p-5 text-sm text-white/80 shadow-inner shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    Ticket closed with CSAT 5.0
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Resolved
                  </span>
                </div>
                <p className="mt-4 text-xs text-white/70">
                  AI reply approved · Replacement order sent · Customer thanked.
                </p>
              </div>
              <div className="space-y-3 text-xs text-white/70">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="uppercase tracking-[0.25em] text-white/40">
                    Handle Time
                  </span>
                  <span className="text-sm font-semibold text-emerald-200">
                    -62%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="uppercase tracking-[0.25em] text-white/40">
                    Macros Used
                  </span>
                  <span className="text-sm font-semibold text-white">
                    Auto-detected
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-teal-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 03
              </span>
            </div>
          </div>
        );
      case 'sales':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Sales Panel
              </p>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 p-5 text-sm text-white/80 shadow-inner shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    Upsell offer generated automatically
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Personalized
                  </span>
                </div>
                <p className="mt-4 text-xs text-white/70">
                  “Bundle + Free Express Shipping” queued for approval.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    AOV Impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">+12%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">
                    Confidence
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">
                    High
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 04
              </span>
            </div>
          </div>
        );
      case 'dashboard':
        return (
          <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Dashboard Update
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Customer satisfied', complete: true },
                  { label: 'Ads optimized', complete: true },
                  { label: 'Report generated', complete: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-sm text-emerald-300">✅</span>
                    </div>
                    <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-300 via-sky-300 to-emerald-300 transition-all duration-[1400ms] ease-out"
                        style={{ width: isActive ? '100%' : '22%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-300 via-sky-300 to-emerald-300 transition-all duration-[1400ms] ease-out"
                  style={{ width: isActive ? '100%' : '18%' }}
                />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Flow 05
              </span>
            </div>
          </div>
        );
      case 'closing':
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/80 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Overnight Autopilot
            </p>
            <h3 className="text-3xl font-black tracking-tight text-white">
              ZYYP — Working While You Sleep.
            </h3>
            <p className="max-w-sm text-sm text-white/70">
              Automations keep shipping, marketing, support, and insights
              humming while you rest.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="relative flex h-[360px] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0B0F1E]/95 via-[#0C192D]/90 to-[#111827]/95 p-6 text-white shadow-2xl shadow-cyan-500/10 md:p-8">
        <div className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-6 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/50">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            {scenes[sceneIndex].label}
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-white/40">
            {scenes[sceneIndex].caption}
          </span>
        </div>
        <div className="relative mt-6 flex-1">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              className={`absolute inset-0 z-10 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                sceneIndex === index
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-6 opacity-0'
              }`}
              onClick={() => handleSceneSelect(index)}
            >
              {renderSceneContent(scene.id, sceneIndex === index)}
            </div>
          ))}
          <div
            className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-40 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              top: cursorPositions[sceneIndex].top,
              left: cursorPositions[sceneIndex].left,
            }}
          >
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border border-white/30 shadow-[0_0_18px_rgba(255,255,255,0.25)]" />
              <div className="absolute inset-3 rounded-full border border-white/20" />
              <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-2 px-2">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => handleSceneSelect(index)}
            className={`h-1 flex-1 rounded-full transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
              sceneIndex === index
                ? `scale-y-[1.8] bg-gradient-to-r ${scene.accent} shadow-[0_0_14px_rgba(56,189,248,0.45)]`
                : 'bg-white/10 hover:bg-white/20'
            }`}
            aria-label={`Show ${scene.label}`}
          />
        ))}
      </div>
    </div>
  );
}

function AutomationPoster() {
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0B0F1E]/95 via-[#0C192D]/90 to-[#111827]/95 p-6 text-white shadow-xl shadow-cyan-500/10">
      <div className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          Inbox Automation · 2:14 AM
        </p>
        <div className="mt-4 space-y-4 text-sm text-white/80">
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-inner shadow-black/20">
            “Hi! My order arrived but I need a larger size.”
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            <span>AI Detected Intent</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
            <span className="text-lg leading-none">✔</span>
            Replacement processed automatically.
          </div>
        </div>
      </div>
      <div className="mt-6 h-1 w-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300" />
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/40">
        ZYYP — Working While You Sleep.
      </p>
    </div>
  );
}

type PlanKey = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
type PlanMeta = {
  name: string;
  badge: string;
  features: string[];
  highlight?: boolean;
};

const PLAN_META: Record<PlanKey, PlanMeta> = {
  STARTER: {
    name: 'Starter',
    badge: 'For emerging brands',
    features: [
      '500 emails/month (outbound)',
      '1 Shopify store connection',
      'Unlimited AI suggestions',
      'Basic AI reply generation',
      'Order matching & email threading',
    ],
  },
  GROWTH: {
    name: 'Growth',
    badge: 'Most popular',
    highlight: true,
    features: [
      '2,500 emails/month',
      'Up to 3 store connections',
      'Priority support response',
      'Advanced analytics & dashboards',
      'Reusable email templates',
    ],
  },
  PRO: {
    name: 'Pro',
    badge: 'For high-volume teams',
    features: [
      '10,000 emails/month',
      'Up to 10 store connections',
      'Custom AI training sessions',
      'Full API access',
      'White-label & advanced reporting',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    badge: 'Designed with you',
    features: [
      'Unlimited or volume-based emails',
      'Unlimited store connections',
      'Dedicated success & SLA guarantees',
      'Custom integrations & onboarding',
      'Volume discounts starting at ₹2/email',
    ],
  },
};

const FALLBACK_PRICES: Record<PlanKey, { label: string; cadence: string }> = {
  STARTER: { label: '₹999', cadence: 'per month' },
  GROWTH: { label: '₹2,999', cadence: 'per month' },
  PRO: { label: '₹9,999', cadence: 'per month' },
  ENTERPRISE: { label: 'Custom', cadence: 'tailored plan' },
};

const faqs = [
  {
    question: 'What problem does ZYYP solve?',
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
      'Shopify, Mail, Slack, and Meta Ads are supported today. More channels like Zendesk and Gorgias are on our roadmap.',
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

const ShopifyLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <path fill="#A5D6A7" d="M4 8.5 18 4l10 2.5v19L18 28 4 25.5z" />
    <path fill="#4CAF50" d="M18 4v24l10-3.5v-18z" />
    <path
      fill="#fff"
      d="m15.6 22.6 1.2-8.6c.1-.6.6-1 1.2-1l2.5.1-.3 2.2-1.4-.1-.7 5.8z"
    />
    <path fill="#2E7D32" d="M8 10.5 18 4v24l-10-2.5z" opacity=".2" />
  </svg>
);

const MailLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect x="4" y="7" width="24" height="18" rx="4" fill="#F06292" />
    <path fill="#fff" d="m6 9 10 8 10-8z" opacity=".9" />
    <path fill="#F8BBD0" d="m6 23 9.5-7.4c.3-.3.7-.3 1 0L26 23z" />
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect x="6" y="6" width="20" height="20" rx="10" fill="#fff" />
    <path fill="#36C5F0" d="M14 6h2v7h-2a3 3 0 1 1 0-6z" />
    <path fill="#2EB67D" d="M26 14v2h-7v-2a3 3 0 1 1 6 0z" />
    <path fill="#ECB22E" d="M18 26h-2v-7h2a3 3 0 1 1 0 6z" />
    <path fill="#E01E5A" d="M6 18v-2h7v2a3 3 0 1 1-6 0z" />
  </svg>
);

const MetaAdsLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect
      x="4"
      y="6"
      width="24"
      height="20"
      rx="10"
      fill="#0A84FF"
      opacity=".2"
    />
    <path
      fill="#0A84FF"
      d="M10 22c-1.9 0-3-1.5-3-4.2 0-4 2.1-7.8 5.1-7.8 2.4 0 3.6 1.9 5.3 4.8 1.4-2.8 2.7-4.8 5-4.8 2.9 0 4.6 3.7 4.6 7.6 0 3.1-1.2 4.4-2.8 4.4-2.1 0-3.3-2.4-5-5.5-1.5 2.9-2.8 5.5-5.2 5.5-1.3 0-2.4-.7-3.9-3.5l1.3-.7c1 2 1.8 2.6 2.6 2.6 1.5 0 2.7-2.3 4.4-5.7-1.5-2.6-2.4-3.8-3.7-3.8-1.9 0-3.4 2.8-3.4 6.2 0 2 .7 2.9 2 2.9 1.1 0 1.8-.6 2.7-1.5l.8 1c-1 .9-2.1 1.7-3.6 1.7z"
    />
  </svg>
);

const GoogleAnalyticsLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <rect x="6" y="14" width="6" height="12" rx="3" fill="#F9A825" />
    <rect x="14" y="8" width="6" height="18" rx="3" fill="#FB8C00" />
    <rect x="22" y="4" width="6" height="22" rx="3" fill="#F4511E" />
  </svg>
);

const WooLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <path
      d="M6 11c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4z"
      fill="#9C27B0"
    />
    <path
      fill="#fff"
      d="M11.2 18.4 9.6 14h1.6l.7 2.4.8-2.4H14l.8 2.4.7-2.4h1.5l-1.6 4.4h-1.5l-.7-2.1-.7 2.1zm8.6 0c-1.3 0-2.3-1.1-2.3-2.5s1-2.5 2.3-2.5 2.3 1.1 2.3 2.5-1 2.5-2.3 2.5zm0-1.2c.4 0 .7-.5.7-1.3s-.3-1.3-.7-1.3c-.4 0-.7.5-.7 1.3s.3 1.3.7 1.3z"
    />
  </svg>
);

const GoogleAdsLogo = () => (
  <svg viewBox="0 0 32 32" role="img" aria-hidden className="h-6 w-6">
    <path d="M10 6h4l8 20h-4z" fill="#F4B400" />
    <path d="M12 26a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#0F9D58" />
    <path d="M16 6h4a4 4 0 0 1 4 4v14h-4z" fill="#4285F4" />
  </svg>
);

type IntegrationIcon = {
  name: string;
  gradient: string;
  Icon: () => JSX.Element;
};

const integrationIcons: IntegrationIcon[] = [
  {
    name: 'Shopify',
    gradient: 'from-emerald-400 to-emerald-600',
    Icon: ShopifyLogo,
  },
  { name: 'Mail', gradient: 'from-rose-400 to-red-500', Icon: MailLogo },
  {
    name: 'Slack',
    gradient: 'from-purple-400 to-fuchsia-500',
    Icon: SlackLogo,
  },
  {
    name: 'Meta Ads',
    gradient: 'from-blue-500 to-indigo-500',
    Icon: MetaAdsLogo,
  },
  {
    name: 'Google Analytics',
    gradient: 'from-orange-400 to-amber-500',
    Icon: GoogleAnalyticsLogo,
  },
  {
    name: 'WooCommerce',
    gradient: 'from-purple-500 to-indigo-500',
    Icon: WooLogo,
  },
  {
    name: 'Google Ads',
    gradient: 'from-sky-500 to-blue-600',
    Icon: GoogleAdsLogo,
  },
];

export default function HomePage() {
  const [annual, setAnnual] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const [insightsInView, setInsightsInView] = useState(false);
  const mailingRef = useRef<HTMLDivElement | null>(null);
  const [mailingInView, setMailingInView] = useState(false);
  const founderRef = useRef<HTMLDivElement | null>(null);
  const [founderInView, setFounderInView] = useState(false);
  const [showAutomationTip, setShowAutomationTip] = useState(false);

  const demoScenes = [
    {
      id: 'email',
      title: 'Customer email arrives',
      description: 'ZYYP reads intent, sentiment, and critical data instantly.',
    },
    {
      id: 'draft',
      title: 'AI drafts the perfect reply',
      description:
        'Suggested response + Shopify action appears, ready for approval.',
    },
    {
      id: 'insight',
      title: 'Insight surfaces',
      description:
        '"Response time reduced 42%" — clear impact in your dashboard.',
    },
    {
      id: 'performance',
      title: 'Growth metrics climb',
      description:
        'Performance graph highlights “Sales up 12%” to keep momentum.',
    },
  ];

  const cursorPositions: Array<{ top: string; left: string }> = [
    { top: '32%', left: '72%' },
    { top: '56%', left: '64%' },
    { top: '38%', left: '44%' },
    { top: '62%', left: '58%' },
  ];

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

  useEffect(() => {
    if (!mailingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setMailingInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(mailingRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!founderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setFounderInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(founderRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Hero />

      {/* Demo Loop */}
      <section className="bg-white py-20 text-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
          <div className="w-full space-y-6 lg:w-[40%]">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              See ZYYP Power Your Business.
            </h2>
            <p className="text-lg text-slate-600">
              A silent, looping walkthrough that shows how ZYYP triages customer
              emails, drafts replies, and surfaces the analytics that keep every
              team ahead.
            </p>
            <div className="space-y-4">
              {demoScenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all duration-500 ${
                    index === activeScene
                      ? 'border border-slate-900/15 bg-white text-slate-900 shadow-xl shadow-slate-900/10'
                      : 'border border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
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
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p
                      className={`text-base font-semibold ${
                        index === activeScene
                          ? 'text-slate-900'
                          : 'text-slate-700'
                      }`}
                    >
                      {scene.title}
                    </p>
                    <p
                      className={`text-sm ${
                        index === activeScene
                          ? 'text-slate-600'
                          : 'text-slate-500'
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
            <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl shadow-slate-900/10">
              {/* Ambient overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18)_0,rgba(255,255,255,0)_65%)]" />

              {/* Scene 1 */}
              <div
                className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                  activeScene === 0
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-md rounded-3xl border border-cyan-400/30 bg-white p-6 text-left shadow-xl shadow-cyan-500/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-lg text-cyan-600">
                      ✉️
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Email from Maya
                      </p>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        2 minutes ago
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">
                    “Order arrived damaged. Need a replacement or refund ASAP.”
                  </p>
                  <div
                    className={`mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700 ${
                      activeScene === 0 ? 'animate-glow' : ''
                    }`}
                  >
                    intent read
                  </div>
                </div>
              </div>

              {/* Scene 2 */}
              <div
                className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                  activeScene === 1
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-lg rounded-[28px] border border-purple-400/40 bg-white p-6 shadow-xl shadow-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                        draft reply
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">
                        AI Response
                      </h3>
                    </div>
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-700">
                      97% confidence
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
                    <p>
                      Hi Maya — thanks for letting us know. I’ve already queued
                      a replacement to ship today with express delivery.
                    </p>
                    <p>
                      You’ll receive tracking in the next 2 hours. If you prefer
                      a refund, just reply to this email.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-purple-600/80">
                    <span className="rounded-full bg-purple-500/10 px-3 py-1">
                      action: create replacement order
                    </span>
                    <span className="rounded-full border border-purple-400/40 px-3 py-1">
                      smart summary
                    </span>
                  </div>
                </div>
              </div>

              {/* Scene 3 */}
              <div
                className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                  activeScene === 2
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-lg rounded-[28px] border border-emerald-400/30 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 p-6 text-left shadow-lg shadow-emerald-500/15">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-lg text-emerald-600">
                      📊
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-emerald-600/80">
                        insight
                      </p>
                      <h3 className="text-lg font-semibold text-emerald-900">
                        Response time reduced 42%
                      </h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-emerald-700/80">
                    Thanks to instant AI triage, the support team cleared
                    high-priority cases before they aged.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-emerald-700/80">
                    <div className="rounded-2xl border border-emerald-400/30 bg-white/80 p-3">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-500/80">
                        csat
                      </p>
                      <p className="text-lg font-semibold text-emerald-900">
                        4.8 / 5
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/30 bg-white/80 p-3">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-500/80">
                        approvals automated
                      </p>
                      <p className="text-lg font-semibold text-emerald-900">
                        78%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scene 4 */}
              <div
                className={`absolute inset-0 px-5 py-6 transition-all duration-600 sm:px-8 sm:py-8 lg:px-10 ${
                  activeScene === 3
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-xl rounded-[28px] border border-sky-400/30 bg-white p-6 shadow-xl shadow-sky-500/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-sky-500/80">
                        performance
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Sales up 12%
                      </h3>
                    </div>
                    <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-700">
                      last 30 days
                    </span>
                  </div>
                  <div className="mt-4 h-40 w-full rounded-2xl bg-gradient-to-tr from-sky-200/40 via-transparent to-sky-100/50 p-4">
                    <div className="flex h-full items-end gap-2">
                      {[22, 32, 44, 56, 68, 74, 82].map((value, index) => (
                        <div
                          key={index}
                          className={`flex-1 rounded-full bg-sky-400/60 transition-all duration-500 ${
                            activeScene === 3 ? 'animate-rise' : ''
                          }`}
                          style={{
                            height: `${value}%`,
                            animationDelay: `${index * 0.12}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-xs text-sky-600/80">
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
                className="pointer-events-none absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/60 shadow-lg shadow-slate-400/20 backdrop-blur transition-all duration-700 ease-out"
                style={{
                  top: cursorPositions[activeScene]?.top,
                  left: cursorPositions[activeScene]?.left,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-slate-500" />
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
              insightsInView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            } lg:w-[38%]`}
          >
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Smarter Insights. Happier Customers. Higher Revenue.
            </h2>
            <p className="text-lg text-slate-600">
              ZYYP continually reviews every interaction to surface the trends
              and risks that matter. Spot churn signals, act on sentiment, and
              quantify the revenue impact of every automation.
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
                    <p className="text-sm font-semibold text-slate-800">
                      {card.title}
                    </p>
                    <p className="text-sm text-slate-600">{card.data}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className={`relative w-full transition-all duration-700 ${
              insightsInView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
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
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                      $182k
                    </h3>
                    <p className="text-sm text-slate-500">
                      Processed in the last 7 days
                    </p>
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
                      <svg
                        viewBox="0 0 200 120"
                        className="h-full w-full text-emerald-500"
                      >
                        <path
                          d="M5 90 C40 60, 80 110, 120 70 C150 40, 180 60, 195 35"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="195"
                          cy="35"
                          r="5"
                          className="fill-emerald-500"
                        />
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
                        <p className="text-lg font-semibold text-slate-900">
                          74%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          clicked
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          31%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          replies
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          12%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          revenue influenced
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          $8.4k
                        </p>
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
                        <span className="font-semibold text-slate-900">
                          87%
                        </span>
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

      {/* Autonomous Mailing Engine */}
      <section className="bg-white py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 lg:flex-row lg:items-stretch">
          <div className="w-full lg:w-[48%]">
            <div
              ref={mailingRef}
              className={`relative h-full transition-all duration-700 ${
                mailingInView
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="relative mx-auto w-full rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/10 text-slate-700">
                      ✉️
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        AI draft
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        Follow-up: Order status update
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    94% confidence
                  </span>
                </div>
                <div className="space-y-4 px-6 py-5 text-sm text-slate-600">
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner">
                    <p className="font-semibold text-slate-800">Hi Alex,</p>
                    <p>
                      Your order is in the final packing stage and will ship
                      within the next 24 hours. We’ve upgraded you to priority
                      shipping at no cost so it arrives on time.
                    </p>
                    <p>
                      You can track its journey anytime:{' '}
                      <span className="underline">Track order</span>.
                    </p>
                    <p className="text-slate-500">
                      Thanks for your patience — we’ll ping you once it’s out
                      the door.
                    </p>
                    <p>— Team ZYYP Automations</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Smart recommendations
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      <li>
                        • Add 10% discount if order is delayed beyond 3 days.
                      </li>
                      <li>• Follow-up in 48 hours if no response.</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white">
                    Edit Draft
                  </button>
                  <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800">
                    Approve &amp; Send
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`w-full space-y-6 transition-all duration-700 ${
              mailingInView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
            } lg:w-[52%]`}
            style={{ transitionDelay: '120ms' }}
          >
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Autonomous Mailing Engine — Never Miss a Customer Again.
            </h2>
            <p className="text-lg text-slate-600">
              ZYYP auto-drafts and sends follow-ups, offers, and updates based
              on customer behavior, tickets, or sales trends — all fully
              editable by you.
            </p>
            <div className="space-y-4">
              {[
                {
                  icon: '📬',
                  title: 'Automated follow-ups',
                  description:
                    'Trigger emails instantly when support tickets stall or orders slip past SLA.',
                },
                {
                  icon: '💬',
                  title: 'Personalized replies',
                  description:
                    'Use customer data, sentiment, and purchase history to tailor every message.',
                },
                {
                  icon: '📈',
                  title: 'Triggered campaigns',
                  description:
                    'Launch win-back offers, restock alerts, and VIP check-ins without lifting a finger.',
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/10 text-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {feature.title}
                    </p>
                    <p className="text-sm text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Made for Founders */}
      <section
        ref={founderRef}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-24 text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.18)_0,rgba(15,23,42,0)_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
          <div
            className={`w-full space-y-6 transition-all duration-700 ${
              founderInView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            } lg:w-[40%]`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Made for Founders
            </div>
            <h2 className="text-3xl font-black md:text-4xl">
              Run your business like a $100M brand - even if you’re solo.
            </h2>
            <p className="text-lg text-white/70">
              ZYYP gives entrepreneurs and teams enterprise-grade automation,
              analytics, and growth intelligence — without extra hires.
            </p>
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 shadow-lg shadow-cyan-500/10">
              <p className="italic">
                “Finally, an AI that runs my business while I sleep.”
              </p>
              <span className="mt-3 block text-xs uppercase tracking-[0.3em] text-white/50">
                Founder, Slick Stiles
              </span>
            </div>
          </div>
          <div
            className={`relative w-full lg:w-[60%] ${
              founderInView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
            } transition-all duration-700`}
            style={{ transitionDelay: '160ms' }}
          >
            <div
              className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0D0D16]/90 via-[#0F1B2E]/90 to-[#111827]/95 p-6 shadow-2xl shadow-cyan-500/10 md:p-8"
              onMouseEnter={() => setShowAutomationTip(true)}
              onMouseLeave={() => setShowAutomationTip(false)}
            >
              <div className="absolute -left-12 top-12 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
              <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0,rgba(15,23,42,0)_70%)]" />

              <div className="relative hidden md:block">
                <AutomationShowcase />
              </div>

              <div className="relative block md:hidden">
                <AutomationPoster />
              </div>

              {showAutomationTip && (
                <div className="pointer-events-none absolute -top-4 right-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 shadow-lg shadow-cyan-500/10 backdrop-blur founder-fade-in">
                  <span>AI just automated another task 💡</span>
                </div>
              )}
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                href="/integrations"
                className="rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                Explore the inbox
              </Link>
              <a
                href="mailto:hi@zyyp.ai"
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
              Autonomous workflows across every platform
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Connect ZYYP with your favorite tools — from e-commerce to
              marketing to support — for a truly autonomous business workflow.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm">
              + More Integrations Coming Soon.
            </span>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {integrationIcons.map((tool, index) => (
              <div
                key={tool.name}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(59,130,246,0.15)]"
                style={{ transitionDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-inner shadow-white/20 transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.45)]`}
                  >
                    <tool.Icon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {tool.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Connected in minutes
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {channelCards.map((card) => {
              const planKeyMap: Record<string, PlanKey> = {
                Launch: 'STARTER',
                Starter: 'STARTER',
                Growth: 'GROWTH',
                Pro: 'PRO',
                Enterprise: 'ENTERPRISE',
              };
              const mappedKey: PlanKey | undefined = card.pricePlan
                ? planKeyMap[card.pricePlan]
                : undefined;
              const planLabel = mappedKey ? PLAN_META[mappedKey].name : null;
              const planPriceLabel = mappedKey
                ? FALLBACK_PRICES[mappedKey].label
                : null;
              const planCadence = mappedKey
                ? FALLBACK_PRICES[mappedKey].cadence
                : null;

              return (
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
                      {planLabel ?? card.badge}
                    </span>
                  </div>
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>{mappedKey ? 'Pricing' : 'Status'}</span>
                    <span>
                      {mappedKey
                        ? `${planPriceLabel} · ${planCadence}`
                        : card.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
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
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_1fr]">
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
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
              and analytics.
            </p>
          </div>
          {/* Pricing is sourced from the Pricing page config to stay consistent */}
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
            {(['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] as PlanKey[]).map(
              (type) => {
                const meta = PLAN_META[type];
                const price = FALLBACK_PRICES[type];
                const isDark = type === 'GROWTH' || type === 'ENTERPRISE';
                const showFeaturedBadge = type === 'GROWTH';
                return (
                  <div
                    key={type}
                    className={`relative flex flex-col rounded-3xl border p-8 shadow-lg transition hover:-translate-y-1 ${
                      isDark
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xl'
                        : 'border-white bg-white text-slate-900 shadow-slate-200/60'
                    }`}
                  >
                    {showFeaturedBadge && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
                        Most Popular
                      </span>
                    )}
                    <div className="text-sm font-semibold uppercase tracking-[0.35em] text-current/70">
                      {meta.name}
                    </div>
                    <div className="mt-4 text-4xl font-black">
                      {price.label}
                      <span className="ml-2 text-sm font-semibold opacity-60">
                        {price.cadence}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-sm ${isDark ? 'text-white/70' : 'text-slate-500'}`}
                    >
                      {meta.badge}
                    </p>
                    <ul className="mt-6 space-y-3 text-sm">
                      {meta.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isDark ? 'bg-white/20 text-white' : 'bg-slate-900/5 text-slate-700'}`}
                          >
                            ✓
                          </span>
                          <span
                            className={
                              isDark ? 'text-white/80' : 'text-slate-600'
                            }
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={
                        type === 'ENTERPRISE'
                          ? 'mailto:hi@zyyp.ai'
                          : '/integrations'
                      }
                      className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${
                        isDark
                          ? 'bg-white text-slate-900 hover:bg-slate-100'
                          : 'bg-slate-900 text-white hover:bg-black'
                      }`}
                    >
                      {type === 'ENTERPRISE'
                        ? 'Talk to us'
                        : 'Start free trial'}
                    </Link>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_1fr]">
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
                href="mailto:hi@zyyp.ai"
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
            Connect Shopify, sync your inbox, and let ZYYP handle the repetitive
            work. Your team approves, personalizes, and delivers delight.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Launch your inbox
            </Link>
            <a
              href="/demo"
              className="rounded-full border border-white/30 px-10 py-3 text-sm font-semibold text-white transition hover:border-white"
            >
              Live Demo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
