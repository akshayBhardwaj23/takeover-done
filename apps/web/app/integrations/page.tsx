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
  AlertCircle,
  ExternalLink,
  Settings2,
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
  const { data, isLoading: connectionsLoading } = trpc.connections.useQuery(
    undefined,
    {
      staleTime: 120_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );
  const emailHealth = trpc.emailHealth.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
  const [connectionTab, setConnectionTab] = useState<'webhook' | 'custom_app'>(
    'webhook',
  );
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
  const connections: ConnectionSummary[] = useMemo(
    () => ((data as any)?.connections ?? []) as ConnectionSummary[],
    [data],
  );

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
      if (metaAdsError === 'connection_failed') {
        toast.error('Failed to connect Meta Ads. Please try again.');
      } else {
        toast.error('Meta Ads connection error. Please try again.');
      }
    }

    const gaWarning = sp.get('ga_warning');
    if (gaWarning === 'database_unavailable') {
      console.warn(
        '[Integrations] Google Analytics OAuth succeeded but database unavailable',
      );
    }

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
  }, [sp, router, toast]);

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
      <main className="min-h-screen bg-gray-50/50 py-12 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          {/* Header */}
          <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Integrations
              </h1>
              <p className="text-base text-gray-500">
                Manage your connections and configure automations.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
              <div className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-xs font-medium text-gray-600">
                {shopifyConnections.length +
                  emailConnections.length +
                  gaConnections.length +
                  metaAdsConnections.length}{' '}
                Active
              </span>
            </div>
          </header>

          {/* Stats Overview */}
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
              <div className="flex items-center gap-3 text-gray-500">
                <Store className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Shopify
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {connectionsLoading ? '—' : shopifyConnections.length}
                </span>
                <span className="text-xs text-gray-500">stores</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
              <div className="flex items-center gap-3 text-gray-500">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Aliases
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {connectionsLoading ? '—' : emailConnections.length}
                </span>
                <span className="text-xs text-gray-500">created</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
              <div className="flex items-center gap-3 text-gray-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Active
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {connectionsLoading ? '—' : activeAliases}
                </span>
                <span className="text-xs text-gray-500">routing</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
              <div className="flex items-center gap-3 text-gray-500">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Last Sync
                </span>
              </div>
              <div className="mt-3">
                <span className="text-sm font-medium text-gray-900">
                  {emailHealth.data?.lastInboundAt
                    ? new Date(
                        emailHealth.data.lastInboundAt as any,
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Shopify Section */}
            <section
              id="shopify"
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-6 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Shopify
                    </h2>
                    <p className="text-sm text-gray-500">
                      Sync orders and automate support.
                    </p>
                  </div>
                </div>
                <Dialog
                  open={showShopifyDialog}
                  onOpenChange={setShowShopifyDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="h-9 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
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
                </Dialog>
              </div>

              <div className="bg-gray-50/30">
                {connectionsLoading ? (
                  <div className="space-y-4 p-6">
                    <StatsCardSkeleton />
                  </div>
                ) : shopifyConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Store className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">
                      No stores connected
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      Connect your Shopify store to start syncing orders and
                      automating customer support.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {shopifyConnections.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col gap-4 p-6 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          {editingStoreId === c.id ? (
                            <form
                              className="flex items-center gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleStoreNameSave();
                              }}
                            >
                              <Input
                                value={storeNameDraft}
                                onChange={(event) =>
                                  setStoreNameDraft(event.target.value)
                                }
                                placeholder="Enter store name"
                                autoFocus
                                disabled={isSavingStoreName}
                                className="h-8 max-w-[200px]"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                className="h-8 rounded-md bg-gray-900 px-3 text-xs text-white"
                                disabled={isSavingStoreName}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-md px-3 text-xs"
                                onClick={cancelEditStore}
                                disabled={isSavingStoreName}
                              >
                                Cancel
                              </Button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">
                                {deriveStoreName(c)}
                              </span>
                              <Badge
                                variant="secondary"
                                className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                              >
                                {c.shopDomain}
                              </Badge>
                              {c.metadata?.connectionMethod === 'webhook' && (
                                <Badge
                                  variant="outline"
                                  className="rounded-md border-blue-200 bg-blue-50 text-blue-700"
                                >
                                  Webhook
                                </Badge>
                              )}
                              {c.metadata?.connectionMethod === 'custom_app' && (
                                <Badge
                                  variant="outline"
                                  className="rounded-md border-purple-200 bg-purple-50 text-purple-700"
                                >
                                  Custom App
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </div>
                            <span>•</span>
                            <span>
                              Added{' '}
                              {c.createdAt
                                ? new Date(c.createdAt).toLocaleDateString()
                                : 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingStoreId !== c.id && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                onClick={() => beginEditStore(c)}
                              >
                                Rename
                              </Button>
                              <Dialog
                                open={disconnectDialogOpen === c.id}
                                onOpenChange={(open) =>
                                  setDisconnectDialogOpen(open ? c.id : null)
                                }
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg border-gray-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100"
                                    disabled={disconnectStore.isPending}
                                  >
                                    Disconnect
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Disconnect Store</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-4 text-sm text-gray-600">
                                    Are you sure you want to disconnect{' '}
                                    <span className="font-semibold text-gray-900">
                                      {deriveStoreName(c)}
                                    </span>
                                    ? This will stop all data syncing.
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        setDisconnectDialogOpen(null)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        disconnectStore.mutate({
                                          connectionId: c.id,
                                        })
                                      }
                                      disabled={disconnectStore.isPending}
                                    >
                                      {disconnectStore.isPending
                                        ? 'Disconnecting...'
                                        : 'Disconnect'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                className="h-8 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800"
                                asChild
                              >
                                <a
                                  href={`/inbox?shop=${encodeURIComponent(c.shopDomain ?? '')}`}
                                >
                                  Inbox <ArrowRight className="ml-1.5 h-3 w-3" />
                                </a>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Email Section */}
            <section
              id="email"
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-6 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Email Aliases
                    </h2>
                    <p className="text-sm text-gray-500">
                      Route support emails through Zyyp.
                    </p>
                  </div>
                </div>
                <Button
                  className="h-9 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
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

              <div className="bg-gray-50/30">
                {connectionsLoading ? (
                  <div className="space-y-4 p-6">
                    <StatsCardSkeleton />
                  </div>
                ) : emailConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Mail className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">
                      No aliases created
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      Create an email alias to start forwarding your support
                      emails to Zyyp.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {emailConnections.map((c) => {
                      const disabled = (c as any)?.metadata?.disabled;
                      const alias = (c as any)?.metadata?.alias;
                      const shopDomain = (c as any)?.metadata?.shopDomain;
                      return (
                        <div
                          key={c.id}
                          className="flex flex-col gap-4 p-6 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                {alias ?? '(pending)'}
                              </span>
                              <Badge
                                variant={disabled ? 'secondary' : 'outline'}
                                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                  disabled
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {disabled ? 'Disabled' : 'Active'}
                              </Badge>
                            </div>
                            {shopDomain && (
                              <p className="text-xs text-gray-500">
                                Routing to: {String(shopDomain)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {alias && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(alias);
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
                              className="h-8 rounded-lg border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                              onClick={() => rotateAlias.mutate({ id: c.id })}
                              disabled={rotateAlias.isPending}
                            >
                              <RefreshCw className="mr-1.5 h-3 w-3" />
                              Rotate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 rounded-lg border-gray-200 text-xs font-medium hover:bg-gray-50 ${
                                disabled ? 'text-emerald-600' : 'text-gray-600'
                              }`}
                              onClick={() =>
                                setAliasStatus.mutate({
                                  id: c.id,
                                  disabled: !disabled,
                                })
                              }
                              disabled={setAliasStatus.isPending}
                            >
                              <Power className="mr-1.5 h-3 w-3" />
                              {disabled ? 'Enable' : 'Disable'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Google Analytics Section */}
            <section
              id="google-analytics"
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-6 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Google Analytics
                    </h2>
                    <p className="text-sm text-gray-500">
                      View website analytics and insights.
                    </p>
                  </div>
                </div>
                {gaConnections.length === 0 && (
                  <Button
                    className="h-9 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
                    onClick={() => {
                      window.location.href = '/api/google-analytics/install';
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Connect GA4
                  </Button>
                )}
              </div>

              <div className="bg-gray-50/30">
                {connectionsLoading ? (
                  <div className="space-y-4 p-6">
                    <StatsCardSkeleton />
                  </div>
                ) : gaConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <BarChart3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">
                      No analytics connected
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      Connect your Google Analytics 4 property to see website
                      traffic alongside your orders.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {gaConnections.map((c) => {
                      const metadata =
                        (c.metadata as Record<string, unknown>) || {};
                      const propertyName =
                        (metadata.propertyName as string) || 'GA4 Property';
                      const propertyId = (metadata.propertyId as string) || '';
                      return (
                        <div
                          key={c.id}
                          className="flex flex-col gap-4 p-6 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">
                                {propertyName}
                              </span>
                              <Badge
                                variant="outline"
                                className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                Active
                              </Badge>
                            </div>
                            {propertyId && (
                              <p className="text-xs text-gray-500">
                                Property ID: {propertyId}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Dialog
                              open={disconnectGADialogOpen}
                              onOpenChange={setDisconnectGADialogOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-gray-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100"
                                  disabled={disconnectGA.isPending}
                                >
                                  Disconnect
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Disconnect Analytics</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 text-sm text-gray-600">
                                  Are you sure you want to disconnect{' '}
                                  <span className="font-semibold text-gray-900">
                                    {propertyName}
                                  </span>
                                  ?
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      setDisconnectGADialogOpen(false)
                                    }
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => disconnectGA.mutate()}
                                    disabled={disconnectGA.isPending}
                                  >
                                    Disconnect
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800"
                              asChild
                            >
                              <a href="/google-analytics">
                                View Dashboard{' '}
                                <ArrowRight className="ml-1.5 h-3 w-3" />
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

            {/* Meta Ads Section */}
            <section
              id="meta-ads"
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-6 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Meta Ads
                    </h2>
                    <p className="text-sm text-gray-500">
                      Track ad performance and ROI.
                    </p>
                  </div>
                </div>
                {metaAdsConnections.length === 0 && (
                  <Button
                    className="h-9 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
                    onClick={() => {
                      window.location.href = '/api/meta-ads/install';
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Connect Meta Ads
                  </Button>
                )}
              </div>

              <div className="bg-gray-50/30">
                {connectionsLoading ? (
                  <div className="space-y-4 p-6">
                    <StatsCardSkeleton />
                  </div>
                ) : metaAdsConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Sparkles className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">
                      No ads connected
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      Connect your Meta Ads account to track campaign performance
                      directly in Zyyp.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
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
                          className="flex flex-col gap-4 p-6 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">
                                {adAccountName}
                              </span>
                              <Badge
                                variant="outline"
                                className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                Active
                              </Badge>
                            </div>
                            {adAccountId && (
                              <p className="text-xs text-gray-500">
                                Account ID: {adAccountId}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Dialog
                              open={disconnectMetaAdsDialogOpen}
                              onOpenChange={setDisconnectMetaAdsDialogOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-gray-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100"
                                  disabled={disconnectMetaAds.isPending}
                                >
                                  Disconnect
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Disconnect Meta Ads</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 text-sm text-gray-600">
                                  Are you sure you want to disconnect{' '}
                                  <span className="font-semibold text-gray-900">
                                    {adAccountName}
                                  </span>
                                  ?
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      setDisconnectMetaAdsDialogOpen(false)
                                    }
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => disconnectMetaAds.mutate()}
                                    disabled={disconnectMetaAds.isPending}
                                  >
                                    Disconnect
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800"
                              asChild
                            >
                              <a href="/meta-ads">
                                View Dashboard{' '}
                                <ArrowRight className="ml-1.5 h-3 w-3" />
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

          {/* Shopify Connect Dialog */}
          <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
            <DialogContent className="max-w-xl p-0 sm:rounded-2xl">
              <DialogHeader className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold">
                      Connect Shopify Store
                    </DialogTitle>
                    <p className="text-sm text-gray-500">
                      Choose how you want to connect your store.
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6 py-4">
                <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setConnectionTab('webhook');
                      setWebhookUrl(null);
                    }}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                      connectionTab === 'webhook'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Webhook (Simple)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionTab('custom_app')}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                      connectionTab === 'custom_app'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Custom App (Advanced)
                  </button>
                </div>

                {connectionTab === 'webhook' ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-700">
                      <p className="font-medium">Webhook Connection</p>
                      <p className="mt-1 opacity-90">
                        If your store URL is &quot;https://demo.myshopify.com&quot;, enter &quot;demo&quot; (without .myshopify.com)
                      </p>
                      <p className="mt-1 opacity-90">
                        Best for receiving order data. You&apos;ll need to add a URL
                        to your Shopify admin settings.
                      </p>
                    </div>

                    {!webhookUrl ? (
                      <form onSubmit={onSubmitWebhook} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Store Domain
                          </label>
                          <Input
                            placeholder="your-shop.myshopify.com"
                            required
                            value={shopInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setShopInput((e as any).target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Store Name (Optional)
                          </label>
                          <Input
                            placeholder="My Store"
                            value={storeNameInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setStoreNameInput((e as any).target.value)
                            }
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-gray-900 hover:bg-gray-800"
                          disabled={isConnectingShopify}
                        >
                          {isConnectingShopify ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate Webhook URL'
                          )}
                        </Button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Your Webhook URL
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={webhookUrl}
                              readOnly
                              className="bg-gray-50 font-mono text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={copyWebhookUrl}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h4 className="mb-2 text-sm font-medium text-gray-900">
                            Next Steps
                          </h4>
                          <ol className="list-decimal space-y-1 pl-4 text-xs text-gray-600">
                            <li>Go to Shopify Settings → Notifications</li>
                            <li>Click &quot;Create webhook&quot;</li>
                            <li>Event: orders/create</li>
                            <li>Format: JSON</li>
                            <li>Paste the URL above</li>
                          </ol>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setWebhookUrl(null);
                            setShopInput('');
                            setStoreNameInput('');
                          }}
                        >
                          Connect Another Store
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={onSubmitCustomApp} className="space-y-4">
                    <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-700">
                      <p className="font-medium">Custom App Connection</p>
                      <p className="mt-1 opacity-90">
                        Found in: Your custom app → API credentials → Admin API access token (starts with &quot;shpat_&quot;)
                      </p>
                      <p className="mt-1 opacity-90">
                        Provides full API access for advanced automation.
                        Requires creating a custom app in Shopify.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Store Domain
                        </label>
                        <Input
                          placeholder="your-shop.myshopify.com"
                          required
                          value={shopInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setShopInput((e as any).target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Subdomain
                        </label>
                        <Input
                          placeholder="your-shop"
                          required
                          value={subdomainInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSubdomainInput((e as any).target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Access Token
                        </label>
                        <Input
                          type="password"
                          placeholder="shpat_..."
                          required
                          value={accessTokenInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setAccessTokenInput((e as any).target.value)
                          }
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gray-900 hover:bg-gray-800"
                      disabled={isConnectingShopify}
                    >
                      {isConnectingShopify ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect Store'
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50/50 py-12 md:py-20">
          <div className="mx-auto max-w-5xl space-y-8 px-6">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          </div>
        </main>
      }
    >
      <IntegrationsInner />
    </Suspense>
  );
}
