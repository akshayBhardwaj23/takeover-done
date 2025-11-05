'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Suspense, useEffect, useState, useRef, type ChangeEvent } from 'react';
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
  Sparkles,
  Clock,
  Link as LinkIcon,
  ArrowRight,
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
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
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

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 pt-20">
        <div className="mx-auto max-w-7xl space-y-8 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 shadow-lg">
                  <LinkIcon className="h-8 w-8 text-white" />
                </div>
                <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-5xl font-black text-transparent">
                  Integrations
                </h1>
              </div>
              <p className="text-lg text-slate-600">
                Connect your tools and automate your workflow with AI-powered
                intelligence
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-white shadow-lg">
              <Sparkles className="mr-2 h-4 w-4" />
              {shopifyConnections.length + emailConnections.length} Active
            </Badge>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {connectionsLoading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
                <Card className="group relative overflow-hidden border-none bg-gradient-to-br from-indigo-500 to-blue-600 p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-100">
                        Shopify Stores
                      </p>
                      <p className="mt-2 text-4xl font-black text-white">
                        {shopifyConnections.length}
                      </p>
                      <p className="mt-1 text-xs text-indigo-200">
                        Connected & syncing
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                      <ShoppingBag className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </Card>
                <Card className="group relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-100">
                        Email Aliases
                      </p>
                      <p className="mt-2 text-4xl font-black text-white">
                        {emailConnections.length}
                      </p>
                      <p className="mt-1 text-xs text-amber-200">
                        AI-powered routing
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                      <Mail className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </Card>
              </>
            )}
            <Card className="group relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-green-600 p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-100">
                    Active Status
                  </p>
                  <p className="mt-2 text-4xl font-black text-white">
                    {
                      emailConnections.filter((c) => !c.metadata?.disabled)
                        .length
                    }
                    <span className="text-2xl text-emerald-200">
                      /{emailConnections.length || '0'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-emerald-200">
                    Healthy connections
                  </p>
                </div>
                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                  <Activity className="h-8 w-8 text-white" />
                </div>
              </div>
            </Card>
          </div>

          <Dialog>
            {/* Shopify Integration Section */}
            <section className="group relative overflow-hidden rounded-3xl border-2 border-slate-200/50 bg-white shadow-2xl transition-all hover:border-emerald-300/50 hover:shadow-emerald-100/50">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10 transition-opacity group-hover:opacity-80" />
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl transition-all group-hover:bg-cyan-500/20" />

              <div className="relative p-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 opacity-30 blur-xl" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-2xl ring-4 ring-emerald-100">
                        <Store className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-slate-900">
                          Shopify
                        </h2>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
                          Popular
                        </Badge>
                      </div>
                      <p className="mt-3 text-base leading-relaxed text-slate-600">
                        Connect your Shopify store to sync orders in real-time,
                        manage inventory, and automate customer support
                        workflows with AI-powered intelligence.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                          Real-time sync
                        </Badge>
                        <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                          <Shield className="mr-1.5 h-3.5 w-3.5" />
                          Secure OAuth
                        </Badge>
                        <Badge className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
                          <Activity className="mr-1.5 h-3.5 w-3.5" />
                          Auto webhooks
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="group/btn bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-6 text-base font-semibold shadow-lg transition-all hover:scale-105 hover:from-emerald-700 hover:to-cyan-700 hover:shadow-xl"
                    >
                      <Plus className="mr-2 h-5 w-5 transition-transform group-hover/btn:rotate-90" />
                      Connect Store
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </DialogTrigger>
                </div>

                <div className="mt-10">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      Connected Stores
                    </h3>
                    <Badge className="bg-slate-100 text-slate-700">
                      {shopifyConnections.length} Total
                    </Badge>
                  </div>
                  {connectionsLoading ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <IntegrationCardSkeleton />
                      <IntegrationCardSkeleton />
                    </div>
                  ) : shopifyConnections.length === 0 ? (
                    <Card className="group border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 p-12 text-center transition-all hover:border-emerald-400 hover:bg-slate-50">
                      <div className="mx-auto w-fit rounded-full bg-slate-200 p-6">
                        <Store className="h-12 w-12 text-slate-400" />
                      </div>
                      <p className="mt-5 text-lg font-semibold text-slate-900">
                        No stores connected yet
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Get started by connecting your first Shopify store above
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {shopifyConnections.map((c) => (
                        <Card
                          key={c.id}
                          className="group/card relative overflow-hidden border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 transition-all hover:scale-[1.02] hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-100/50"
                        >
                          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl transition-all group-hover/card:bg-emerald-500/10" />
                          <div className="relative">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg">
                                    <Store className="h-5 w-5 text-white" />
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Active
                                  </Badge>
                                </div>
                                <h4 className="mt-4 text-lg font-bold text-slate-900">
                                  {c.shopDomain ?? '(unknown)'}
                                </h4>
                                {c.createdAt && (
                                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    Connected{' '}
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              className="mt-6 w-full bg-gradient-to-r from-emerald-600 to-cyan-600 font-semibold shadow-md transition-all hover:from-emerald-700 hover:to-cyan-700 hover:shadow-lg group-hover/card:scale-105"
                              asChild
                            >
                              <a
                                href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                              >
                                Open Inbox
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/card:translate-x-1" />
                              </a>
                            </Button>
                          </div>
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
          <section className="group relative overflow-hidden rounded-3xl border-2 border-slate-200/50 bg-white shadow-2xl transition-all hover:border-amber-300/50 hover:shadow-amber-100/50">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 transition-opacity group-hover:opacity-80" />
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl transition-all group-hover:bg-amber-500/20" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl transition-all group-hover:bg-orange-500/20" />

            <div className="relative p-10">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-br from-amber-400 to-orange-400 opacity-30 blur-xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-2xl ring-4 ring-amber-100">
                      <Mail className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-slate-900">
                        Custom Email
                      </h2>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        AI-Powered
                      </Badge>
                    </div>
                    <p className="mt-3 text-base leading-relaxed text-slate-600">
                      Forward your support inbox to a unique alias. We'll
                      automatically analyze messages, map them to orders, and
                      suggest AI-powered responses in real-time.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        AI-powered
                      </Badge>
                      <Badge className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100">
                        <Shield className="mr-1.5 h-3.5 w-3.5" />
                        Encrypted
                      </Badge>
                      <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                        <Activity className="mr-1.5 h-3.5 w-3.5" />
                        Auto-mapping
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="group/btn bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-6 text-base font-semibold shadow-lg transition-all hover:scale-105 hover:from-amber-700 hover:to-orange-700 hover:shadow-xl"
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
                  <Plus className="mr-2 h-5 w-5 transition-transform group-hover/btn:rotate-90" />
                  {createAlias.isPending ? 'Creating…' : 'Create Alias'}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </div>

              <div className="mt-10">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Active Aliases
                  </h3>
                  <Badge className="bg-slate-100 text-slate-700">
                    {emailConnections.length} Total
                  </Badge>
                </div>
                {connectionsLoading ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <IntegrationCardSkeleton />
                    <IntegrationCardSkeleton />
                  </div>
                ) : emailConnections.length === 0 ? (
                  <Card className="group border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 p-12 text-center transition-all hover:border-amber-400 hover:bg-slate-50">
                    <div className="mx-auto w-fit rounded-full bg-slate-200 p-6">
                      <Mail className="h-12 w-12 text-slate-400" />
                    </div>
                    <p className="mt-5 text-lg font-semibold text-slate-900">
                      No email aliases created yet
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Create an alias above to start receiving and analyzing
                      emails
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {emailConnections.map((c) => (
                      <Card
                        key={c.id}
                        className={`group/card relative overflow-hidden border-2 p-6 transition-all ${
                          (c as any)?.metadata?.disabled
                            ? 'border-slate-300 bg-slate-100/50 opacity-70'
                            : 'border-amber-200 bg-gradient-to-br from-white to-amber-50/50 hover:scale-[1.02] hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-100/50'
                        }`}
                      >
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl transition-all group-hover/card:bg-amber-500/10" />
                        <div className="relative">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ${
                                    (c as any)?.metadata?.disabled
                                      ? 'bg-slate-400'
                                      : 'bg-gradient-to-br from-amber-500 to-orange-500'
                                  }`}
                                >
                                  <Mail className="h-5 w-5 text-white" />
                                </div>
                                <Badge
                                  className={
                                    (c as any)?.metadata?.disabled
                                      ? 'bg-slate-200 text-slate-600'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }
                                >
                                  {(c as any)?.metadata?.disabled ? (
                                    <>
                                      <AlertCircle className="mr-1 h-3 w-3" />
                                      Disabled
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="mr-1 h-3 w-3" />
                                      Active
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <div className="mt-4 break-all rounded-lg bg-slate-100 p-3 font-mono text-sm font-semibold text-slate-900">
                                {(c as any)?.metadata?.alias ?? '(pending)'}
                              </div>
                              {(c as any)?.metadata?.shopDomain && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                  <Store className="h-3.5 w-3.5" />
                                  {String((c as any).metadata.shopDomain)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(c as any)?.metadata?.alias && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 hover:bg-amber-50 hover:text-amber-700"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      (c as any).metadata.alias,
                                    );
                                    toast.success('Alias copied!');
                                  } catch {
                                    toast.error('Copy failed');
                                  }
                                }}
                              >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                Copy
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => rotateAlias.mutate({ id: c.id })}
                              disabled={rotateAlias.isPending}
                            >
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              {rotateAlias.isPending ? '...' : 'Rotate'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() =>
                                setAliasStatus.mutate({
                                  id: c.id,
                                  disabled: !(c as any)?.metadata?.disabled,
                                })
                              }
                              disabled={setAliasStatus.isPending}
                            >
                              <Power className="mr-1.5 h-3.5 w-3.5" />
                              {setAliasStatus.isPending
                                ? 'Updating...'
                                : (c as any)?.metadata?.disabled
                                  ? 'Enable'
                                  : 'Disable'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Health & Setup Cards */}
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="group relative overflow-hidden border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-7 transition-all hover:scale-[1.02] hover:border-violet-300 hover:shadow-lg">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900">
                        Email Health
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Last inbound delivery
                      </p>
                      <p className="mt-3 text-lg font-bold text-violet-900">
                        {emailHealth.data?.lastInboundAt
                          ? new Date(
                              emailHealth.data.lastInboundAt as any,
                            ).toLocaleString()
                          : 'No deliveries yet'}
              </p>
            </div>
          </div>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-7 transition-all hover:scale-[1.02] hover:border-blue-300 hover:shadow-lg">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900">
                        Quick Setup
                      </h4>
                      <ol className="mt-4 space-y-3 text-sm text-slate-700">
                        <li className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
                            1
                          </span>
                          <span className="pt-0.5">
                            Create an email alias above
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
                            2
                          </span>
                          <span className="pt-0.5">
                            Configure Mailgun route to webhook
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
                            3
                          </span>
                          <span className="pt-0.5">
                            Forward your support inbox to alias
                          </span>
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
