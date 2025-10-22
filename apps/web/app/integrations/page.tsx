'use client';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Suspense, useEffect, useState, type ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '../../../../@ai-ecom/api/components/ui/dialog';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { Input } from '../../../../@ai-ecom/api/components/ui/input';

export const dynamic = 'force-dynamic';

type ConnectionSummary = {
  id: string;
  type: string;
  shopDomain: string | null;
  createdAt?: string;
  metadata?: any;
};

function IntegrationsInner() {
  const { data: session } = useSession();
  const sp = useSearchParams();
  const connected = sp.get('connected');
  const shop = sp.get('shop');
  const { data } = trpc.connections.useQuery();
  const emailHealth = trpc.emailHealth.useQuery();
  const utils = (trpc as any).useUtils();
  const createAlias = trpc.createEmailAlias.useMutation({
    onSuccess: () => utils.connections.invalidate(),
  });
  const rotateAlias = trpc.rotateAlias.useMutation({
    onSuccess: () => utils.connections.invalidate(),
  });
  const setAliasStatus = trpc.setAliasStatus.useMutation({
    onSuccess: () => utils.connections.invalidate(),
  });
  const [shopInput, setShopInput] = useState('');
  const connections: ConnectionSummary[] = ((data as any)?.connections ??
    []) as ConnectionSummary[];
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  // Dialog is uncontrolled via DialogTrigger

  useEffect(() => {
    const already = (sp as any).get('already');
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
    (window as any).location.href =
      `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <main className="space-y-6 p-6">
      <div className="container-max">
        <h1 className="text-2xl font-bold">Integrations</h1>

        {connected && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Store connected successfully{shop ? `: ${shop}` : ''}.
          </div>
        )}
        {toast && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${toast.type === 'error' ? 'border border-red-200 bg-red-50 text-red-900' : 'border border-emerald-200 bg-emerald-50 text-emerald-900'}`}
          >
            {toast.text}
          </div>
        )}

        <Dialog>
          <section className="mt-4 rounded-xl border border-indigo-200/60 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-xs text-white">
                    S
                  </span>
                  Shopify
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Connect your Shopify store to sync orders and take actions.
                </p>
              </div>
              <DialogTrigger asChild>
                <Button>Connect Store</Button>
              </DialogTrigger>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-medium text-gray-900">
                Connected stores
              </h3>
              {connections.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  No stores connected yet.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connections.map((c) => (
                    <Card
                      key={c.id}
                      className="group p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {c.shopDomain ?? '(unknown)'}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {c.type}
                      </Badge>
                      <div className="mt-4 flex items-center justify-between">
                        <Button variant="link" asChild>
                          <a
                            href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                          >
                            Open dashboard →
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Shopify Store</DialogTitle>
            </DialogHeader>
            <form className="flex items-center gap-2" onSubmit={onSubmit}>
              <Input
                type="text"
                name="shop"
                placeholder="your-shop.myshopify.com"
                required
                value={shopInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setShopInput((e as any).target.value)
                }
              />
              <Button type="submit">Connect</Button>
            </form>
            <DialogFooter>
              <p className="mt-1 text-xs text-gray-500">
                Tip: Use your full shop domain, e.g.,{' '}
                <code>dev-yourshop.myshopify.com</code>
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <section className="mt-4 rounded-xl border border-indigo-200/60 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs text-white">
                  E
                </span>
                Custom Email
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Forward your support inbox to a unique alias so we can ingest
                and analyze messages.
              </p>
            </div>
            <Button
              onClick={() => {
                const email = (session as any)?.user?.email;
                if (!email) {
                  alert('Please sign in first.');
                  return;
                }
                createAlias.mutate({
                  userEmail: email,
                  domain:
                    (process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN as any) ||
                    'mail.example.com',
                });
              }}
            >
              {createAlias.isPending ? 'Creating…' : 'Create alias'}
            </Button>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-medium text-gray-900">Aliases</h3>
            <p className="mt-1 text-xs text-gray-500">
              Forward your support mailbox (e.g., support@yourbrand.com) to the
              alias below.
            </p>
            {(connections.filter((c) => c.type === 'CUSTOM_EMAIL').length ===
              0 && (
              <p className="mt-2 text-sm text-gray-500">
                No custom email alias created yet.
              </p>
            )) || (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {connections
                  .filter((c) => c.type === 'CUSTOM_EMAIL')
                  .map((c) => (
                    <Card
                      key={c.id}
                      className="group p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="text-sm font-semibold text-gray-900 break-all">
                        {(c as any)?.metadata?.alias ?? '(pending alias)'}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        Custom Email
                      </Badge>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(c as any)?.metadata?.alias && (
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  (c as any).metadata.alias,
                                );
                                alert('Alias copied to clipboard');
                              } catch {
                                alert('Copy failed');
                              }
                            }}
                          >
                            Copy alias
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => rotateAlias.mutate({ id: c.id })}
                        >
                          {rotateAlias.isPending ? 'Rotating…' : 'Rotate'}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setAliasStatus.mutate({
                              id: c.id,
                              disabled: !(c as any)?.metadata?.disabled,
                            })
                          }
                        >
                          {(c as any)?.metadata?.disabled
                            ? 'Enable'
                            : 'Disable'}
                        </Button>
                      </div>
                    </Card>
                  ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="p-4">
                <div className="text-sm font-semibold">Mailgun health</div>
                <div className="mt-2 text-sm text-gray-600">
                  Last inbound delivery
                </div>
                <div className="mt-1 text-sm">
                  {emailHealth.data?.lastInboundAt
                    ? new Date(
                        emailHealth.data.lastInboundAt as any,
                      ).toLocaleString()
                    : '—'}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm font-semibold">Setup</div>
                <ol className="mt-2 list-decimal pl-5 text-sm text-gray-700">
                  <li>Create alias</li>
                  <li>
                    Set Mailgun Route to forward to /api/webhooks/email/custom
                  </li>
                  <li>Add forward from your mailbox to the alias</li>
                </ol>
              </Card>
            </div>
          </div>
        </section>
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
