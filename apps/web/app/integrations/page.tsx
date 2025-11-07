'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Suspense, useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import AISuggestionBox from '../components/AISuggestionBox';
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
  Plus,
  Sparkles,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';
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
  const router = useRouter();
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

  const mockSales = [10, 12, 9, 13, 11, 14, 12];
  const mockAcquisition = [90, 120, 150, 130, 150, 110];
  const mockTopProducts = [157, 150, 129, 119, 111, 72];
  const navItems = [
    { label: 'Dashboard', description: 'Overview', icon: '📊' },
    { label: 'Shopify', description: 'Stores', icon: '🛍️' },
    { label: 'Email', description: 'Aliases', icon: '✉️' },
    { label: 'Settings', description: 'Controls', icon: '⚙️' },
  ];

  // Track if we've already shown notifications to prevent duplicates
  const notificationShownRef = useRef(false);

  useEffect(() => {
    // Only show notifications once per page load
    if (notificationShownRef.current) return;

    const already = sp.get('already');
    const connected = sp.get('connected');
    const shopParam = sp.get('shop');

    if (!shopParam) return;

    // Mark as shown immediately to prevent duplicates
    notificationShownRef.current = true;

    if (already === '1') {
      toast.success(`Store already connected: ${shopParam}`);
    } else if (connected === '1') {
      toast.success(`Store connected successfully: ${shopParam}`);
    }

    // Clean up URL params after showing notification to prevent re-triggering
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('already');
    newUrl.searchParams.delete('connected');
    newUrl.searchParams.delete('shop');
    router.replace(`${newUrl.pathname}${newUrl.search}` as any, {
      scroll: false,
    });
  }, [sp, router, toast]); // Only re-run if search params actually change

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
  const activeAliases = emailConnections.filter(
    (c) => !c.metadata?.disabled,
  ).length;

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-slate-100 py-24">
        <div className="mx-auto max-w-6xl space-y-10 px-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <LinkIcon className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">
                  Integrations
                </h1>
                <p className="text-sm text-slate-500">
                  Monitor connections, track health, and configure automations
                  for Zyyp.
                </p>
              </div>
            </div>
            <Badge className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              {shopifyConnections.length + emailConnections.length} Active
            </Badge>
          </header>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex flex-col md:flex-row">
              <aside className="flex flex-row items-center gap-4 border-b border-slate-200 p-6 md:w-60 md:flex-col md:items-stretch md:border-b-0 md:border-r">
                {navItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="hidden text-xs text-slate-400 md:block">
                      {item.description}
                    </span>
                  </div>
                ))}
              </aside>
              <div className="flex-1 space-y-10 p-8">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Shopify Stores
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">
                      {connectionsLoading ? '—' : shopifyConnections.length}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Connected & syncing
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email Aliases
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">
                      {connectionsLoading ? '—' : emailConnections.length}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      AI routing enabled
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Active Aliases
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">
                      {connectionsLoading ? '—' : activeAliases}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {emailConnections.length || 0} total
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last Inbound
                    </p>
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      {emailHealth.data?.lastInboundAt
                        ? new Date(
                            emailHealth.data.lastInboundAt as any,
                          ).toLocaleString()
                        : 'No deliveries yet'}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Email health</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Sales Trends
                      </h3>
                      <span className="text-xs text-slate-400">
                        Last 7 weeks
                      </span>
                    </div>
                    <div className="mt-6 flex items-end justify-between gap-2">
                      {mockSales.map((value, index) => (
                        <div
                          key={index}
                          className="flex w-full flex-col items-center gap-2"
                        >
                          <div className="flex h-32 w-8 items-end overflow-hidden rounded-full bg-white shadow-inner">
                            <span
                              className="w-full rounded-full bg-slate-900/80"
                              style={{ height: `${value * 6}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            0{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">
                        User Acquisition
                      </h3>
                      <span className="text-xs text-slate-400">Channels</span>
                    </div>
                    <div className="mt-6 grid gap-3">
                      {mockAcquisition.map((value, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>
                              {
                                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][
                                  index
                                ]
                              }
                            </span>
                            <span>{value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full bg-slate-900/80"
                              style={{ width: `${Math.min(value, 160)}px` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Top Products
                  </h3>
                  <div className="mt-6 flex flex-col gap-4 md:flex-row">
                    <div className="flex flex-1 items-center justify-center">
                      <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
                        <span className="text-lg font-semibold text-slate-700">
                          Insights
                        </span>
                      </div>
                    </div>
                    <ul className="flex-1 space-y-3">
                      {mockTopProducts.map((value, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"
                        >
                          <span>Product #{index + 1}</span>
                          <span className="font-semibold text-slate-900">
                            {value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <AISuggestionBox
                  shop={shopifyConnections[0]?.shopDomain || undefined}
                />

                <Dialog>
                  <section id="shopify" className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Shopify
                        </h2>
                        <p className="text-sm text-slate-500">
                          Connect stores to sync orders and automate support.
                        </p>
                      </div>
                      <DialogTrigger asChild>
                        <Button
                          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                          size="sm"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Connect Store
                        </Button>
                      </DialogTrigger>
                    </div>
                    <div className="rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Connected Stores</span>
                        <span>{shopifyConnections.length} total</span>
                      </div>
                      {connectionsLoading ? (
                        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                          <StatsCardSkeleton />
                          <StatsCardSkeleton />
                        </div>
                      ) : shopifyConnections.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-500">
                          <Store className="h-10 w-10 text-slate-300" />
                          <p className="font-semibold text-slate-700">
                            No stores connected yet
                          </p>
                          <p>Connect your first store to unlock analytics.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {shopifyConnections.map((c) => (
                            <div
                              key={c.id}
                              className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {c.shopDomain ?? '(unknown)'}
                                </p>
                                {c.createdAt && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Connected{' '}
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                                <Button
                                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                                  asChild
                                >
                                  <a
                                    href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                                  >
                                    Open Inbox
                                    <ArrowRight className="ml-2 h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                          <Store className="h-5 w-5" />
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
                        className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-black"
                      >
                        Continue to Shopify
                      </Button>
                    </form>
                    <DialogFooter className="sm:justify-start">
                      <p className="text-xs text-slate-500">
                        💡 <strong>Tip:</strong> Use your full shop domain,
                        e.g.,{' '}
                        <code className="rounded bg-slate-100 px-1 py-0.5">
                          dev-yourshop.myshopify.com
                        </code>
                      </p>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <section id="email" className="space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Custom Email
                      </h2>
                      <p className="text-sm text-slate-500">
                        Spin up aliases to route customer support through Zyyp.
                      </p>
                    </div>
                    <Button
                      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                      size="sm"
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
                            (process.env
                              .NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN as any) ||
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
                  <div className="rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>Active Aliases</span>
                      <span>{emailConnections.length} total</span>
                    </div>
                    {connectionsLoading ? (
                      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                      </div>
                    ) : emailConnections.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-500">
                        <Mail className="h-10 w-10 text-slate-300" />
                        <p className="font-semibold text-slate-700">
                          No email aliases created yet
                        </p>
                        <p>
                          Generate your first alias to start routing tickets.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {emailConnections.map((c) => {
                          const disabled = (c as any)?.metadata?.disabled;
                          const alias = (c as any)?.metadata?.alias;
                          const shopDomain = (c as any)?.metadata?.shopDomain;
                          return (
                            <div key={c.id} className="space-y-4 px-6 py-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                  <p className="font-mono text-sm font-semibold text-slate-800">
                                    {alias ?? '(pending)'}
                                  </p>
                                  {shopDomain && (
                                    <p className="text-xs text-slate-400">
                                      {String(shopDomain)}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    disabled
                                      ? 'bg-slate-200 text-slate-600'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {disabled ? 'Disabled' : 'Active'}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {alias && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-100"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(
                                          alias,
                                        );
                                        toast.success('Alias copied!');
                                      } catch {
                                        toast.error('Copy failed');
                                      }
                                    }}
                                  >
                                    <Copy className="mr-1.5 h-3 w-3" /> Copy
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-100"
                                  onClick={() =>
                                    rotateAlias.mutate({ id: c.id })
                                  }
                                  disabled={rotateAlias.isPending}
                                >
                                  <RefreshCw className="mr-1.5 h-3 w-3" />
                                  {rotateAlias.isPending
                                    ? 'Rotating…'
                                    : 'Rotate'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-100"
                                  onClick={() =>
                                    setAliasStatus.mutate({
                                      id: c.id,
                                      disabled: !disabled,
                                    })
                                  }
                                  disabled={setAliasStatus.isPending}
                                >
                                  <Power className="mr-1.5 h-3 w-3" />
                                  {setAliasStatus.isPending
                                    ? 'Updating…'
                                    : disabled
                                      ? 'Enable'
                                      : 'Disable'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Email Health
                      </h3>
                      <p className="mt-2 text-xs text-slate-400">
                        Last inbound delivery
                      </p>
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        {emailHealth.data?.lastInboundAt
                          ? new Date(
                              emailHealth.data.lastInboundAt as any,
                            ).toLocaleString()
                          : 'No deliveries yet'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Quick Setup
                      </h3>
                      <ol className="mt-4 space-y-2 text-xs text-slate-500">
                        <li>1. Create an alias above.</li>
                        <li>2. Route your email provider to the webhook.</li>
                        <li>3. Forward support inbox to alias.</li>
                      </ol>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
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
