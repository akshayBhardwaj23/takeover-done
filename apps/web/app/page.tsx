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

const heroSlides = [
  {
    id: 'auto-reply',
    tag: 'Inbox Automation',
    headline: 'AI reply drafted in 3 seconds',
    subtitle: '“Hi! My order arrived but I need a larger size.”',
    pills: ['Intent detected', 'Refund queued'],
    metricLabel: 'Time saved',
    metricValue: '47s',
    accent: 'from-cyan-300 via-sky-400 to-indigo-400',
  },
  {
    id: 'insights',
    tag: 'Analytics',
    headline: 'Revenue up 14% this week',
    subtitle: 'AI spotted 3 fast wins across CX + retention.',
    pills: ['Churn risk down', 'VIPs happy'],
    metricLabel: 'Lift',
    metricValue: '+14%',
    accent: 'from-emerald-300 via-teal-300 to-cyan-300',
  },
  {
    id: 'playbooks',
    tag: 'Automation Flow',
    headline: 'Refund + exchange playbook firing',
    subtitle: 'Rules triggered for delayed shipments overnight.',
    pills: ['3 flows live', 'Human-in-loop'],
    metricLabel: 'Tickets cleared',
    metricValue: '38',
    accent: 'from-indigo-300 via-purple-300 to-pink-300',
  },
  {
    id: 'suggestions',
    tag: 'AI Insights',
    headline: 'Optimize delayed orders this week',
    subtitle: 'AI suggests prioritizing “Logistics · East Coast”.',
    pills: ['Confidence 92%', 'Ready-to-run'],
    metricLabel: 'Impact forecast',
    metricValue: '+$18k',
    accent: 'from-amber-300 via-orange-300 to-rose-300',
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

  useEffect(() => {
    const interval = setInterval(
      () => setSceneIndex((prev) => (prev + 1) % scenes.length),
      4000,
    );

    return () => clearInterval(interval);
  }, [scenes.length]);

  const renderSceneContent = (sceneId: AutomationSceneId, isActive: boolean) => {
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
                Refund processed automatically.
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
                  Personalized win-back emails scheduled for 7:00 AM with SMS follow-up.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">Audience</p>
                  <p className="mt-2 text-sm font-semibold text-white">VIP</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">Status</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">Ready</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">Impact</p>
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
                  <span className="uppercase tracking-[0.25em] text-white/40">Handle Time</span>
                  <span className="text-sm font-semibold text-emerald-200">-62%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="uppercase tracking-[0.25em] text-white/40">Macros Used</span>
                  <span className="text-sm font-semibold text-white">Auto-detected</span>
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
                  <p className="uppercase tracking-[0.25em] text-white/40">AOV Impact</p>
                  <p className="mt-2 text-sm font-semibold text-white">+12%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="uppercase tracking-[0.25em] text-white/40">Confidence</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">High</p>
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
              Automations keep shipping, marketing, support, and insights humming while you rest.
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
              className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                sceneIndex === index
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-6 opacity-0'
              }`}
            >
              {renderSceneContent(scene.id, sceneIndex === index)}
            </div>
          ))}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              top: cursorPositions[sceneIndex].top,
              left: cursorPositions[sceneIndex].left,
            }}
          >
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border border-white/30 bg-white/15 backdrop-blur" />
              <div className="absolute inset-1 rounded-full border border-white/20 bg-white/30" />
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              <div className="absolute -bottom-4 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 rounded-md bg-white/70 shadow-lg shadow-cyan-500/20" />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-2 px-2">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => setSceneIndex(index)}
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
            Refund processed automatically.
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

const integrationIcons = [
  { name: 'Shopify', emoji: '🛍️', gradient: 'from-emerald-400 to-emerald-600' },
  { name: 'Gmail', emoji: '✉️', gradient: 'from-rose-400 to-red-500' },
  { name: 'Slack', emoji: '💬', gradient: 'from-purple-400 to-fuchsia-500' },
  { name: 'Mailgun', emoji: '📨', gradient: 'from-sky-400 to-cyan-500' },
  { name: 'Meta Ads', emoji: '📣', gradient: 'from-blue-500 to-indigo-500' },
  { name: 'Google Analytics', emoji: '📊', gradient: 'from-orange-400 to-amber-500' },
  { name: 'HubSpot', emoji: '🚀', gradient: 'from-amber-500 to-orange-500' },
  { name: 'Zapier', emoji: '⚙️', gradient: 'from-red-500 to-rose-500' },
];

export default function HomePage() {
  const [annual, setAnnual] = useState(false);
  const [activeVerbIndex, setActiveVerbIndex] = useState(0);
  const [activeScene, setActiveScene] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const [insightsInView, setInsightsInView] = useState(false);
  const mailingRef = useRef<HTMLDivElement | null>(null);
  const [mailingInView, setMailingInView] = useState(false);
  const founderRef = useRef<HTMLDivElement | null>(null);
  const [founderInView, setFounderInView] = useState(false);
  const [showAutomationTip, setShowAutomationTip] = useState(false);
  const heroPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (heroPaused) return;

    const interval = setInterval(
      () => setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length),
      4500,
    );

    return () => clearInterval(interval);
  }, [heroPaused]);

  useEffect(() => {
    return () => {
      if (heroPauseTimeoutRef.current) {
        clearTimeout(heroPauseTimeoutRef.current);
      }
    };
  }, []);

  const handleHeroManualSelect = (index: number) => {
    setHeroSlideIndex(index);
    setHeroPaused(true);
    if (heroPauseTimeoutRef.current) {
      clearTimeout(heroPauseTimeoutRef.current);
    }
    heroPauseTimeoutRef.current = setTimeout(() => setHeroPaused(false), 7000);
  };

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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF8F2] via-[#FFE3CF] to-[#FFD2AF] text-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65)_0,rgba(255,255,255,0)_55%)]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[18%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/30 blur-3xl opacity-40" />
          <div className="absolute left-[10%] top-[12%] h-72 w-72 rounded-[40%] bg-gradient-to-br from-[#FFB347]/40 via-[#FFCE8B]/30 to-transparent blur-[140px] animate-drift-slow" />
          <div className="absolute right-[6%] top-[28%] h-80 w-80 rounded-[40%] bg-gradient-to-br from-[#FF8F5C]/35 via-[#FFB199]/25 to-transparent blur-[150px] animate-drift" />
          <div className="absolute left-1/2 top-[60%] h-64 w-64 -translate-x-1/2 rounded-[50%] bg-gradient-to-br from-[#FFE8C8]/45 via-[#FFC58F]/25 to-transparent blur-[150px] animate-drift-medium" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,176,124,0.18)_0,rgba(255,255,255,0)_55%)]" />
        </div>
        <div className="relative mx-auto flex min-h-[85vh] w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 pb-24 pt-32 text-center text-slate-900">
          <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-orange-600 shadow-sm shadow-orange-200/60">
            AI Business Copilot
          </div>
          <h1 className="text-4xl font-black leading-[1.05] text-slate-900 md:text-6xl lg:text-7xl">
            Meet ZYYP - Your{' '}
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-rose-400 bg-clip-text text-transparent animate-gradientShift">
              AI Autopilot
            </span>{' '}
            for Support, Analytics & Growth.
            </h1>
          <p className="max-w-3xl text-lg text-slate-700 md:text-xl">
            Automate your customer interactions, analyze your performance, and unlock faster growth — all from one intelligent platform.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-[0.4em] text-slate-500">
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
          <div className="w-full max-w-4xl">
            <div className="hidden flex-col gap-5 md:flex">
              <div
                className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white p-6 text-left shadow-[0_40px_120px_rgba(255,138,76,0.18)]"
                onMouseEnter={() => setHeroPaused(true)}
                onMouseLeave={() => setHeroPaused(false)}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[36px] border border-white/40" />
                <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-orange-200/50 blur-3xl" />
                <div className="pointer-events-none absolute -right-6 bottom-0 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />
                <div className="relative rounded-[24px] border border-slate-200 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                  <div className="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-500">Live preview · stitched for founders</span>
                  </div>
                  <div className="relative h-[280px]">
                  {heroSlides.map((slide, index) => (
                    <div
                      key={slide.id}
                        className={`absolute inset-0 flex flex-col justify-between rounded-[20px] border border-slate-100 bg-gradient-to-br from-white to-orange-50/30 px-6 py-5 text-left text-slate-900 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        heroSlideIndex === index
                          ? 'translate-y-0 opacity-100'
                          : 'pointer-events-none translate-y-6 opacity-0'
                      }`}
                    >
                        <div>
                          <span className="inline-flex items-center rounded-full border border-orange-200/80 bg-orange-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
                            {slide.tag}
                          </span>
                          <h3 className="mt-6 text-2xl font-bold text-slate-900">{slide.headline}</h3>
                          <p className="mt-3 text-sm text-slate-600">{slide.subtitle}</p>
                          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                            {slide.pills.map((pill) => (
                              <span
                                key={pill}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em]"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-6 flex items-center justify-between pt-2">
                          <div>
                            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
                              {slide.metricLabel}
                            </p>
                            <p className="mt-1 text-3xl font-black text-slate-900">{slide.metricValue}</p>
                          </div>
                          <div className="relative h-14 w-28 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="absolute inset-0 bg-gradient-to-r from-white via-orange-50 to-transparent" />
                            <div
                              className={`absolute inset-y-2 left-3 right-3 rounded-xl bg-gradient-to-r ${slide.accent} opacity-80`}
                            />
                          </div>
                        </div>
                      </div>
                  ))}
                    <div className="invisible h-[280px] w-full" />
                  </div>
                </div>
                <div className="relative mt-5 flex items-center justify-center gap-3">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => handleHeroManualSelect(index)}
                      onMouseEnter={() => handleHeroManualSelect(index)}
                      className={`h-2 w-8 rounded-full transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500/60 ${
                        heroSlideIndex === index
                          ? `scale-y-150 bg-gradient-to-r ${slide.accent} shadow-[0_0_16px_rgba(255,149,0,0.4)]`
                          : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                      aria-label={`Show ${slide.tag}`}
                    />
                  ))}
                </div>
                <a
                  href="#how-it-works"
                  className="group absolute -bottom-12 right-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg shadow-orange-200/60 transition hover:border-slate-300 hover:text-slate-900"
                >
                  👀 Watch ZYYP in action — it’s fully autonomous.
                  <span className="transition group-hover:translate-x-1">↗</span>
                </a>
              </div>
            </div>
            <div className="mt-8 rounded-[32px] border border-white/80 bg-white/80 p-6 text-left text-slate-700 shadow-xl shadow-orange-200 md:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Live demo</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-900">AI reply drafted in 3 seconds</h3>
              <p className="mt-2 text-sm">
                ZYYP keeps the inbox, analytics, and automation flows running on your behalf. Watch it
                process refunds and surface insights while you’re on the go.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-black"
            >
              Launch your autopilot
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-slate-900/10 bg-white/80 px-8 py-3 text-base font-semibold text-slate-900 transition hover:border-slate-900/30"
            >
              See how it works
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-medium text-slate-600 md:mt-12">
            <span>Purpose-built for modern support & revenue teams</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Trusted by fast-moving operators across industries</span>
          </div>
        </div>
      </section>

      {/* Demo Loop */}
      <section className="bg-white py-20 text-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-center">
          <div className="w-full space-y-6 lg:w-[40%]">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              See ZYYP Power Your Business.
            </h2>
            <p className="text-lg text-slate-600">
              A silent, looping walkthrough that shows how ZYYP triages customer
              emails, drafts replies, and surfaces the analytics that keep every team
              ahead.
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
                        index === activeScene ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {scene.title}
                    </p>
                    <p
                      className={`text-sm ${
                        index === activeScene ? 'text-slate-600' : 'text-slate-500'
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
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 0 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-md rounded-3xl border border-cyan-400/30 bg-white p-6 text-left shadow-xl shadow-cyan-500/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-lg text-cyan-600">
                      ✉️
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Email from Maya</p>
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
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 1 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                <div className="mx-auto w-full max-w-lg rounded-[28px] border border-purple-400/40 bg-white p-6 shadow-xl shadow-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                        draft reply
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">AI Response</h3>
                    </div>
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-700">
                      97% confidence
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
                    <p>
                      Hi Maya — thanks for letting us know. I’ve already queued a replacement
                      to ship today with express delivery.
                    </p>
                    <p>
                      You’ll receive tracking in the next 2 hours. If you prefer a refund,
                      just reply to this email.
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
                className={`absolute inset-0 px-10 py-8 transition-all duration-600 ${
                  activeScene === 2 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
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
                    Thanks to instant AI triage, the support team cleared high-priority cases
                    before they aged.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-emerald-700/80">
                    <div className="rounded-2xl border border-emerald-400/30 bg-white/80 p-3">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-500/80">
                        csat
                      </p>
                      <p className="text-lg font-semibold text-emerald-900">4.8 / 5</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/30 bg-white/80 p-3">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-500/80">
                        approvals automated
                      </p>
                      <p className="text-lg font-semibold text-emerald-900">78%</p>
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
                <div className="mx-auto w-full max-w-xl rounded-[28px] border border-sky-400/30 bg-white p-6 shadow-xl shadow-sky-500/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-sky-500/80">
                        performance
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">Sales up 12%</h3>
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
                          style={{ height: `${value}%`, animationDelay: `${index * 0.12}s` }}
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

      {/* Autonomous Mailing Engine */}
      <section className="bg-white py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 lg:flex-row lg:items-stretch">
          <div className="w-full lg:w-[48%]">
            <div
              ref={mailingRef}
              className={`relative h-full transition-all duration-700 ${
                mailingInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
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
                      Your order is in the final packing stage and will ship within the next
                      24 hours. We’ve upgraded you to priority shipping at no cost so it
                      arrives on time.
                    </p>
                    <p>
                      You can track its journey anytime: <span className="underline">Track order</span>.
                    </p>
                    <p className="text-slate-500">
                      Thanks for your patience — we’ll ping you once it’s out the door.
                    </p>
                    <p>— Team ZYYP Automations</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Smart recommendations
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      <li>• Add 10% discount if order is delayed beyond 3 days.</li>
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
              mailingInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            } lg:w-[52%]`}
            style={{ transitionDelay: '120ms' }}
          >
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Autonomous Mailing Engine — Never Miss a Customer Again.
            </h2>
            <p className="text-lg text-slate-600">
              ZYYP auto-drafts and sends follow-ups, offers, and updates based on customer
              behavior, tickets, or sales trends — all fully editable by you.
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
                    <p className="text-base font-semibold text-slate-900">{feature.title}</p>
                    <p className="text-sm text-slate-600">{feature.description}</p>
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
              founderInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            } lg:w-[40%]`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Made for Founders
            </div>
            <h2 className="text-3xl font-black md:text-4xl">
              Run your business like a $100M brand - even if you’re solo.
            </h2>
            <p className="text-lg text-white/70">
              ZYYP gives entrepreneurs and teams enterprise-grade automation, analytics, and
              growth intelligence — without extra hires.
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
              founderInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
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
              Autonomous workflows across every platform
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Connect ZYYP with your favorite tools — from e-commerce to marketing to support —
              for a truly autonomous business workflow.
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
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} text-xl shadow-inner shadow-white/20 transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.45)]`}
                  >
                    {tool.emoji}
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {tool.name}
                    </p>
                    <p className="text-xs text-slate-400">Connected in minutes</p>
                  </div>
                </div>
              </div>
            ))}
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
