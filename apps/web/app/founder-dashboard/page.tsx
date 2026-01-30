'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { trpc } from '../../lib/trpc';

type Ctx = any;

function FounderDashboardInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const shopParam = sp.get('shop') || '';

  const { data: connectionsData } = trpc.connections.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const stores = useMemo(() => {
    const raw = (connectionsData?.connections as any[]) ?? [];
    return raw
      .filter((c) => c.type === 'SHOPIFY' && c.shopDomain)
      .map((c) => ({
        id: c.id,
        shopDomain: c.shopDomain as string,
        name: (c.metadata as any)?.storeName || String(c.shopDomain).replace('.myshopify.com', ''),
      }));
  }, [connectionsData]);

  useEffect(() => {
    if (shopParam) return;
    if (!stores.length) return;
    router.replace(`/founder-dashboard?shop=${encodeURIComponent(stores[0]!.shopDomain)}` as any);
  }, [router, shopParam, stores]);

  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!shopParam) return;
      setLoading(true);
      setError('');
      try {
        const url = new URL('/api/market-intelligence/context', window.location.origin);
        url.searchParams.set('shop', shopParam);
        const res = await fetch(url.toString());
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(json?.error || 'Failed to load dashboard');
        if (!cancelled) setCtx(json);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shopParam]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Founder Dashboard</h1>
            <Badge variant="secondary">Top 3</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            The three highest-leverage actions for today, grounded in your store + market context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {shopParam ? <Badge variant="outline">{shopParam}</Badge> : <Badge variant="outline">Select a shop</Badge>}
          {stores.length > 1 && (
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              value={shopParam}
              onChange={(e) => router.replace(`/founder-dashboard?shop=${encodeURIComponent(e.target.value)}` as any)}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.shopDomain}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading && (
        <Card className="mt-6 p-5">
          <div className="text-sm text-slate-600">Loading…</div>
        </Card>
      )}
      {error && (
        <Card className="mt-6 border-rose-200 bg-rose-50 p-5">
          <div className="text-sm text-rose-700">{error}</div>
        </Card>
      )}

      {ctx && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Today’s actions</div>
              <Link
                href={( `/market-intelligence?shop=${encodeURIComponent(shopParam)}` as any)}
                className="text-xs font-semibold text-slate-700 underline hover:text-slate-900"
              >
                Open Market Intelligence →
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {(ctx.actions || []).map((a: any, i: number) => (
                <div key={a.id || i} className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {i + 1}. {a.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{a.rationale}</div>
                    </div>
                    <Badge variant="secondary">{a.confidence}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(a.ctas || []).slice(0, 2).map((c: any, idx: number) => (
                      <Link
                        key={idx}
                        href={(c.href as any)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-800">Risks to watch</div>
            <div className="mt-3 space-y-3">
              {(ctx.alerts || []).length ? (
                (ctx.alerts as any[]).slice(0, 4).map((r, i) => (
                  <div key={r.id || i} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900">{r.title}</div>
                      <Badge variant="secondary">{r.severity}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{r.message}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-600">No active risks detected.</div>
              )}
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Tip: Use What‑If to compare “safe vs aggressive” plans before executing.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function FounderDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28">
          <Card className="p-5">
            <div className="text-sm text-slate-600">Loading Founder Dashboard…</div>
          </Card>
        </div>
      }
    >
      <FounderDashboardInner />
    </Suspense>
  );
}

