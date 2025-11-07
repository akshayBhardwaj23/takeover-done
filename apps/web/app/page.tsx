'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';

const trustedLogos = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
];

const deployments = [
  { id: 'deploy-dev-eu-324', time: '2h ago', branch: 'master' },
  { id: 'deploy-prod-eu-128', time: '10m ago', branch: 'main' },
  { id: 'deploy-dev-us-445', time: '45m ago', branch: 'feature/auth' },
  { id: 'deploy-prod-ap-223', time: '1h ago', branch: 'main' },
  { id: 'deploy-dev-eu-891', time: '2h ago', branch: 'fix/cache' },
  { id: 'deploy-prod-us-337', time: '3h ago', branch: 'main' },
  { id: 'deploy-dev-ap-556', time: '4h ago', branch: 'feat/api' },
  { id: 'deploy-dev-eu-672', time: '5h ago', branch: 'feat/search' },
  { id: 'deploy-prod-ap-445', time: '6h ago', branch: 'main' },
  { id: 'deploy-dev-us-891', time: '7h ago', branch: 'fix/perf' },
  { id: 'deploy-prod-eu-223', time: '8h ago', branch: 'main' },
  { id: 'deploy-dev-ap-337', time: '9h ago', branch: 'feat/analytics' },
];

const modelCards = [
  {
    name: 'OpenAI',
    model: 'GPT 5',
    status: 'Connected',
    badge: 'All Models 69,420',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    name: 'Claude 4 Opus',
    model: 'Unavailable',
    status: 'Standby',
    badge: 'Premium',
    accent: 'from-slate-500 to-gray-700',
  },
  {
    name: 'ChatGPT',
    model: 'Connected',
    status: 'Active',
    badge: 'Auto',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Llama 3.2',
    model: 'Waiting',
    status: 'Queue',
    badge: 'Beta',
    accent: 'from-sky-500 to-cyan-500',
  },
];

const useCases = [
  'DevOps',
  'SalesOps',
  'Supply Chain',
  'Customer Support',
  'DataOps',
  'FinOps',
];

const benefits = [
  {
    title: 'Launch Faster',
    description:
      'Visually orchestrate autonomous agents without writing boilerplate code.',
  },
  {
    title: 'Iterate Rapidly',
    description:
      'Preview and debug workflow logic in a safe sandbox before deploying.',
  },
  {
    title: 'Scale Smarter',
    description:
      'Automate complex operations with observable and governed agentic systems.',
  },
];

