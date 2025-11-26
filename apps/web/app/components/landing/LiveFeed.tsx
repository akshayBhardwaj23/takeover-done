'use client';

export default function LiveFeed() {
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

  return (
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
  );
}
