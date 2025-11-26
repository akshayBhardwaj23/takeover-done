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
  Trash2,
  BarChart3,
  ExternalLink,
  Settings2,
} from 'lucide-react';
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

  const activeSteps = [
    shopifyConnections.length > 0,
    emailConnections.length > 0,
    gaConnections.length > 0,
    metaAdsConnections.length > 0,
  ].filter(Boolean).length;
  const progress = (activeSteps / 4) * 100;

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-zinc-50/50 text-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Setup Progress */}
          {progress < 100 && (
            <div className="mb-8 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-1 bg-gradient-to-r from-zinc-900 to-zinc-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Integrations
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Manage your connections and configure automations.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-1.5 shadow-sm">
              <div className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-xs font-medium text-zinc-600">
                {shopifyConnections.length +
                  emailConnections.length +
                  gaConnections.length +
                  metaAdsConnections.length}{' '}
                Active Systems
              </span>
            </div>
          </header>

          {/* Stat Bar */}
          <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm lg:grid-cols-4">
            <div className="group flex items-center gap-4 bg-white p-4 transition-colors hover:bg-zinc-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-900">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900">
                  {connectionsLoading ? '—' : shopifyConnections.length}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  Connected Stores
                </p>
              </div>
            </div>

            <div className="group flex items-center gap-4 bg-white p-4 transition-colors hover:bg-zinc-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-900">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900">
                  {connectionsLoading ? '—' : emailConnections.length}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  Email Aliases
                </p>
              </div>
            </div>

            <div className="group flex items-center gap-4 bg-white p-4 transition-colors hover:bg-zinc-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-900">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900">
                  {connectionsLoading ? '—' : activeAliases}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  Active Routes
                </p>
              </div>
            </div>

            <div className="group flex items-center gap-4 bg-white p-4 transition-colors hover:bg-zinc-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-900">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900">
                  {emailHealth.data?.lastInboundAt
                    ? new Date(
                        emailHealth.data.lastInboundAt as any,
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
                <p className="text-xs font-medium text-zinc-500">Last Sync</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Shopify Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Commerce Module */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">
                          Commerce
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Shopify stores & data
                        </p>
                      </div>
                    </div>
                    <Dialog
                      open={showShopifyDialog}
                      onOpenChange={setShowShopifyDialog}
                    >
                      <DialogTrigger asChild>
                        <button
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
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
                          <Plus className="h-3.5 w-3.5" />
                          Connect
                        </button>
                      </DialogTrigger>
                    </Dialog>
                  </div>

                  <div className="space-y-3">
                    {connectionsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-16 animate-pulse rounded-xl bg-zinc-50"
                          />
                        ))}
                      </div>
                    ) : shopifyConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400">
                          <Store className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-zinc-900">
                          No stores connected
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Connect your store to sync orders
                        </p>
                      </div>
                    ) : (
                      shopifyConnections.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-50"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                              <Store className="h-4 w-4 text-zinc-700" />
                            </div>
                            <div className="min-w-0">
                              {editingStoreId === c.id ? (
                                <form
                                  className="flex gap-2"
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
                                    className="h-7 w-32 text-xs"
                                    autoFocus
                                    onBlur={cancelEditStore}
                                    disabled={isSavingStoreName}
                                  />
                                </form>
                              ) : (
                                <p className="truncate text-sm font-medium text-zinc-900">
                                  {deriveStoreName(c)}
                                </p>
                              )}
                              <p className="truncate text-xs text-zinc-500">
                                {c.shopDomain}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                              onClick={() => beginEditStore(c)}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                            <Dialog
                              open={disconnectDialogOpen === c.id}
                              onOpenChange={(open) =>
                                setDisconnectDialogOpen(open ? c.id : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Communication Module */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">
                          Communication
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Email aliases & routing
                        </p>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
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
                      <Plus className="h-3.5 w-3.5" />
                      {createAlias.isPending ? 'Creating...' : 'Create Alias'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {connectionsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-16 animate-pulse rounded-xl bg-zinc-50"
                          />
                        ))}
                      </div>
                    ) : emailConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400">
                          <Mail className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-zinc-900">
                          No aliases created
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Create an alias to forward emails
                        </p>
                      </div>
                    ) : (
                      emailConnections.map((c) => {
                        const disabled = (c as any)?.metadata?.disabled;
                        const alias = (c as any)?.metadata?.alias;
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-50"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                <Mail className="h-4 w-4 text-zinc-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-zinc-900">
                                  {alias ?? '(pending)'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      disabled
                                        ? 'bg-zinc-100 text-zinc-500'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {disabled ? 'Disabled' : 'Active'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                                onClick={async () => {
                                  if (!alias) return;
                                  try {
                                    await navigator.clipboard.writeText(alias);
                                    toast.success('Alias copied!');
                                  } catch {
                                    toast.error('Copy failed');
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                                onClick={() => rotateAlias.mutate({ id: c.id })}
                                disabled={rotateAlias.isPending}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 ${
                                  disabled
                                    ? 'text-zinc-400 hover:text-emerald-600'
                                    : 'text-zinc-400 hover:text-zinc-600'
                                }`}
                                onClick={() =>
                                  setAliasStatus.mutate({
                                    id: c.id,
                                    disabled: !disabled,
                                  })
                                }
                                disabled={setAliasStatus.isPending}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Analytics Module */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">
                          Analytics
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Google Analytics 4
                        </p>
                      </div>
                    </div>
                    {gaConnections.length === 0 && (
                      <button
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                        onClick={() => {
                          window.location.href =
                            '/api/google-analytics/install';
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Connect
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {connectionsLoading ? (
                      <div className="space-y-3">
                        {[1].map((i) => (
                          <div
                            key={i}
                            className="h-16 animate-pulse rounded-xl bg-zinc-50"
                          />
                        ))}
                      </div>
                    ) : gaConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400">
                          <BarChart3 className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-zinc-900">
                          No analytics connected
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Track website traffic
                        </p>
                      </div>
                    ) : (
                      gaConnections.map((c) => {
                        const metadata =
                          (c.metadata as Record<string, unknown>) || {};
                        const propertyName =
                          (metadata.propertyName as string) || 'GA4 Property';
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-50"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                <BarChart3 className="h-4 w-4 text-zinc-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-zinc-900">
                                  {propertyName}
                                </p>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                  Active
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Dialog
                                open={disconnectGADialogOpen}
                                onOpenChange={setDisconnectGADialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-zinc-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Disconnect Analytics
                                    </DialogTitle>
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
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                                asChild
                              >
                                <a
                                  href="/google-analytics"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Advertising Module */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">
                          Advertising
                        </h3>
                        <p className="text-xs text-zinc-500">Meta Ads</p>
                      </div>
                    </div>
                    {metaAdsConnections.length === 0 && (
                      <button
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                        onClick={() => {
                          window.location.href = '/api/meta-ads/install';
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Connect
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {connectionsLoading ? (
                      <div className="space-y-3">
                        {[1].map((i) => (
                          <div
                            key={i}
                            className="h-16 animate-pulse rounded-xl bg-zinc-50"
                          />
                        ))}
                      </div>
                    ) : metaAdsConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-zinc-900">
                          No ads connected
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Track campaign performance
                        </p>
                      </div>
                    ) : (
                      metaAdsConnections.map((c) => {
                        const metadata =
                          (c.metadata as Record<string, unknown>) || {};
                        const adAccountName =
                          (metadata.adAccountName as string) ||
                          'Meta Ads Account';
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-50"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                <Sparkles className="h-4 w-4 text-zinc-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-zinc-900">
                                  {adAccountName}
                                </p>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                  Active
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Dialog
                                open={disconnectMetaAdsDialogOpen}
                                onOpenChange={setDisconnectMetaAdsDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-zinc-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Disconnect Meta Ads
                                    </DialogTitle>
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
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                                asChild
                              >
                                <a
                                  href="/meta-ads"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shopify Connect Dialog */}
          <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
            <DialogContent className="max-w-xl border-zinc-200 p-0 sm:rounded-3xl">
              <DialogHeader className="border-b border-zinc-100 px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-zinc-900">
                      Connect Shopify Store
                    </DialogTitle>
                    <p className="mt-1 text-sm text-zinc-500">
                      Choose how you want to connect your store.
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-8 py-6">
                <div className="mb-8 flex rounded-2xl bg-zinc-100 p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConnectionTab('webhook');
                      setWebhookUrl(null);
                    }}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                      connectionTab === 'webhook'
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Webhook (Simple)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionTab('custom_app')}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                      connectionTab === 'custom_app'
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Custom App (Advanced)
                  </button>
                </div>

                {connectionTab === 'webhook' ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-700">
                      <p className="font-bold">Webhook Connection</p>
                      <p className="mt-1 opacity-90">
                        If your store URL is
                        &quot;https://demo.myshopify.com&quot;, enter
                        &quot;demo&quot; (without .myshopify.com)
                      </p>
                      <p className="mt-1 opacity-90">
                        Best for receiving order data. You&apos;ll need to add a
                        URL to your Shopify admin settings.
                      </p>
                    </div>

                    {!webhookUrl ? (
                      <form onSubmit={onSubmitWebhook} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-700">
                            Store Domain
                          </label>
                          <Input
                            placeholder="your-shop.myshopify.com"
                            required
                            value={shopInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setShopInput((e as any).target.value)
                            }
                            className="h-12 rounded-xl border-zinc-200 bg-zinc-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-700">
                            Store Name (Optional)
                          </label>
                          <Input
                            placeholder="My Store"
                            value={storeNameInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setStoreNameInput((e as any).target.value)
                            }
                            className="h-12 rounded-xl border-zinc-200 bg-zinc-50"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="h-12 w-full rounded-full bg-zinc-900 text-base font-medium hover:bg-zinc-800"
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
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-700">
                            Your Webhook URL
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={webhookUrl}
                              readOnly
                              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="h-12 w-12 rounded-xl border-zinc-200"
                              onClick={copyWebhookUrl}
                            >
                              <Copy className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                          <h4 className="mb-3 text-sm font-bold text-zinc-900">
                            Next Steps
                          </h4>
                          <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-600">
                            <li>Go to Shopify Settings → Notifications</li>
                            <li>Click &quot;Create webhook&quot;</li>
                            <li>Event: orders/create</li>
                            <li>Format: JSON</li>
                            <li>Paste the URL above</li>
                          </ol>
                        </div>
                        <Button
                          variant="outline"
                          className="h-12 w-full rounded-full border-zinc-200 text-zinc-600 hover:bg-zinc-50"
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
                  <form onSubmit={onSubmitCustomApp} className="space-y-6">
                    <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 text-sm text-purple-700">
                      <p className="font-bold">Custom App Connection</p>
                      <p className="mt-1 opacity-90">
                        Found in: Your custom app → API credentials → Admin API
                        access token (starts with &quot;shpat_&quot;)
                      </p>
                      <p className="mt-1 opacity-90">
                        Provides full API access for advanced automation.
                        Requires creating a custom app in Shopify.
                      </p>
                    </div>

                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">
                          Store Domain
                        </label>
                        <Input
                          placeholder="your-shop.myshopify.com"
                          required
                          value={shopInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setShopInput((e as any).target.value)
                          }
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">
                          Subdomain
                        </label>
                        <Input
                          placeholder="your-shop"
                          required
                          value={subdomainInput}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSubdomainInput((e as any).target.value)
                          }
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">
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
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-full bg-zinc-900 text-base font-medium hover:bg-zinc-800"
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
        <main className="min-h-screen bg-white py-12 lg:py-24">
          <div className="mx-auto max-w-[1400px] space-y-20 px-6">
            <div className="space-y-6">
              <div className="h-12 w-64 animate-pulse rounded-2xl bg-zinc-100" />
              <div className="h-6 w-96 animate-pulse rounded-xl bg-zinc-50" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-3xl bg-zinc-100"
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
