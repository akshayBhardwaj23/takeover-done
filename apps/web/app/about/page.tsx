export const metadata = {
  title: "About Us - Zyyp",
  description:
    "Learn how Zyyp empowers Shopify teams with AI-driven customer support automation.",
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-24 pt-36 sm:px-10">
        <header className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Our Story
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Building the fastest customer support workflow for modern Shopify
            brands.
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">
            Zyyp is a collective of operators, designers, and engineers who
            spent the last decade scaling e-commerce experiences. We know the
            frustration of juggling customer emails, DMs, and order questions—
            so we built an AI-powered assistant that streamlines every touch
            point without sacrificing your brand voice.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/60 p-10 shadow-sm shadow-slate-900/5 backdrop-blur">
            <h2 className="text-2xl font-semibold text-slate-900">
              What we believe
            </h2>
            <p className="text-slate-600">
              Support teams deserve tools that work as hard as they do. That
              means automations that are transparent, data that is actionable,
              and workflows that feel intuitive from day one. We focus on
              building experiences that are opinionated, but flexible enough to
              adapt to every brand.
            </p>
          </div>
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/60 p-10 shadow-sm shadow-slate-900/5 backdrop-blur">
            <h2 className="text-2xl font-semibold text-slate-900">
              How we work
            </h2>
            <p className="text-slate-600">
              We design with your customers in mind, shipping updates every two
              weeks and layering feedback loops directly into our roadmap. The
              team is remote-first with bases in India, Singapore, and Canada,
              enabling 24/5 coverage for all enterprise support plans.
            </p>
          </div>
        </div>

        <section className="space-y-6 rounded-3xl border border-slate-200 bg-slate-900 px-10 py-12 text-white shadow-lg shadow-slate-900/20">
          <h2 className="text-3xl font-semibold">Our mission</h2>
          <p className="text-lg text-white/80">
            Give every e-commerce team a co-pilot that resolves issues in
            seconds, uncovers revenue opportunities, and keeps customers loyal.
            We are on a mission to make support a strategic advantage—not a cost
            center.
          </p>
        </section>
      </section>
    </main>
  )
}

