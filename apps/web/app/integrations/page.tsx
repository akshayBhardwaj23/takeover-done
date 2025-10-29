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
import {
  Store,
  Mail,
  Copy,
  RefreshCw,
  Power,
  CheckCircle2,
  AlertCircle,
  Plus,
  ExternalLink,
  ShoppingBag,
  Zap,
  Shield,
  Activity,
} from 'lucide-react';
import {
  StatsCardSkeleton,
  IntegrationCardSkeleton,
} from '../../components/SkeletonLoaders';
import { useToast, ToastContainer } from '../../components/Toast';

export const dynamic = 'force-dynamic';

type ConnectionSummary = {
  id: string;
  type: string;
  shopDomain: string | null;
  createdAt?: string;
  metadata?: any;
};

function IntegrationsInner() {
  const toast = useToast();
  const { data: session } = useSession();
  const sp = useSearchParams();
  const connected = sp.get('connected');
  const shop = sp.get('shop');
  const { data, isLoading: connectionsLoading } = trpc.connections.useQuery();
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

  useEffect(() => {
    const already = (sp as any).get('already');
    if (already === '1' && shop) {
      toast.success(`Store already connected: ${shop}`);
    }
  }, [sp, shop, toast]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const domain = shopInput.trim().toLowerCase();
    if (!domain) return;
    const exists = connections.some(
      (c) => (c.shopDomain ?? '').toLowerCase() === domain,
    );
    if (exists) {
      toast.error('This store is already connected.');
      return;
    }
    (window as any).location.href =
      `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  }

  const shopifyConnections = connections.filter((c) => c.type === 'SHOPIFY');
  const emailConnections = connections.filter((c) => c.type === 'CUSTOM_EMAIL');

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="mx-auto max-w-7xl space-y-8 p-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
              Integrations
            </h1>
            <p className="text-lg text-slate-600">
              Connect your tools and automate your workflow
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {connectionsLoading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
                <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600">
                        Shopify Stores
                      </p>
                      <p className="mt-2 text-3xl font-bold text-indigo-900">
                        {shopifyConnections.length}
                      </p>
                    </div>
                    <ShoppingBag className="h-12 w-12 text-indigo-400" />
                  </div>
                </Card>
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600">
                        Email Aliases
                      </p>
                      <p className="mt-2 text-3xl font-bold text-amber-900">
                        {emailConnections.length}
                      </p>
                    </div>
                    <Mail className="h-12 w-12 text-amber-400" />
                  </div>
                </Card>
              </>
            )}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">
                    Active Status
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                    {
                      emailConnections.filter((c) => !c.metadata?.disabled)
                        .length
                    }
                    /{emailConnections.length}
                  </p>
                </div>
                <Activity className="h-12 w-12 text-emerald-400" />
              </div>
            </Card>
          </div>

          <Dialog>
            {/* Shopify Integration Section */}
            <section className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-blue-500/5" />

              <div className="relative p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg">
                      <Store className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        Shopify
                      </h2>
                      <p className="mt-2 max-w-2xl text-slate-600">
                        Connect your Shopify store to sync orders in real-time,
                        manage inventory, and automate customer support
                        workflows.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <Zap className="mr-1 h-3 w-3" />
                          Real-time sync
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-700">
                          <Shield className="mr-1 h-3 w-3" />
                          Secure OAuth
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Connect Store
                    </Button>
                  </DialogTrigger>
                </div>

                <div className="mt-8">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Connected Stores
                  </h3>
                  {connectionsLoading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <IntegrationCardSkeleton />
                      <IntegrationCardSkeleton />
                    </div>
                  ) : shopifyConnections.length === 0 ? (
                    <Card className="border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <Store className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-3 font-medium text-slate-900">
                        No stores connected yet
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Get started by connecting your first Shopify store
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {shopifyConnections.map((c) => (
                        <Card
                          key={c.id}
                          className="group/card border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 transition-all hover:border-indigo-300 hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
                                  <Store className="h-4 w-4 text-white" />
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                              <h4 className="mt-3 font-semibold text-slate-900">
                                {c.shopDomain ?? '(unknown)'}
                              </h4>
                              {c.createdAt && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Connected{' '}
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="mt-4 w-full group-hover/card:bg-indigo-50 group-hover/card:text-indigo-700"
                            asChild
                          >
                            <a
                              href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                            >
                              Open Inbox
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <DialogTitle className="text-xl">
                    Connect Shopify Store
                  </DialogTitle>
                </div>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Store Domain
                  </label>
                  <Input
                    type="text"
                    name="shop"
                    placeholder="your-shop.myshopify.com"
                    required
                    value={shopInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setShopInput((e as any).target.value)
                    }
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                  size="lg"
                >
                  Continue to Shopify
                </Button>
              </form>
              <DialogFooter className="sm:justify-start">
                <p className="text-xs text-slate-500">
                  💡 <strong>Tip:</strong> Use your full shop domain, e.g.,{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5">
                    dev-yourshop.myshopify.com
                  </code>
                </p>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Custom Email Integration Section */}
          <section className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5" />

            <div className="relative p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                    <Mail className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Custom Email
                    </h2>
                    <p className="mt-2 max-w-2xl text-slate-600">
                      Forward your support inbox to a unique alias. We'll
                      automatically analyze messages, map them to orders, and
                      suggest AI-powered responses.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="bg-amber-100 text-amber-700">
                        <Zap className="mr-1 h-3 w-3" />
                        AI-powered
                      </Badge>
                      <Badge className="bg-orange-100 text-orange-700">
                        <Shield className="mr-1 h-3 w-3" />
                        Encrypted
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  onClick={() => {
                    const email = (session as any)?.user?.email;
                    if (!email) {
                      toast.warning('Please sign in first.');
                      return;
                    }
                    const firstShop = connections.find(
                      (c) => c.type === 'SHOPIFY',
                    )?.shopDomain;
                    if (!firstShop) {
                      toast.warning('Connect a Shopify store first.');
                      return;
                    }
                    createAlias.mutate({
                      userEmail: email,
                      domain:
                        (process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN as any) ||
                        'mail.example.com',
                      shop: firstShop,
                    });
                  }}
                  disabled={createAlias.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createAlias.isPending ? 'Creating…' : 'Create Alias'}
                </Button>
              </div>

              <div className="mt-8">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Active Aliases
                </h3>
                {connectionsLoading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <IntegrationCardSkeleton />
                    <IntegrationCardSkeleton />
                  </div>
                ) : emailConnections.length === 0 ? (
                  <Card className="border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <Mail className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-3 font-medium text-slate-900">
                      No email aliases created yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Create an alias to start receiving and analyzing emails
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {emailConnections.map((c) => (
                      <Card
                        key={c.id}
                        className={`group/card border p-6 transition-all hover:shadow-lg ${
                          (c as any)?.metadata?.disabled
                            ? 'border-slate-200 bg-slate-50 opacity-60'
                            : 'border-amber-200 bg-gradient-to-br from-white to-amber-50 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  (c as any)?.metadata?.disabled
                                    ? 'bg-slate-300'
                                    : 'bg-gradient-to-br from-amber-500 to-orange-500'
                                }`}
                              >
                                <Mail className="h-4 w-4 text-white" />
                              </div>
                              <Badge
                                variant="secondary"
                                className={
                                  (c as any)?.metadata?.disabled
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-emerald-100 text-emerald-700'
                                }
                              >
                                {(c as any)?.metadata?.disabled
                                  ? 'Disabled'
                                  : 'Active'}
                              </Badge>
                            </div>
                            <div className="mt-3 break-all font-mono text-sm font-semibold text-slate-900">
                              {(c as any)?.metadata?.alias ?? '(pending)'}
                            </div>
                            {(c as any)?.metadata?.shopDomain && (
                              <p className="mt-1 text-xs text-slate-500">
                                for {String((c as any).metadata.shopDomain)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(c as any)?.metadata?.alias && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    (c as any).metadata.alias,
                                  );
                                  toast.success('Alias copied to clipboard!');
                                } catch {
                                  toast.error('Copy failed');
                                }
                              }}
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rotateAlias.mutate({ id: c.id })}
                            disabled={rotateAlias.isPending}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            {rotateAlias.isPending ? '...' : 'Rotate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAliasStatus.mutate({
                                id: c.id,
                                disabled: !(c as any)?.metadata?.disabled,
                              })
                            }
                            disabled={setAliasStatus.isPending}
                          >
                            <Power className="mr-1 h-3 w-3" />
                            {setAliasStatus.isPending
                              ? 'Updating...'
                              : (c as any)?.metadata?.disabled
                                ? 'Enable'
                                : 'Disable'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Health & Setup Cards */}
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">
                        Email Health
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Last inbound delivery
                      </p>
                      <p className="mt-2 text-lg font-semibold text-violet-900">
                        {emailHealth.data?.lastInboundAt
                          ? new Date(
                              emailHealth.data.lastInboundAt as any,
                            ).toLocaleString()
                          : 'No deliveries yet'}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">
                        Quick Setup
                      </h4>
                      <ol className="mt-3 space-y-2 text-sm text-slate-700">
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-900">
                            1
                          </span>
                          <span>Create an email alias above</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-900">
                            2
                          </span>
                          <span>Configure Mailgun route to webhook</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-900">
                            3
                          </span>
                          <span>Forward your support inbox to alias</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-slate-600">Loading integrations...</p>
          </div>
        </main>
      }
    >
      <IntegrationsInner />
    </Suspense>
  );
}
