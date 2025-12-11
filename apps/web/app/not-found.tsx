import Link from 'next/link';

const suggestions = [
  { href: '/', label: 'Back to home' },
  { href: '/integrations', label: 'Explore integrations' },
  { href: '/pricing', label: 'Compare pricing' },
  { href: '/usage', label: 'See the product in action' },
];

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.15)_0,rgba(15,23,42,0)_55%)]" />
      </div>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          Error 404
        </span>
        <h1 className="mt-8 text-4xl font-black leading-tight md:text-6xl">
          Lost in the inbox?
          <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
            We can’t find that page.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-white/70 md:text-lg">
          The link you followed may be broken or the page might have been
          removed. Let’s get you back to scaling stellar ecommerce support.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Go to homepage
          </Link>
          <a
            href="mailto:hello@zyyp.ai"
            className="rounded-full border border-white/30 px-10 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/60"
          >
            Contact support
          </a>
        </div>

        <div className="mt-16 grid w-full max-w-3xl gap-4 md:grid-cols-2">
          {suggestions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-left transition hover:-translate-y-1 hover:border-white/30"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                  Suggested
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {item.label}
                </p>
              </div>
              <span className="text-2xl text-white/60 transition group-hover:translate-x-1 group-hover:text-white">
                →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
