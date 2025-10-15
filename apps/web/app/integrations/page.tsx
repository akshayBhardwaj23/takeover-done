'use client';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function IntegrationsInner() {
  const sp = useSearchParams();
  const connected = sp.get('connected');
  const shop = sp.get('shop');
  const { data } = trpc.connections.useQuery();

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Integrations</h1>

      {connected && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Store connected successfully{shop ? `: ${shop}` : ''}.
        </div>
      )}

      <section className="rounded-md border p-4">
        <h2 className="font-medium">Shopify</h2>
        <p className="mt-1 text-sm text-gray-600">
          Connect your Shopify store to sync orders and take actions.
        </p>
        <form
          className="mt-3 flex items-center gap-2"
          action="/api/shopify/install"
          method="get"
        >
          <input
            type="text"
            name="shop"
            placeholder="your-shop.myshopify.com"
            className="w-80 rounded border px-3 py-2 text-sm"
            required
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
                <span>{c.shopDomain ?? '(unknown)'}</span>
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
