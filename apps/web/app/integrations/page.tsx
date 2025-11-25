'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import {
  Suspense,
  useEffect,
  useState,
  useRef,
  useMemo,
  type ChangeEvent,
} from 'react';
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
  Plus,
  Sparkles,
  Link as LinkIcon,
  ArrowRight,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';
import { useToast, ToastContainer } from '../../components/Toast';

type ConnectionSummary = {
  id: string;
  type: string;
  shopDomain: string | null;
  createdAt?: string;
  metadata?: any;
};

function deriveStoreName(connection: ConnectionSummary): string {
  const metadataName =
    typeof connection.metadata?.storeName === 'string'
      ? connection.metadata.storeName.trim()
      : '';
  if (metadataName) return metadataName;
  const domain = connection.shopDomain ?? '';
  if (!domain) return 'Store';
  const withoutSuffix = domain.replace(/\.myshopify\.com$/i, '');
  const cleaned = withoutSuffix.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) return domain || 'Store';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function IntegrationsInner() {
  const toast = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const connected = sp.get('connected');
  const shop = sp.get('shop');
  const { data, isLoading: connectionsLoading } = trpc.connections.useQuery(
    undefined,
    {
      staleTime: 120_000, // Cache for 2 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists
      refetchOnReconnect: false,
    },
  );
  const emailHealth = trpc.emailHealth.useQuery(undefined, {
    staleTime: 120_000, // Cache for 2 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnReconnect: false,
  });
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
  const updateStoreName = trpc.updateStoreName.useMutation({
    onSuccess: () => utils.connections.invalidate(),
  });
  const disconnectStore = trpc.disconnectStore.useMutation({
    onSuccess: (data) => {
      utils.connections.invalidate();
      setDisconnectDialogOpen(null);
      toast.success(`Store ${data.shopDomain} disconnected successfully`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect store');
    },
  });
  const disconnectGA = trpc.disconnectGoogleAnalytics.useMutation({
    onSuccess: () => {
      utils.connections.invalidate();
      setDisconnectGADialogOpen(false);
      toast.success('Google Analytics disconnected successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect Google Analytics');
    },
  });
  const disconnectMetaAds = trpc.disconnectMetaAds.useMutation({
    onSuccess: () => {
      utils.connections.invalidate();
      setDisconnectMetaAdsDialogOpen(false);
      toast.success('Meta Ads disconnected successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect Meta Ads');
    },
  });
  const [shopInput, setShopInput] = useState('');
  const [storeNameInput, setStoreNameInput] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [connectionTab, setConnectionTab] = useState<'webhook' | 'custom_app'>('webhook');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeNameDraft, setStoreNameDraft] = useState('');
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState<
    string | null
  >(null);
  const [disconnectGADialogOpen, setDisconnectGADialogOpen] =
    useState<boolean>(false);
  const [disconnectMetaAdsDialogOpen, setDisconnectMetaAdsDialogOpen] =
    useState<boolean>(false);
  const [isConnectingShopify, setIsConnectingShopify] = useState(false);
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  
  const createWebhookConnection = trpc.createWebhookConnection.useMutation({
    onSuccess: (data) => {
      setWebhookUrl(data.webhookUrl);
      utils.connections.invalidate();
      setIsConnectingShopify(false);
      toast.success(`Webhook connection created for ${data.shopDomain}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create webhook connection');
      setIsConnectingShopify(false);
    },
  });
  
  const createCustomAppConnection = trpc.createCustomAppConnection.useMutation({
    onSuccess: (data) => {
      utils.connections.invalidate();
      setShowShopifyDialog(false);
      setShopInput('');
      setSubdomainInput('');
      setAccessTokenInput('');
      setStoreNameInput('');
      setIsConnectingShopify(false);
      toast.success(`Store connected successfully: ${data.shopDomain}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to connect store');
      setIsConnectingShopify(false);
    },
  });
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
    const gaConnected = sp.get('ga_connected');
    const gaError = sp.get('ga_error');
    const gaProperty = sp.get('property');
    const metaAdsConnected = sp.get('meta_ads_connected');
    const metaAdsError = sp.get('meta_ads_error');
    const metaAdsAccount = sp.get('account');

    // Mark as shown immediately to prevent duplicates
    notificationShownRef.current = true;

    if (shopParam) {
      if (already === '1') {
        toast.success(`Store already connected: ${shopParam}`);
      } else if (connected === '1') {
        toast.success(`Store connected successfully: ${shopParam}`);
      }
    }

    if (gaConnected === '1') {
      toast.success(
        gaProperty
          ? `Google Analytics connected: ${gaProperty}`
          : 'Google Analytics connected successfully',
      );
    }

    if (gaError) {
      // Don't show error details to users - they're logged in console/Sentry
      if (gaError === 'connection_failed') {
        toast.error('Failed to connect Google Analytics. Please try again.');
      } else {
        toast.error('Google Analytics connection error. Please try again.');
      }
    }

    if (metaAdsConnected === '1') {
      toast.success(
        metaAdsAccount
          ? `Meta Ads connected: ${metaAdsAccount}`
          : 'Meta Ads connected successfully',
      );
    }

    if (metaAdsError) {
      // Don't show error details to users - they're logged in console/Sentry
      if (metaAdsError === 'connection_failed') {
        toast.error('Failed to connect Meta Ads. Please try again.');
      } else {
        toast.error('Meta Ads connection error. Please try again.');
      }
    }

    // Handle warning (database unavailable but OAuth succeeded)
    const gaWarning = sp.get('ga_warning');
    if (gaWarning === 'database_unavailable') {
      // Don't show warning to user - OAuth worked, just log it
      console.warn(
        '[Integrations] Google Analytics OAuth succeeded but database unavailable',
      );
    }

    // Clean up URL params after showing notification to prevent re-triggering
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('already');
    newUrl.searchParams.delete('connected');
    newUrl.searchParams.delete('shop');
    newUrl.searchParams.delete('ga_connected');
    newUrl.searchParams.delete('ga_error');
    newUrl.searchParams.delete('property');
    newUrl.searchParams.delete('error_details');
    newUrl.searchParams.delete('ga_warning');
    newUrl.searchParams.delete('meta_ads_connected');
    newUrl.searchParams.delete('meta_ads_error');
    newUrl.searchParams.delete('account');
    newUrl.searchParams.delete('meta_ads_warning');
    router.replace(`${newUrl.pathname}${newUrl.search}` as any, {
      scroll: false,
    });
  }, [sp, router, toast]); // Only re-run if search params actually change

  function onSubmitWebhook(e: React.FormEvent<HTMLFormElement>) {
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
    setIsConnectingShopify(true);
    createWebhookConnection.mutate({
      shopDomain: domain,
      storeName: storeNameInput.trim() || undefined,
    });
  }
  
  function onSubmitCustomApp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const domain = shopInput.trim().toLowerCase();
    const subdomain = subdomainInput.trim().toLowerCase();
    const accessToken = accessTokenInput.trim();
    
    if (!domain || !subdomain || !accessToken) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    const exists = connections.some(
      (c) => (c.shopDomain ?? '').toLowerCase() === domain,
    );
    if (exists) {
      toast.error('This store is already connected.');
      return;
    }
    
    setIsConnectingShopify(true);
    createCustomAppConnection.mutate({
      shopDomain: domain,
      subdomain,
      accessToken,
      storeName: storeNameInput.trim() || undefined,
    });
  }
  
  function copyWebhookUrl() {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success('Webhook URL copied to clipboard!');
    }
  }

  // Memoize filtered connections to prevent unnecessary recalculations
  const shopifyConnections = useMemo(
    () => connections.filter((c) => c.type === 'SHOPIFY'),
    [connections],
  );
  const emailConnections = useMemo(
    () => connections.filter((c) => c.type === 'CUSTOM_EMAIL'),
    [connections],
  );
  const gaConnections = useMemo(
    () => connections.filter((c) => c.type === 'GOOGLE_ANALYTICS'),
    [connections],
  );
  const metaAdsConnections = useMemo(
    () => connections.filter((c) => c.type === 'META_ADS'),
    [connections],
  );
  const activeAliases = useMemo(
    () => emailConnections.filter((c) => !c.metadata?.disabled).length,
    [emailConnections],
  );
  const isSavingStoreName = updateStoreName.isPending;

  const beginEditStore = (connection: ConnectionSummary) => {
    setEditingStoreId(connection.id);
    setStoreNameDraft(deriveStoreName(connection));
  };

  const cancelEditStore = () => {
    setEditingStoreId(null);
    setStoreNameDraft('');
  };

  const handleStoreNameSave = async () => {
    if (!editingStoreId) return;
    const trimmedName = storeNameDraft.trim();
    if (!trimmedName) {
      toast.warning('Store name cannot be empty.');
      return;
    }
    try {
      await updateStoreName.mutateAsync({
        connectionId: editingStoreId,
        storeName: trimmedName,
      });
      toast.success('Store name updated.');
      cancelEditStore();
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to update store name');
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-slate-100 py-28 lg:py-32">
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
              {shopifyConnections.length +
                emailConnections.length +
                gaConnections.length +
                metaAdsConnections.length}{' '}
              Active
            </Badge>
          </header>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="space-y-10 p-8">
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

              <section id="shopify" className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Shopify
                    </h2>
                    <p className="text-sm text-slate-500">
                      Connect your Shopify store to sync orders and automate support.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Choose webhook method to receive orders, or custom app for full API access.
                    </p>
                  </div>
                  <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
                    <DialogTrigger asChild>
                      <Button
                        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                        size="sm"
                        onClick={() => {
                          setShowShopifyDialog(true);
                          setConnectionTab('webhook');
                          setWebhookUrl(null);
                          setShopInput('');
                          setStoreNameInput('');
                          setSubdomainInput('');
                          setAccessTokenInput('');
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Connect Store
                      </Button>
                    </DialogTrigger>
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
                      <div className="flex flex-col items-center gap-4 p-10 text-center">
                        <Store className="h-10 w-10 text-slate-300" />
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-700">
                            No stores connected yet
                          </p>
                          <p className="text-sm text-slate-500">
                            Click "Connect Store" above to get started.
                          </p>
                          <p className="text-xs text-slate-400">
                            Choose webhook method for receiving orders, or custom app for full API access.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {shopifyConnections.map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="flex-1">
                              {editingStoreId === c.id ? (
                                <form
                                  className="flex flex-col gap-3"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    handleStoreNameSave();
                                  }}
                                >
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Store Name
                                    </label>
                                    <Input
                                      value={storeNameDraft}
                                      onChange={(event) =>
                                        setStoreNameDraft(event.target.value)
                                      }
                                      placeholder="Enter store name"
                                      autoFocus
                                      disabled={isSavingStoreName}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="submit"
                                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                                      disabled={isSavingStoreName}
                                    >
                                      {isSavingStoreName ? 'Saving…' : 'Save'}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="rounded-full border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                      onClick={cancelEditStore}
                                      disabled={isSavingStoreName}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {deriveStoreName(c)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {c.shopDomain ?? '(unknown)'}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {c.metadata?.connectionMethod === 'webhook' && (
                                      <Badge className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                        Webhook Only
                                      </Badge>
                                    )}
                                    {c.metadata?.connectionMethod === 'custom_app' && (
                                      <Badge className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                                        Full API Access
                                      </Badge>
                                    )}
                                    {c.createdAt && (
                                      <span className="text-xs text-slate-400">
                                        Connected{' '}
                                        {new Date(
                                          c.createdAt,
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 md:justify-end">
                              <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                              {editingStoreId !== c.id && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-full border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    onClick={() => beginEditStore(c)}
                                  >
                                    Edit Name
                                  </Button>
                                  <Dialog
                                    open={disconnectDialogOpen === c.id}
                                    onOpenChange={(open) =>
                                      setDisconnectDialogOpen(
                                        open ? c.id : null,
                                      )
                                    }
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                        disabled={disconnectStore.isPending}
                                      >
                                        <Trash2 className="mr-1.5 h-3 w-3" />
                                        Disconnect
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent containerClassName="max-w-md sm:rounded-3xl">
                                      <DialogHeader>
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                            <Trash2 className="h-5 w-5" />
                                          </div>
                                          <DialogTitle className="text-xl">
                                            Disconnect Store
                                          </DialogTitle>
                                        </div>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <p className="text-sm text-slate-600">
                                          Are you sure you want to disconnect{' '}
                                          <span className="font-semibold text-slate-900">
                                            {deriveStoreName(c)}
                                          </span>
                                          ? This will remove the store from your
                                          dashboard and stop syncing new orders.
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          You can reconnect this store at any
                                          time from the integrations page.
                                        </p>
                                      </div>
                                      <DialogFooter className="sm:justify-end">
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-full border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                            onClick={() =>
                                              setDisconnectDialogOpen(null)
                                            }
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            type="button"
                                            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                            onClick={() => {
                                              disconnectStore.mutate({
                                                connectionId: c.id,
                                              });
                                            }}
                                            disabled={disconnectStore.isPending}
                                          >
                                            {disconnectStore.isPending
                                              ? 'Disconnecting...'
                                              : 'Disconnect Store'}
                                          </Button>
                                        </div>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}
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

              <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
                <DialogContent containerClassName="max-w-2xl sm:rounded-3xl">
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
                  
                  {/* Connection Method Tabs */}
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setConnectionTab('webhook');
                        setWebhookUrl(null);
                      }}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        connectionTab === 'webhook'
                          ? 'border-b-2 border-slate-900 text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Webhook (Receive Data)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionTab('custom_app')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        connectionTab === 'custom_app'
                          ? 'border-b-2 border-slate-900 text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Custom App (Full Access)
                    </button>
                  </div>
                  
                  {/* Method Description */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {connectionTab === 'webhook' ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Webhook Method
                        </p>
                        <p className="text-xs text-slate-600">
                          Receive order data automatically from Shopify. You'll add a webhook URL in your Shopify admin. 
                          <strong className="text-slate-900"> Best for: Receiving orders and customer data.</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Custom App Method
                        </p>
                        <p className="text-xs text-slate-600">
                          Full API access to create/update orders, fulfillments, and refunds. Requires creating a custom app in Shopify admin.
                          <strong className="text-slate-900"> Best for: Full automation and order management.</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Webhook Connection Form */}
                  {connectionTab === 'webhook' && (
                    <div className="space-y-4 pt-4">
                      {!webhookUrl ? (
                        <form onSubmit={onSubmitWebhook} className="space-y-4">
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
                            <p className="mt-1 text-xs text-slate-500">
                              Enter your full Shopify store domain
                            </p>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Store Name (Optional)
                            </label>
                            <Input
                              type="text"
                              name="storeName"
                              placeholder="My Store"
                              value={storeNameInput}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setStoreNameInput((e as any).target.value)
                              }
                              className="h-11"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                            disabled={isConnectingShopify}
                          >
                            {isConnectingShopify ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                Generate Webhook URL
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-2 text-sm font-medium text-slate-700">
                              Your Webhook URL
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={webhookUrl}
                                readOnly
                                className="h-10 font-mono text-xs"
                              />
                              <Button
                                type="button"
                                onClick={copyWebhookUrl}
                                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                              </Button>
                            </div>
                          </div>
                          
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <p className="mb-3 text-sm font-semibold text-blue-900">
                              Setup Instructions
                            </p>
                            <ol className="space-y-2 text-xs text-blue-800">
                              <li className="flex gap-2">
                                <span className="font-semibold">1.</span>
                                <span>Log in to your Shopify admin panel</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold">2.</span>
                                <span>Navigate to Settings → Notifications</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold">3.</span>
                                <span>In the Webhooks section, click "Create webhook"</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold">4.</span>
                                <span>Select "orders/create" as the event type</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold">5.</span>
                                <span>Choose JSON format</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold">6.</span>
                                <span>Paste the webhook URL above into the URL field</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold">7.</span>
                                <span>Select the latest API version and click "Save webhook"</span>
                              </li>
                            </ol>
                          </div>
                          
                          <Button
                            type="button"
                            onClick={() => {
                              setWebhookUrl(null);
                              setShopInput('');
                              setStoreNameInput('');
                            }}
                            className="w-full rounded-full border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Create Another Connection
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom App Connection Form */}
                  {connectionTab === 'custom_app' && (
                    <form onSubmit={onSubmitCustomApp} className="space-y-4 pt-4">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs text-blue-800">
                          <strong>How to get your credentials:</strong>
                        </p>
                        <ol className="mt-2 space-y-1 text-xs text-blue-700">
                          <li>1. Go to your Shopify admin → Settings → Apps and sales channels</li>
                          <li>2. Click "Develop apps" → "Create an app"</li>
                          <li>3. Configure Admin API access scopes (read_orders, write_orders, etc.)</li>
                          <li>4. Install the app and copy the Admin API access token</li>
                        </ol>
                        <p className="mt-2 text-xs text-blue-600">
                          <a 
                            href="https://help.shopify.com/en/manual/apps/app-types/custom-apps" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-800"
                          >
                            Learn more about custom apps →
                          </a>
                        </p>
                      </div>
                      
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
                      
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Subdomain
                        </label>
                        <Input
                          type="text"
                          name="subdomain"
                          placeholder="your-shop"
                          required
                          value={subdomainInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSubdomainInput((e as any).target.value)
                          }
                          className="h-11"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          If your store URL is "https://demo.myshopify.com", enter "demo" (without .myshopify.com)
                        </p>
                      </div>
                      
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Access Token
                        </label>
                        <Input
                          type="password"
                          name="accessToken"
                          placeholder="shpat_xxxxxxxxxxxxx"
                          required
                          value={accessTokenInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setAccessTokenInput((e as any).target.value)
                          }
                          className="h-11 font-mono"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Found in: Your custom app → API credentials → Admin API access token (starts with "shpat_")
                        </p>
                      </div>
                      
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Store Name (Optional)
                        </label>
                        <Input
                          type="text"
                          name="storeName"
                          placeholder="My Store"
                          value={storeNameInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setStoreNameInput((e as any).target.value)
                          }
                          className="h-11"
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                        disabled={isConnectingShopify}
                      >
                        {isConnectingShopify ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            Connect Store
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
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
                      <p>Generate your first alias to start routing tickets.</p>
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
                                onClick={() => rotateAlias.mutate({ id: c.id })}
                                disabled={rotateAlias.isPending}
                              >
                                <RefreshCw className="mr-1.5 h-3 w-3" />
                                {rotateAlias.isPending ? 'Rotating…' : 'Rotate'}
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

              <section id="google-analytics" className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Google Analytics
                    </h2>
                    <p className="text-sm text-slate-500">
                      Connect your GA4 property to view website analytics and
                      insights.
                    </p>
                  </div>
                  {gaConnections.length === 0 && (
                    <Button
                      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                      size="sm"
                      onClick={() => {
                        window.location.href = '/api/google-analytics/install';
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Connect Google Analytics
                    </Button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Connected Properties</span>
                    <span>{gaConnections.length} total</span>
                  </div>
                  {connectionsLoading ? (
                    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                      <StatsCardSkeleton />
                      <StatsCardSkeleton />
                    </div>
                  ) : gaConnections.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-500">
                      <BarChart3 className="h-10 w-10 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        No Google Analytics connected yet
                      </p>
                      <p>
                        Connect your GA4 property to unlock website analytics.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {gaConnections.map((c) => {
                        const metadata =
                          (c.metadata as Record<string, unknown>) || {};
                        const propertyName =
                          (metadata.propertyName as string) || 'GA4 Property';
                        const propertyId =
                          (metadata.propertyId as string) || '';
                        return (
                          <div
                            key={c.id}
                            className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800">
                                {propertyName}
                              </p>
                              {propertyId && (
                                <p className="text-xs text-slate-500">
                                  Property ID: {propertyId}
                                </p>
                              )}
                              {c.createdAt && (
                                <p className="mt-1 text-xs text-slate-400">
                                  Connected{' '}
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 md:justify-end">
                              <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                              <Dialog
                                open={disconnectGADialogOpen}
                                onOpenChange={setDisconnectGADialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-full border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    disabled={disconnectGA.isPending}
                                  >
                                    <Trash2 className="mr-1.5 h-3 w-3" />
                                    Disconnect
                                  </Button>
                                </DialogTrigger>
                                <DialogContent containerClassName="max-w-md sm:rounded-3xl">
                                  <DialogHeader>
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                        <Trash2 className="h-5 w-5" />
                                      </div>
                                      <DialogTitle className="text-xl">
                                        Disconnect Google Analytics
                                      </DialogTitle>
                                    </div>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p className="text-sm text-slate-600">
                                      Are you sure you want to disconnect{' '}
                                      <span className="font-semibold text-slate-900">
                                        {propertyName}
                                      </span>
                                      ? This will remove the connection and stop
                                      syncing analytics data.
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      You can reconnect at any time from the
                                      integrations page.
                                    </p>
                                  </div>
                                  <DialogFooter className="sm:justify-end">
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                        onClick={() =>
                                          setDisconnectGADialogOpen(false)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                        onClick={() => {
                                          disconnectGA.mutate();
                                        }}
                                        disabled={disconnectGA.isPending}
                                      >
                                        {disconnectGA.isPending
                                          ? 'Disconnecting...'
                                          : 'Disconnect'}
                                      </Button>
                                    </div>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                                asChild
                              >
                                <a href="/google-analytics">
                                  View Analytics
                                  <ArrowRight className="ml-2 h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section id="meta-ads" className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Meta Ads
                    </h2>
                    <p className="text-sm text-slate-500">
                      Connect your Meta Ads account to view ad performance and
                      insights.
                    </p>
                  </div>
                  {metaAdsConnections.length === 0 && (
                    <Button
                      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                      size="sm"
                      onClick={() => {
                        window.location.href = '/api/meta-ads/install';
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Connect Meta Ads
                    </Button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Connected Accounts</span>
                    <span>{metaAdsConnections.length} total</span>
                  </div>
                  {connectionsLoading ? (
                    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                      <StatsCardSkeleton />
                      <StatsCardSkeleton />
                    </div>
                  ) : metaAdsConnections.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-500">
                      <BarChart3 className="h-10 w-10 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        No Meta Ads connected yet
                      </p>
                      <p>
                        Connect your Meta Ads account to unlock ad analytics.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {metaAdsConnections.map((c) => {
                        const metadata =
                          (c.metadata as Record<string, unknown>) || {};
                        const adAccountName =
                          (metadata.adAccountName as string) ||
                          'Meta Ads Account';
                        const adAccountId =
                          (metadata.adAccountId as string) || '';
                        return (
                          <div
                            key={c.id}
                            className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800">
                                {adAccountName}
                              </p>
                              {adAccountId && (
                                <p className="text-xs text-slate-500">
                                  Account ID: {adAccountId}
                                </p>
                              )}
                              {c.createdAt && (
                                <p className="mt-1 text-xs text-slate-400">
                                  Connected{' '}
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 md:justify-end">
                              <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                              <Dialog
                                open={disconnectMetaAdsDialogOpen}
                                onOpenChange={setDisconnectMetaAdsDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-full border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    disabled={disconnectMetaAds.isPending}
                                  >
                                    <Trash2 className="mr-1.5 h-3 w-3" />
                                    Disconnect
                                  </Button>
                                </DialogTrigger>
                                <DialogContent containerClassName="max-w-md sm:rounded-3xl">
                                  <DialogHeader>
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                        <Trash2 className="h-5 w-5" />
                                      </div>
                                      <DialogTitle className="text-xl">
                                        Disconnect Meta Ads
                                      </DialogTitle>
                                    </div>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p className="text-sm text-slate-600">
                                      Are you sure you want to disconnect{' '}
                                      <span className="font-semibold text-slate-900">
                                        {adAccountName}
                                      </span>
                                      ? This will remove the connection and stop
                                      syncing ad data.
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      You can reconnect at any time from the
                                      integrations page.
                                    </p>
                                  </div>
                                  <DialogFooter className="sm:justify-end">
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                        onClick={() =>
                                          setDisconnectMetaAdsDialogOpen(false)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                        onClick={() => {
                                          disconnectMetaAds.mutate();
                                        }}
                                        disabled={disconnectMetaAds.isPending}
                                      >
                                        {disconnectMetaAds.isPending
                                          ? 'Disconnecting...'
                                          : 'Disconnect'}
                                      </Button>
                                    </div>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
                                asChild
                              >
                                <a href="/meta-ads">
                                  View Analytics
                                  <ArrowRight className="ml-2 h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
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
        <main className="min-h-screen bg-slate-100 py-28 lg:py-32">
          <div className="mx-auto max-w-6xl space-y-10 px-6">
            <div className="h-20 w-64 animate-pulse rounded-2xl bg-slate-200" />
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="space-y-10 p-8">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <IntegrationsInner />
    </Suspense>
  );
}
