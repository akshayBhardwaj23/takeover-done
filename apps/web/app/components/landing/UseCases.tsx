'use client';

export default function UseCases() {
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

  return (
    <section id="careers" className="bg-slate-900 py-20 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black md:text-4xl">
            Built for modern ecommerce support teams
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Whether you are a solo founder or a CX org supporting multiple
            brands, the assistant adapts to your workflow and approval process.
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
  );
}
