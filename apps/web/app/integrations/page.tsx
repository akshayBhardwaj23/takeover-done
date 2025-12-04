'use client';

import { trpc } from '../../lib/trpc';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, ChangeEvent, useMemo, Suspense } from 'react';
import {
  Store,
  Mail,
  RefreshCw,
  CheckCircle2,
  Plus,
  Sparkles,
  BarChart3,
  Settings2,
  Search,
} from 'lucide-react';
import { useToast, ToastContainer } from '../../components/Toast';
import { Switch } from '../../components/ui/switch';

// --- Types ---

type IntegrationCategory =
  | 'Sales & Marketing Tools'
  | 'Communication & Collaboration'
  | 'Analytics';

type IntegrationType = 'SHOPIFY' | 'EMAIL' | 'GA4' | 'META_ADS';

interface IntegrationItem {
  id: string;
  type: IntegrationType;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: 'connected' | 'disconnected';
  icon: React.ElementType;
  metadata?: any;
  originalObject?: any;
  isEnabled?: boolean; // For toggle state
}

// --- Components ---

function IntegrationCard({
  item,
  onToggle,
  onDetails,
  onRemove,
  onSync,
  isSyncing,
}: {
  item: IntegrationItem;
  onToggle: (item: IntegrationItem) => void;
  onDetails: (item: IntegrationItem) => void;
  onRemove: (item: IntegrationItem) => void;
  onSync?: (item: IntegrationItem) => void;
  isSyncing?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 text-zinc-900">
          <item.icon className="h-6 w-6" />
        </div>
        {item.status === 'connected' && (
          <div className="flex items-center gap-2">
            <Switch
              checked={item.isEnabled}
              onCheckedChange={() => onToggle(item)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        )}
      </div>

      <div className="mb-6 space-y-2">
        <h3 className="font-bold text-zinc-900">{item.name}</h3>
        <p className="text-sm text-zinc-500 line-clamp-2">{item.description}</p>
      </div>

      <div className="flex items-center gap-3">
        {item.status === 'connected' ? (
          <>
            {item.type === 'SHOPIFY' && onSync && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => onSync(item)}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-lg border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => onDetails(item)}
            >
              Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg px-3 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onRemove(item)}
            >
              Remove
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="h-9 w-full rounded-lg bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
            onClick={() => onDetails(item)} // Reusing onDetails for "Connect" action
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function IntegrationsInner() {
  const toast = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  // --- Queries & Mutations ---
  const { data, isLoading: connectionsLoading } = trpc.connections.useQuery(
    undefined,
    {
      staleTime: 120_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  const connections = data?.connections || [];
  const shopifyConnections = connections.filter(
    (c: any) => c.type === 'SHOPIFY',
  );
  const emailConnections = connections.filter(
    (c: any) => c.type === 'CUSTOM_EMAIL',
  );
  const gaConnections = connections.filter(
    (c: any) => c.type === 'GOOGLE_ANALYTICS',
  );
  const metaAdsConnections = connections.filter(
    (c: any) => c.type === 'META_ADS',
  );
  const utils = trpc.useContext();

  // State for Shopify Dialog
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');

  // State for Edit/Disconnect
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeNameDraft, setStoreNameDraft] = useState('');
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState<
    string | null
  >(null);
  const [disconnectGADialogOpen, setDisconnectGADialogOpen] = useState(false);
  const [disconnectMetaAdsDialogOpen, setDisconnectMetaAdsDialogOpen] =
    useState(false);

  // Mutations
  const createCustomApp = trpc.shopify.createCustomAppConnection.useMutation({
    onSuccess: () => {
      toast.success('Shopify store connected!');
      setShowShopifyDialog(false);
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const syncOrders = trpc.shopify.syncOrders.useMutation({
    onSuccess: () => {
      toast.success('Order sync started! This may take a moment.');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createAlias = trpc.email.createAlias.useMutation({
    onSuccess: () => {
      toast.success('Email alias created!');
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rotateAlias = trpc.email.rotateAlias.useMutation({
    onSuccess: () => {
      toast.success('Alias rotated!');
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const setAliasStatus = trpc.email.setAliasStatus.useMutation({
    onSuccess: () => {
      toast.success('Alias status updated!');
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStoreName = trpc.shopify.updateStoreName.useMutation({
    onSuccess: () => {
      toast.success('Store name updated');
      setEditingStoreId(null);
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const disconnectStore = trpc.shopify.disconnectStore.useMutation({
    onSuccess: () => {
      toast.success('Store disconnected');
      setDisconnectDialogOpen(null);
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const disconnectGA = trpc.disconnectGoogleAnalytics.useMutation({
    onSuccess: () => {
      toast.success('Google Analytics disconnected');
      setDisconnectGADialogOpen(false);
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const disconnectMetaAds = trpc.disconnectMetaAds.useMutation({
    onSuccess: () => {
      toast.success('Meta Ads disconnected');
      setDisconnectMetaAdsDialogOpen(false);
      utils.connections.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isConnectingShopify = createCustomApp.isPending;
  const isSavingStoreName = updateStoreName.isPending;

  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'connected' | 'disconnected'
  >('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // --- Helpers ---
  const deriveStoreName = (c: any) => {
    const meta = (c.metadata as any) || {};
    return meta.storeName || c.shopDomain?.split('.')[0] || 'Shopify Store';
  };

  const onSubmitCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    // Construct shopDomain from subdomain
    const shopDomain = `${subdomainInput}.myshopify.com`;
    createCustomApp.mutate({
      shopDomain,
      subdomain: subdomainInput,
      accessToken: accessTokenInput,
      apiSecret: apiSecretInput, // For webhook HMAC verification
    });
  };

  // --- Unified Data Logic ---
  const unifiedIntegrations: IntegrationItem[] = useMemo(() => {
    const items: IntegrationItem[] = [];

    // 1. Shopify
    if (shopifyConnections.length > 0) {
      shopifyConnections.forEach((c: any) => {
        items.push({
          id: c.id,
          type: 'SHOPIFY',
          name: deriveStoreName(c),
          description: `Connected to ${c.shopDomain}. Syncs orders and customers.`,
          category: 'Sales & Marketing Tools',
          status: 'connected',
          icon: Store,
          isEnabled: true, // Always enabled if connected
          originalObject: c,
        });
      });
      // Add "Add Store" card when there are already stores connected
      items.push({
        id: 'shopify-add-store',
        type: 'SHOPIFY',
        name: 'Add Another Store',
        description:
          'Connect an additional Shopify store to manage multiple stores.',
        category: 'Sales & Marketing Tools',
        status: 'disconnected',
        icon: Plus,
      });
    } else {
      items.push({
        id: 'shopify-placeholder',
        type: 'SHOPIFY',
        name: 'Shopify',
        description:
          'Offers tools for online stores, order syncing, and customer management.',
        category: 'Sales & Marketing Tools',
        status: 'disconnected',
        icon: Store,
      });
    }

    // 2. Meta Ads
    if (metaAdsConnections.length > 0) {
      metaAdsConnections.forEach((c: any) => {
        const meta = (c.metadata as any) || {};
        items.push({
          id: c.id,
          type: 'META_ADS',
          name: meta.adAccountName || 'Meta Ads Account',
          description: `Account ID: ${meta.adAccountId || 'Unknown'}. Tracks ad performance.`,
          category: 'Sales & Marketing Tools',
          status: 'connected',
          icon: Sparkles,
          isEnabled: true,
          originalObject: c,
        });
      });
    } else {
      items.push({
        id: 'meta-ads-placeholder',
        type: 'META_ADS',
        name: 'Meta Ads',
        description: 'Track campaign performance and ROI directly in Zyyp.',
        category: 'Sales & Marketing Tools',
        status: 'disconnected',
        icon: Sparkles,
      });
    }

    // 3. Email
    if (emailConnections.length > 0) {
      emailConnections.forEach((c: any) => {
        const meta = (c.metadata as any) || {};
        items.push({
          id: c.id,
          type: 'EMAIL',
          name: meta.alias || 'Email Alias',
          description: `Routing to: ${meta.shopDomain || 'Unknown'}.`,
          category: 'Communication & Collaboration',
          status: 'connected',
          icon: Mail,
          isEnabled: !meta.disabled,
          originalObject: c,
        });
      });

      // Add "Add Email Alias" option for stores without aliases
      const storesWithAliases = emailConnections
        .map((c: any) => (c.metadata as any)?.shopDomain)
        .filter(Boolean);
      const storesWithoutAliases = shopifyConnections.filter(
        (c: any) => c.shopDomain && !storesWithAliases.includes(c.shopDomain),
      );

      storesWithoutAliases.forEach((store: any) => {
        items.push({
          id: `email-add-${store.id}`,
          type: 'EMAIL',
          name: `Add Email Alias for ${deriveStoreName(store)}`,
          description: `Create an email alias for ${store.shopDomain}.`,
          category: 'Communication & Collaboration',
          status: 'disconnected',
          icon: Plus,
          originalObject: store,
        });
      });
    } else {
      if (shopifyConnections.length > 0) {
        // Show placeholder if there are stores but no aliases
        items.push({
          id: 'email-placeholder',
          type: 'EMAIL',
          name: 'Email Aliases',
          description:
            'Create email aliases to route support emails through Zyyp.',
          category: 'Communication & Collaboration',
          status: 'disconnected',
          icon: Mail,
        });
      } else {
        // No stores connected yet
        items.push({
          id: 'email-placeholder',
          type: 'EMAIL',
          name: 'Email Aliases',
          description: 'Connect a Shopify store first to create email aliases.',
          category: 'Communication & Collaboration',
          status: 'disconnected',
          icon: Mail,
        });
      }
    }

    // 4. Google Analytics
    if (gaConnections.length > 0) {
      gaConnections.forEach((c: any) => {
        const meta = (c.metadata as any) || {};
        items.push({
          id: c.id,
          type: 'GA4',
          name: meta.propertyName || 'GA4 Property',
          description: `Property ID: ${meta.propertyId || 'Unknown'}. View website analytics.`,
          category: 'Analytics',
          status: 'connected',
          icon: BarChart3,
          isEnabled: true,
          originalObject: c,
        });
      });
    } else {
      items.push({
        id: 'ga4-placeholder',
        type: 'GA4',
        name: 'Google Analytics',
        description:
          'Connect your GA4 property to see website traffic alongside orders.',
        category: 'Analytics',
        status: 'disconnected',
        icon: BarChart3,
      });
    }

    return items;
  }, [shopifyConnections, emailConnections, gaConnections, metaAdsConnections]);

  const filteredIntegrations = useMemo(() => {
    return unifiedIntegrations.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'connected') return item.status === 'connected';
      if (activeTab === 'disconnected') return item.status === 'disconnected';
      return true;
    });
  }, [unifiedIntegrations, searchQuery, activeTab]);

  const groupedIntegrations = useMemo(() => {
    const groups: Record<string, IntegrationItem[]> = {};
    filteredIntegrations.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredIntegrations]);

  // --- Handlers ---

  const handleToggle = (item: IntegrationItem) => {
    if (item.type === 'EMAIL') {
      setAliasStatus.mutate({
        id: item.id,
        disabled: !!item.isEnabled, // Toggle logic
      });
    } else {
      // For others, toggle OFF means disconnect
      if (item.isEnabled) {
        handleRemove(item);
      }
    }
  };

  const handleDetails = (item: IntegrationItem) => {
    if (item.status === 'disconnected') {
      // Connect Action
      if (item.type === 'SHOPIFY') {
        setShowShopifyDialog(true);
        setSubdomainInput('');
        setAccessTokenInput('');
      } else if (item.type === 'EMAIL') {
        // Trigger create alias logic
        const email = (session as any)?.user?.email;
        if (!email) {
          toast.warning('Please sign in first.');
          return;
        }

        // If this is an "Add Email Alias for Store X" item, use that store
        let targetShop: string | undefined;
        if (
          item.id?.startsWith('email-add-') &&
          item.originalObject?.shopDomain
        ) {
          targetShop = item.originalObject.shopDomain;
        } else {
          // Otherwise, find all available shops
          const availableShops = connections
            .filter((c: any) => c.type === 'SHOPIFY')
            .map((c: any) => c.shopDomain);

          if (availableShops.length === 0) {
            toast.warning('Connect a Shopify store first.');
            return;
          }

          // If only one shop, use it directly
          if (availableShops.length === 1) {
            targetShop = availableShops[0];
          } else {
            // Multiple shops - show selection dialog (for now, use first)
            // TODO: Add store selection dialog for multiple stores
            targetShop = availableShops[0];
            toast.info(
              `Creating alias for ${availableShops[0]}. To create for another store, use the "Add Email Alias" option for that specific store.`,
            );
          }
        }

        if (!targetShop) {
          toast.warning('No store selected for email alias.');
          return;
        }

        createAlias.mutate({
          userEmail: email,
          domain:
            (process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN as any) ||
            'mail.example.com',
          shop: targetShop,
        });
      } else if (item.type === 'GA4') {
        window.location.href = '/api/google-analytics/install';
      } else if (item.type === 'META_ADS') {
        window.location.href = '/api/meta-ads/install';
      }
      return;
    }

    // Details Action
    if (item.type === 'SHOPIFY') {
      if (item.originalObject?.shopDomain) {
        router.push(
          `/inbox?shop=${encodeURIComponent(item.originalObject.shopDomain)}`,
        );
      }
    } else if (item.type === 'EMAIL') {
      if (item.originalObject?.metadata?.alias) {
        navigator.clipboard.writeText(item.originalObject.metadata.alias);
        toast.success('Alias copied to clipboard');
      }
    } else if (item.type === 'GA4') {
      router.push('/google-analytics');
    } else if (item.type === 'META_ADS') {
      router.push('/meta-ads');
    }
  };

  const handleRemove = (item: IntegrationItem) => {
    if (item.type === 'SHOPIFY') {
      setDisconnectDialogOpen(item.id);
    } else if (item.type === 'GA4') {
      setDisconnectGADialogOpen(true);
    } else if (item.type === 'META_ADS') {
      setDisconnectMetaAdsDialogOpen(true);
    } else if (item.type === 'EMAIL') {
      toast.info('To remove an alias, please contact support or disable it.');
    }
  };

  const handleSync = (item: IntegrationItem) => {
    if (item.type === 'SHOPIFY' && item.id && item.id !== 'shopify-add-store') {
      syncOrders.mutate({ connectionId: item.id });
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900">Integrations</h1>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 text-white hover:bg-zinc-800">
                  <Plus className="mr-2 h-4 w-4" /> Add Integration
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Integration</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  {[
                    { type: 'SHOPIFY', name: 'Shopify', icon: Store },
                    { type: 'EMAIL', name: 'Email Alias', icon: Mail },
                    { type: 'GA4', name: 'Google Analytics', icon: BarChart3 },
                    { type: 'META_ADS', name: 'Meta Ads', icon: Sparkles },
                  ].map((opt) => (
                    <Button
                      key={opt.type}
                      variant="outline"
                      className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300"
                      onClick={() => {
                        setShowAddDialog(false);
                        handleDetails({
                          id: 'temp',
                          type: opt.type as IntegrationType,
                          name: opt.name,
                          description: '',
                          category: 'Sales & Marketing Tools', // Dummy
                          status: 'disconnected',
                          icon: opt.icon,
                        });
                      }}
                    >
                      <opt.icon className="h-6 w-6" />
                      {opt.name}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Toolbar */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 rounded-lg bg-zinc-100 p-1">
              {(['all', 'connected', 'disconnected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
                  {tab === 'all' && 'Applications'}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search Integration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-lg border-zinc-200 pl-9 focus-visible:ring-zinc-900"
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-10">
            {Object.entries(groupedIntegrations).map(([category, items]) => (
              <div key={category}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-zinc-900">
                    {category}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Enhancing the efficiency and effectiveness of your{' '}
                    {category.toLowerCase().split(' ')[0]} activities
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <IntegrationCard
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDetails={handleDetails}
                      onRemove={handleRemove}
                      onSync={handleSync}
                      isSyncing={syncOrders.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredIntegrations.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-zinc-500">No integrations found.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs (Preserved Logic) */}

      {/* Shopify Connect Dialog */}
      <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
        <DialogContent className="max-w-2xl border-zinc-200 p-0 sm:rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-100 px-8 py-6 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-zinc-900">
                  Connect Shopify Store
                </DialogTitle>
                <p className="mt-1 text-sm text-zinc-500">
                  Connect your store using a Custom App for full access.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-8 py-6">
            {/* Step-by-step Guide */}
            <div className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
              <h4 className="mb-4 flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                How to create a Custom App in Shopify
              </h4>
              <ol className="space-y-3 text-sm text-emerald-700">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                    1
                  </span>
                  <span>
                    Go to your <strong>Shopify Admin</strong> →{' '}
                    <strong>Settings</strong> (bottom left) →{' '}
                    <strong>Apps and sales channels</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                    2
                  </span>
                  <span>
                    Click <strong>Develop apps</strong> (top right) →{' '}
                    <strong>Create an app</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                    3
                  </span>
                  <span>
                    Name your app (e.g., &quot;Zyyp Integration&quot;) and click{' '}
                    <strong>Create app</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                    4
                  </span>
                  <div className="flex-1">
                    <span>
                      Click <strong>Configure Admin API scopes</strong> and
                      select these permissions:
                    </span>
                    <div className="mt-3 space-y-2 rounded-lg bg-white/60 p-3">
                      <div className="flex items-start gap-2">
                        <code className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold">
                          read_orders
                        </code>
                        <span className="text-xs text-emerald-600">
                          View order history and details
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold">
                          write_orders
                        </code>
                        <span className="text-xs text-emerald-600">
                          Process refunds and cancel orders
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold">
                          read_customers
                        </code>
                        <span className="text-xs text-emerald-600">
                          View customer info (name, email, address)
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold">
                          read_products
                        </code>
                        <span className="text-xs text-emerald-600">
                          View product details in orders
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-emerald-600/80">
                      💡 Tip: Use the search bar in Shopify to quickly find each
                      permission
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                    5
                  </span>
                  <span>
                    Click <strong>Save</strong>, then go to{' '}
                    <strong>API credentials</strong> tab
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                    6
                  </span>
                  <div className="flex-1">
                    <span>
                      Click <strong>Install app</strong>, then copy these two
                      values:
                    </span>
                    <div className="mt-2 space-y-1.5 rounded-lg bg-white/60 p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold">
                          Admin API access token
                        </code>
                        <span className="text-emerald-600">
                          → Click &quot;Reveal token once&quot;
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold">
                          API secret key
                        </code>
                        <span className="text-emerald-600">
                          → Shown in API credentials
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>

              {/* Features Enabled */}
              <div className="mt-5 rounded-lg bg-white/60 p-4">
                <p className="mb-2 text-xs font-semibold text-emerald-800">
                  ✨ What you&apos;ll be able to do:
                </p>
                <ul className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    View all orders in real-time
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    See customer details &amp; history
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Process refunds instantly
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Cancel unfulfilled orders
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    AI-powered email responses
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Automated order tracking
                  </li>
                </ul>
              </div>

              {/* Automatic Setup Info */}
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>
                  <strong>Automatic setup:</strong> Webhooks for real-time order
                  updates and customer data will be configured automatically
                  when you connect.
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-100 p-3 text-xs text-amber-800">
                <Settings2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Important:</strong> The access token is only shown
                  once! Copy it immediately and paste it below.
                </span>
              </div>
            </div>

            <form onSubmit={onSubmitCustomApp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Store Subdomain
                </label>
                <div className="flex items-center">
                  <Input
                    placeholder="your-shop"
                    required
                    value={subdomainInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSubdomainInput(
                        (e as any).target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ''),
                      )
                    }
                    className="h-12 rounded-l-xl rounded-r-none border-r-0 border-zinc-200 bg-zinc-50"
                  />
                  <span className="flex h-12 items-center rounded-r-xl border border-l-0 border-zinc-200 bg-zinc-100 px-4 text-sm text-zinc-500">
                    .myshopify.com
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Example: If your store URL is https://
                  <strong>my-store</strong>.myshopify.com, enter{' '}
                  <strong>my-store</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Admin API Access Token
                </label>
                <Input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                  required
                  value={accessTokenInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAccessTokenInput((e as any).target.value)
                  }
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono text-sm"
                />
                <p className="text-xs text-zinc-400">
                  Found in: Your custom app → API credentials → Admin API access
                  token (starts with &quot;shpat_&quot;)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  API Secret Key
                </label>
                <Input
                  type="password"
                  placeholder="shpss_xxxxxxxxxxxxxxxxxxxxx"
                  required
                  value={apiSecretInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setApiSecretInput((e as any).target.value)
                  }
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono text-sm"
                />
                <p className="text-xs text-zinc-400">
                  Found in: Your custom app → API credentials → API secret key
                  (used for webhook verification)
                </p>
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

            <p className="mt-6 text-center text-xs text-zinc-400">
              Need help? Check our{' '}
              <a
                href="https://docs.zyyp.ai/integrations/shopify"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 underline hover:text-zinc-900"
              >
                Shopify setup guide
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Dialogs */}
      <Dialog
        open={!!disconnectDialogOpen}
        onOpenChange={(open) =>
          setDisconnectDialogOpen(open ? disconnectDialogOpen : null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Store</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to disconnect this store? This will stop all
              data syncing and remove all stored data from Zyyp.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                Important: Remove Custom App from Shopify
              </p>
              <p className="text-xs text-amber-800">
                After disconnecting, you should also delete the Custom App from
                your Shopify Admin to fully revoke access:
              </p>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs text-amber-800">
                <li>
                  Go to Shopify Admin → Settings → Apps and sales channels
                </li>
                <li>Click &quot;Develop apps&quot;</li>
                <li>
                  Find your &quot;Zyyp Integration&quot; app and delete it
                </li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectDialogOpen(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                disconnectStore.mutate({ connectionId: disconnectDialogOpen! })
              }
              disabled={disconnectStore.isPending}
            >
              {disconnectStore.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disconnectGADialogOpen}
        onOpenChange={setDisconnectGADialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Analytics</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-gray-600">
            Are you sure you want to disconnect Google Analytics?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectGADialogOpen(false)}
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

      <Dialog
        open={disconnectMetaAdsDialogOpen}
        onOpenChange={setDisconnectMetaAdsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Meta Ads</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-gray-600">
            Are you sure you want to disconnect Meta Ads?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectMetaAdsDialogOpen(false)}
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
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white py-12 lg:py-24">
          <div className="mx-auto max-w-7xl space-y-20 px-6">
            <div className="space-y-6">
              <div className="h-12 w-64 animate-pulse rounded-2xl bg-zinc-100" />
              <div className="h-6 w-96 animate-pulse rounded-xl bg-zinc-50" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-3xl bg-zinc-100"
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
