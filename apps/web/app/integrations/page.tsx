'use client';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Suspense, useEffect, useMemo, useState } from 'react';

export const dynamic = 'force-dynamic';

type ConnectionSummary = {
  id: string;
  type: string;
  shopDomain: string | null;
  createdAt?: string;
};

function IntegrationsInner() {
  const sp = useSearchParams();
  const connected = sp.get('connected');
  const shop = sp.get('shop');
  const { data } = trpc.connections.useQuery();
  const [shopInput, setShopInput] = useState('');
  const connections = useMemo<ConnectionSummary[]>(
    () => (data?.connections ?? []) as ConnectionSummary[],
    [data],
  );
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const already = sp.get('already');
    if (already === '1' && shop) {
      setToast({ type: 'success', text: `Store already connected: ${shop}` });
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [sp, shop]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const domain = shopInput.trim().toLowerCase();
    if (!domain) return;
    const exists = connections.some(
      (c) => (c.shopDomain ?? '').toLowerCase() === domain,
    );
    if (exists) {
      setToast({ type: 'error', text: 'This store is already connected.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <main className="space-y-6 p-6">
      <div className="container-max">
        <h1 className="text-2xl font-bold">
          Integrations
        </h1>

        {connected && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Store connected successfully{shop ? `: ${shop}` : ''}.
          </div>
        )}
        {toast && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              toast.type === 'error'
                ? 'border border-red-200 bg-red-50 text-red-900'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            {toast.text}
          </div>
        )}

        <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                  S
                </span>
                Shopify
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Connect your Shopify store to sync orders and take actions.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => setIsModalOpen(true)}>
              Connect Store
            </button>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-medium">
              Connected stores
            </h3>
            {connections.length === 0 ? (
              <p className="mt-2 text-sm text-white/60">
                No stores connected yet.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {connections.map((c) => (
                  <div
                    key={c.id}
                    className="group rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm ring-1 ring-transparent transition hover:shadow-md hover:ring-white/20"
                  >
                    <div className="text-sm font-semibold">
                      {c.shopDomain ?? '(unknown)'}
                    </div>
                    <div className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80">
                      {c.type}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <a
                        href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                        className="text-xs font-medium text-white hover:underline"
                      >
                        Open dashboard →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {isModalOpen && (
          <div
            className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">
                  Connect Shopify Store
                </h3>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-sm text-white/70 hover:bg-white/10"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </button>
              </div>
              <form className="flex items-center gap-2" onSubmit={onSubmit}>
                <input
                  type="text"
                  name="shop"
                  placeholder="your-shop.myshopify.com"
                  className="w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                  value={shopInput}
                  onChange={(e) => setShopInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Connect
                </button>
              </form>
              <p className="mt-2 text-xs text-white/60">
                Tip: Use your full shop domain, e.g.,{' '}
                <code>dev-yourshop.myshopify.com</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<main className="p-6">Loading…</main>}>
      <IntegrationsInner />
    </Suspense>
  );
}