const pricingPlans = [
  {
    name: 'Growth',
    price: 49,
    description: 'Early stage teams',
    features: [
      'Up to 5 active agents',
      '50 simulation runs',
      'Visual builder access',
      'GitHub + Zapier integration',
      'Basic support',
      '1 team workspace',
      'Workflow APIs',
      'Community Slack access',
    ],
  },
  {
    name: 'Scale',
    price: 129,
    description: 'Fast moving startups',
    features: [
      'Up to 25 active agents',
      '150 simulation runs',
      'Visual builder access',
      'GitHub + Zapier integration',
      'Priority support',
      '3 team workspaces',
      'Workflow APIs',
      'Priority Slack access',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 249,
    description: 'Large enterprises',
    features: [
      'Unlimited active agents',
      'Unlimited simulation runs',
      'Visual builder access',
      'GitHub + Zapier integration',
      'Priority support',
      'Unlimited team workspaces',
      'Workflow APIs',
      'Priority Slack access',
      'Access to Fight Club',
    ],
  },
];

const faqs = [
  {
    question: 'What exactly does this platform do?',
    answer:
      'Zyyp lets technical teams design, simulate, and deploy agentic workflows with zero boilerplate. Drag, drop, and orchestrate complex automations visually.',
  },
  {
    question: 'How do I get started with creating my first workflow?',
    answer:
      'Sign up, choose a starter template, and launch the drag-and-drop builder. You can connect data sources and deploy to your sandbox in minutes.',
  },
  {
    question: 'What tools and services can I integrate?',
    answer:
      'Connect Slack, GitHub, Zapier, popular LLMs, and any custom stack using our connector SDK and workflow APIs.',
  },
  {
    question: 'Is my data secure when using AI agents?',
    answer:
      'We follow enterprise-grade security practices, maintain SOC 2 controls, and support private deployments so your data never leaves your environment.',
  },
  {
    question: 'Can I test workflows before they go live?',
    answer:
      'Simulate every path inside a dedicated sandbox, get granular logs, and promote when you are confident with coverage.',
  },
  {
    question: "What's the difference between automated and manual steps?",
    answer:
      'Automated steps run autonomously using configured triggers and tools. Manual steps prompt human teammates when approvals or oversight is required.',
  },
];

const heroFlares: Array<{ style: CSSProperties; className: string }> = [
  {
    style: { top: '-12%', left: '-10%', width: '28rem', height: '28rem' },
    className:
      'rounded-full bg-gradient-to-br from-cyan-500/25 via-sky-500/10 to-transparent blur-3xl opacity-80 animate-[float_18s_ease-in-out_infinite] mix-blend-screen',
  },
  {
    style: { top: '8%', right: '-8%', width: '32rem', height: '32rem' },
    className:
      'rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[160px] opacity-80 animate-[float_22s_ease-in-out_infinite] mix-blend-screen',
  },
  {
    style: { bottom: '-18%', left: '25%', width: '36rem', height: '36rem' },
    className:
      'rounded-full bg-gradient-to-tr from-blue-400/15 via-teal-400/10 to-transparent blur-[140px] opacity-70 animate-[float_20s_ease-in-out_infinite] mix-blend-screen',
  },
];

const heroSparkles: Array<{ style: CSSProperties; delay: string }> = [
  { style: { top: '18%', left: '18%' }, delay: '0s' },
  { style: { top: '32%', right: '22%' }, delay: '0.6s' },
  { style: { top: '58%', left: '28%' }, delay: '1.2s' },
  { style: { top: '48%', right: '30%' }, delay: '1.5s' },
  { style: { top: '70%', left: '50%' }, delay: '0.9s' },
  { style: { top: '26%', right: '45%' }, delay: '0.3s' },
];

export default function HomePage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.18)_0,rgba(15,23,42,0)_45%)]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {heroFlares.map((flare, index) => (
            <div key={`hero-flare-${index}`} className={flare.className} style={flare.style} />
          ))}
          <div className="absolute left-1/2 top-[18%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/10 bg-white/5 blur-3xl opacity-40 mix-blend-screen" />
          <div className="absolute left-1/2 top-[18%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full border border-white/10 opacity-60 mix-blend-overlay animate-[spin_45s_linear_infinite]" />
          <div className="absolute left-1/2 top-[18%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full border border-white/5 opacity-30 mix-blend-overlay animate-[spin_30s_linear_infinite_reverse]" />
          {heroSparkles.map((sparkle, index) => (
            <span
              key={`hero-sparkle-${index}`}
              className="absolute h-2 w-2 rounded-full bg-cyan-100/70 shadow-[0_0_12px_rgba(165,243,252,0.8)]"
              style={{ ...sparkle.style, animation: `float 6s ease-in-out infinite`, animationDelay: sparkle.delay }}
            />
          ))}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.08)_0,rgba(15,23,42,0)_55%)]" />
        </div>
        <div className="relative mx-auto flex min-h-[90vh] w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 pb-24 pt-40 text-center">
          <div className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            Zyyp Zyyp
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
            Manage and simulate
            <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              agentic workflows
            </span>
          </h1>
          <p className="max-w-3xl text-lg text-white/70 md:text-xl">
            We empower developers and technical teams to create, simulate, and
            manage AI-driven workflows visually. Build faster, iterate smarter,
            and launch confidently with an end-to-end agent operations platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Start building
            </Link>
            <a
              href="#pricing"
              className="rounded-full border border-white/30 px-8 py-3 text-base font-semibold text-white transition hover:border-white hover:text-white"
            >
              View pricing
            </a>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm font-medium text-white/50">
            <span>Innovative AI solution 2025</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Trusted by fast moving engineering teams</span>
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

      {/* Integrations overview */}
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Integrates easily
            </h2>
            <p className="text-lg text-slate-600 md:text-xl">
              Design your workflow, connect your tools, and deploy in minutes.
              Autonomous agents coordinate everything end-to-end so you can ship
              faster.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  title: 'Design your Workflow',
                  description:
                    'Drag-and-drop interface to create, connect, and configure agents into logical workflows.',
                },
                {
                  title: 'Connect your Tools',
                  description:
                    'Agents operate independently and coordinate tasks to complete complex goals together.',
                },
                {
                  title: 'Deploy & Scale',
                  description:
                    'Run agent workflows in a sandbox to preview behavior, debug logic, and test interactions.',
                },
                {
                  title: 'Realtime Insights',
                  description:
                    'Monitor triggers, tool usage, and outcomes with timestamped audit logs across every workflow.',
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
                Explore workflows
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
              <span>Slack</span>
              <span>#standups · Connected</span>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Anthropic
                  </p>
                  <p className="text-xs text-slate-500">
                    Claude 4 · UI Generator
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Meta</p>
                  <p className="text-xs text-slate-500">
                    Llama 2 · Text Generator
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                  Queued
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">OpenAI</p>
                  <p className="text-xs text-slate-500">
                    GPT-5 · Code Generator
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                  Connected
                </span>
              </div>
            </div>
            <div className="grid gap-3">
              {deployments.slice(0, 6).map((deploy) => (
                <div
                  key={deploy.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div className="font-semibold text-slate-700">
                    {deploy.id}
                  </div>
                  <div className="text-xs text-slate-500">
                    {deploy.time}
                    <span className="mx-2 text-slate-400">·</span>
                    {deploy.branch}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Model selector */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">
              Built for Agentic Intelligence
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Track real-time activity of agents with detailed records of
              triggers, tools used, outcomes, and timestamps.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {modelCards.map((card) => (
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
                title: 'Text-to-Workflow Builder',
                description:
                  'Preview and debug workflow logic in a safe sandbox before deploying, helping you iterate with confidence.',
              },
              {
                title: 'Native Tools Integration',
                description:
                  'Track real-time activity of agents with detailed records of triggers, tools, outcomes, and timestamps.',
              },
              {
                title: 'Realtime Sync',
                description:
                  'Agents operate independently and coordinate tasks to complete complex goals with live collaboration.',
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
              Across various industries
            </h2>
            <p className="mt-4 text-lg text-white/70">
              We empower developers and technical teams to create, simulate, and
              manage AI-driven workflows visually.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div
                key={useCase}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-inner shadow-black/20 transition hover:-translate-y-1 hover:border-white/20"
              >
                <h3 className="text-xl font-semibold">{useCase}</h3>
                <p className="mt-3 text-sm text-white/70">
                  Visually orchestrate autonomous agents without writing
                  boilerplate code.
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
              Making engineers 10x faster
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Empower teams to ship intelligent workflows faster with an
              opinionated toolchain that keeps humans in control.
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
                    Realtime intelligence
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { label: 'API Calls', value: '68,421' },
                  { label: 'Success Rate', value: '99.1%' },
                  { label: 'Workflows', value: '312 active' },
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
                Trusted by fast growing startups
              </p>
              <p className="mt-4 text-2xl font-black text-slate-900">
                “Aceternity changed how we build internal tools. It’s like
                having a second engineering team that never sleeps.”
              </p>
              <div className="mt-6 text-sm font-semibold text-slate-600">
                <p>James Fincher</p>
                <p>CEO, Aceternity · 10x hours saved</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deployments ticker */}
      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black md:text-3xl">Deploy & Scale</h2>
            <p className="text-sm text-white/60">
              Run agent workflows in a sandbox to preview behavior, debug logic,
              and test interactions.
            </p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {deployments.map((deploy) => (
              <div
                key={deploy.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm shadow-inner shadow-black/40"
              >
                <div className="font-semibold tracking-wide text-white/90">
                  {deploy.id}
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {deploy.time} · {deploy.branch}
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
              Simple and feasible pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Switch between monthly and yearly billing to save more with annual
              plans.
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
                  {plan.featured ? 'Start for free' : 'Start building'}
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
              Scale securely with confidence
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Our AI assistant is designed with enterprise-grade security
              practices and compliant with global data protection standards.
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
                Configure regional isolation, private VPC deployment, and
                role-based access so workflows stay compliant from day one.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold">Granular governance</h3>
              <p className="mt-3 text-sm text-white/70">
                Attribute every action to a human or agent identity. Export
                audit logs, monitor permissions, and enable approvals where
                needed.
              </p>
            </div>
            <Link
              href="/integrations"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Start for free
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
            Connect your current stack and start automating
          </h2>
          <p className="max-w-3xl text-lg text-white/70">
            Launch AI-driven workflows with confidence. Preview every run,
            simulate complex scenarios, and deploy to production without manual
            toil.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/integrations"
              className="rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Start building for free
            </Link>
            <a
              href="https://cal.com/notus/demo"
              className="rounded-full border border-white/30 px-10 py-3 text-sm font-semibold text-white transition hover:border-white"
              target="_blank"
              rel="noreferrer"
            >
              Contact sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
