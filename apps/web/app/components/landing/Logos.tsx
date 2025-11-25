'use client';

export default function Logos() {
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

  return (
    <section className="border-b border-slate-100 bg-white py-16">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-6 px-6 text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
        {trustedLogos.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </div>
    </section>
  );
}
