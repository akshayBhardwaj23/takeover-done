'use client';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Suspense, useEffect, useMemo, useState } from 'react';

export const dynamic = 'force-dynamic';

function IntegrationsInner() {
  const sp = useSearchParams();
  const connected = sp.get('connected');
  const shop = sp.get('shop');
  const { data } = trpc.connections.useQuery();
  const [shopInput, setShopInput] = useState('');
  const connections = useMemo(() => data?.connections ?? [], [data]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Integrations</h1>

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

      <section className="rounded-md border p-4">
        <h2 className="font-medium">Shopify</h2>
        <p className="mt-1 text-sm text-gray-600">
          Connect your Shopify store to sync orders and take actions.
        </p>
        <form className="mt-3 flex items-center gap-2" onSubmit={onSubmit}>
          <input
            type="text"
            name="shop"
            placeholder="your-shop.myshopify.com"
            className="w-80 rounded border px-3 py-2 text-sm"
            required
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-black px-3 py-2 text-sm text-white"
          >
            Connect
          </button>
        </form>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-gray-900">
            Connected stores
          </h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(data?.connections ?? []).length === 0 && (
              <li className="text-gray-500">No stores connected yet.</li>
            )}
            {(data?.connections ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <a
                  href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                  className="text-indigo-600 hover:underline"
                >
                  {c.shopDomain ?? '(unknown)'}
                </a>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {c.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
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
