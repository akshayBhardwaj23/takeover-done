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
  Copy,
  Power,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
  BarChart3,
  ExternalLink,
  Settings2,
  Search,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';
import { useToast, ToastContainer } from '../../components/Toast';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';

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
}: {
  item: IntegrationItem;
  onToggle: (item: IntegrationItem) => void;
  onDetails: (item: IntegrationItem) => void;
  onRemove: (item: IntegrationItem) => void;
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
  const [connectionTab, setConnectionTab] = useState<'webhook' | 'custom_app'>(
    'webhook',
  );
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [shopInput, setShopInput] = useState('');
  const [storeNameInput, setStoreNameInput] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [accessTokenInput, setAccessTokenInput] = useState('');

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
  const createWebhook = trpc.shopify.createWebhook.useMutation({
    onSuccess: (data: any) => setWebhookUrl(data.webhookUrl),
    onError: (err: any) => toast.error(err.message),
  });

  const createCustomApp = trpc.shopify.createCustomAppConnection.useMutation({
    onSuccess: () => {
      toast.success('Shopify store connected!');
      setShowShopifyDialog(false);
      utils.connections.invalidate();
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

  const isConnectingShopify =
    createWebhook.isPending || createCustomApp.isPending;
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

  const copyWebhookUrl = async () => {
    if (webhookUrl) {
      try {
        await navigator.clipboard.writeText(webhookUrl);
        toast.success('Copied to clipboard!');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };

  const onSubmitWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    createWebhook.mutate({
      shopDomain: shopInput,
      storeName: storeNameInput || undefined,
    });
  };

  const onSubmitCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomApp.mutate({
      shopDomain: shopInput,
      subdomain: subdomainInput,
      accessToken: accessTokenInput,
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
    } else {
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
        setConnectionTab('webhook');
        setWebhookUrl(null);
        setShopInput('');
        setStoreNameInput('');
        setSubdomainInput('');
        setAccessTokenInput('');
      } else if (item.type === 'EMAIL') {
        // Trigger create alias logic
        const email = (session as any)?.user?.email;
        if (!email) {
          toast.warning('Please sign in first.');
          return;
        }
        const firstShop = connections.find(
          (c: any) => c.type === 'SHOPIFY',
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

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-8">
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
                    If your store URL is &quot;https://demo.myshopify.com&quot;,
                    enter &quot;demo&quot; (without .myshopify.com)
                  </p>
                  <p className="mt-1 opacity-90">
                    Best for receiving order data. You&apos;ll need to add a URL
                    to your Shopify admin settings.
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
                    Provides full API access for advanced automation. Requires
                    creating a custom app in Shopify.
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
          <div className="py-4 text-sm text-gray-600">
            Are you sure you want to disconnect this store? This will stop all
            data syncing.
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
