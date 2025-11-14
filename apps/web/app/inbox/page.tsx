'use client';

import {
  useEffect,
  useMemo,
  useState,
  Fragment,
  useRef,
  useCallback,
} from 'react';
import { trpc } from '../../lib/trpc';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { ScrollArea } from '../../../../@ai-ecom/api/components/ui/scroll-area';
import { Separator } from '../../../../@ai-ecom/api/components/ui/separator';
import {
  Mail,
  Package,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle,
  Sparkles,
  MessageSquare,
  Inbox,
  Zap,
  ArrowRight,
  Clock,
  DollarSign,
  ListChecks,
} from 'lucide-react';
import {
  OrderCardSkeleton,
  OrderDetailSkeleton,
  EmailCardSkeleton,
  UnassignedEmailSkeleton,
} from '../../components/SkeletonLoaders';
import { useToast, ToastContainer } from '../../components/Toast';
import { UpgradePrompt } from '../../components/UpgradePrompt';

const STATUS_COLORS: Record<string, string> = {
  FULFILLED: 'border-emerald-100 bg-emerald-50 text-emerald-600',
  REFUNDED: 'border-rose-100 bg-rose-50 text-rose-600',
  PENDING: 'border-amber-100 bg-amber-50 text-amber-600',
  default: 'border-slate-200 bg-slate-50 text-slate-500',
};

type DbOrder = {
  id: string;
  shopifyId: string;
  name?: string | null;
  email?: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
};

type MessagePreview = {
  id: string;
  subject?: string;
  body?: string;
  createdAt?: string;
  direction?: string;
};

type UnassignedMessage = {
  id: string;
  from: string;
  to: string;
  body: string;
  createdAt: string;
  direction?: string;
  subject?: string;
  snippet?: string;
  thread?: {
    subject?: string;
  } | null;
  aiSuggestion?: {
    reply?: string;
    proposedAction?: string;
    confidence?: number;
    rationale?: string;
    draftReply?: string;
  } | null;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function relativeTime(date: string | undefined) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins <= 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const extractEmailAddress = (value?: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
};

export default function InboxPage() {
  const toast = useToast();
  const [shop, setShop] = useState('');
  const [view, setView] = useState<'orders' | 'unlinked'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedUnlinkedId, setSelectedUnlinkedId] = useState<string | null>(
    null,
  );
  const [messagePreviewByOrder, setMessagePreviewByOrder] = useState<
    Record<string, MessagePreview>
  >({});
  const [draft, setDraft] = useState('');
  const [unlinkedSuggestion, setUnlinkedSuggestion] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [repliedOrderIds, setRepliedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [repliedMessageIds, setRepliedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop');
    if (s) setShop(s);
  }, []);

  const recentOrders = trpc.ordersRecent.useQuery(
    { shop: shop || '', limit: 10 },
    {
      enabled: !!shop,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists
    },
  );
  // Split into critical (orders) and secondary (unassigned) queries for progressive loading
  // Orders load first (critical), then unassigned messages (secondary)
  const inboxBootstrap = trpc.inboxBootstrap.useQuery(
    { ordersTake: 25, unassignedTake: 0 }, // Don't fetch unassigned in bootstrap
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists
    },
  );

  // Separate query for unassigned messages - loads after orders (progressive loading)
  const unassignedQuery = trpc.unassignedInbound.useQuery(
    { take: 20 }, // Reduced from 40 to 20 for faster initial load
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Only fetch after orders have loaded (or immediately if orders already cached)
      enabled: !inboxBootstrap.isLoading || !!inboxBootstrap.data,
    },
  );

  // Create aliases from inboxBootstrap to maintain existing code compatibility
  const dbOrders = {
    data: inboxBootstrap.data
      ? { orders: inboxBootstrap.data.orders }
      : undefined,
    isLoading: inboxBootstrap.isLoading,
    refetch: inboxBootstrap.refetch,
  };
  const unassigned = {
    data: unassignedQuery.data,
    isLoading: unassignedQuery.isLoading,
    refetch: unassignedQuery.refetch,
  };
  const emailLimit = {
    data: inboxBootstrap.data?.emailLimit,
    isLoading: inboxBootstrap.isLoading,
    refetch: inboxBootstrap.refetch,
  };

  const messages = trpc.messagesByOrder.useQuery(
    { shopifyOrderId: selectedOrderId ?? '' },
    {
      enabled: !!selectedOrderId,
      staleTime: 30_000, // Cache messages for 30s
      refetchOnWindowFocus: false,
    },
  );
  const orderDetail = trpc.orderGet.useQuery(
    { shop: shop || '', orderId: selectedOrderId || '' },
    {
      enabled: !!shop && !!selectedOrderId,
      staleTime: 60_000, // Cache order details for 60s
      refetchOnWindowFocus: false,
    },
  );

  const suggest = trpc.aiSuggestReply.useMutation();
  const createAction = trpc.actionCreate.useMutation();
  const approveSend = trpc.actionApproveAndSend.useMutation();
  const refreshOrder = trpc.refreshOrderFromShopify.useMutation({
    onSuccess: () => {
      inboxBootstrap.refetch(); // Single refetch updates all data
      orderDetail.refetch();
      toast.success('Order synced from Shopify');
    },
  });
  const sendUnassignedReply = trpc.sendUnassignedReply.useMutation({
    onSuccess: () => {
      unassignedQuery.refetch(); // Refetch unassigned messages
      inboxBootstrap.refetch(); // Refetch email limit
      toast.success('Reply sent successfully');
    },
    onError: (error) => {
      if (
        error.data?.code === 'FORBIDDEN' &&
        error.message?.includes('Email limit')
      ) {
        toast.error(error.message || 'Email limit reached.');
        emailLimit.refetch();
      } else {
        toast.error('Failed to send reply');
      }
    },
  });

  const aiSuggestion = useMemo(() => {
    const suggestion = (messages.data?.messages as any[] | undefined)?.find(
      (message) => message.aiSuggestion?.proposedAction,
    );
    return suggestion?.aiSuggestion;
  }, [messages.data]);

  useEffect(() => {
    if (!selectedOrderId || !messages.data?.messages?.length) return;
    const latest = messages.data.messages[0] as any;
    setMessagePreviewByOrder((prev) => ({
      ...prev,
      [selectedOrderId]: {
        id: latest.id,
        subject: latest.thread?.subject ?? latest.subject,
        body: latest.body,
        createdAt: latest.createdAt,
        direction: latest.direction,
      },
    }));
  }, [selectedOrderId, messages.data]);

  useEffect(() => {
    if (aiSuggestion?.reply && !draft) setDraft(aiSuggestion.reply);
  }, [aiSuggestion, draft]);

  const orders = useMemo(
    () => (dbOrders.data?.orders ?? []) as DbOrder[],
    [dbOrders.data?.orders],
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.shopifyId === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const selectedEmail = useMemo(() => {
    if (!messages.data?.messages?.length) return null;
    const inbound = (messages.data.messages as any[]).find(
      (msg) => msg.direction === 'INBOUND',
    );
    return inbound ?? (messages.data.messages as any[])[0] ?? null;
  }, [messages.data]);

  const selectedUnlinkedEmail = useMemo<UnassignedMessage | null>(() => {
    if (!selectedUnlinkedId) return null;
    const messages =
      (unassigned.data?.messages as UnassignedMessage[] | undefined) ?? [];
    return messages.find((msg) => msg.id === selectedUnlinkedId) ?? null;
  }, [selectedUnlinkedId, unassigned.data?.messages]);

  const metrics = useMemo(() => {
    const openTickets = orders.length;
    const refundRate = `${Math.max(0, Math.round(((recentOrders.data?.orders?.length ?? 0) / 50) * 1000) / 10)}%`;
    const avgExecution = recentOrders.data?.orders?.length ? '12.4s' : '—';
    return [
      {
        title: 'Active orders',
        value: openTickets.toString(),
        icon: <Inbox className="h-4 w-4 text-slate-400" />,
        change: '+8%',
      },
      {
        title: 'Task success rate',
        value: `${Math.max(0, 100 - (emailLimit.data?.percentage ?? 0)).toFixed(1)}%`,
        icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
        change: '+4%',
      },
      {
        title: 'Avg execution time',
        value: avgExecution,
        icon: <Clock className="h-4 w-4 text-sky-400" />,
        change: '-12%',
      },
      {
        title: 'Unmatched emails',
        value: (unassigned.data?.messages?.length ?? 0).toString(),
        icon: <Mail className="h-4 w-4 text-rose-400" />,
        change: '+2%',
      },
    ];
  }, [
    orders.length,
    recentOrders.data?.orders,
    emailLimit.data?.percentage,
    unassigned.data?.messages?.length,
  ]);

  const linkedPreviews = useMemo(() => {
    if (!orders.length)
      return [] as Array<{ order: DbOrder; preview: MessagePreview | null }>;
    return orders.map((order) => ({
      order,
      preview: messagePreviewByOrder[order.shopifyId] ?? null,
    }));
  }, [orders, messagePreviewByOrder]);

  const handleSelectOrder = useCallback((order: DbOrder) => {
    setSelectedOrderId(order.shopifyId);
    setSelectedUnlinkedId(null);
    setUnlinkedSuggestion(null);
    setDraft('');
    setView('orders');
  }, []);

  // Helper function to clean placeholder text from AI suggestions
  const cleanPlaceholders = (text: string): string => {
    return text
      .replace(/\[Your Name\]/gi, '')
      .replace(/\[Your Company\]/gi, '')
      .replace(/\[Your Contact Information\]/gi, '')
      .replace(/\[Store Name\]/gi, '')
      .replace(/\[Your Company Name\]/gi, '')
      .replace(
        /Customer Support Team\s*\[Your Company\]/gi,
        'Customer Support Team',
      )
      .replace(/Best regards,?\s*\[Your Name\]/gi, 'Best regards,')
      .trim();
  };

  const handleGenerateAi = async (message: any, order?: DbOrder) => {
    const inboundCandidate =
      message?.direction === 'INBOUND' ? message : (message ?? selectedEmail);
    if (!inboundCandidate) {
      toast.info('No inbound email to analyse.');
      return;
    }
    const fallbackSummary =
      message?.subject ||
      message?.snippet ||
      message?.body ||
      'Customer inquiry';
    const orderSummary = order
      ? orderDetail.data?.order?.name ||
        order.name ||
        `Order ${order.shopifyId}`
      : fallbackSummary;
    const customerEmail = order?.email ?? inboundCandidate.from;
    try {
      const response = await suggest.mutateAsync({
        customerMessage: inboundCandidate.body || 'Customer inquiry',
        orderSummary,
        tone: 'friendly',
        customerEmail,
        orderId: order?.shopifyId ?? '',
      });
      if (!order) {
        setUnlinkedSuggestion(response as any);
      } else {
        setUnlinkedSuggestion(null);
      }
      // Clean placeholders from the generated suggestion
      const cleanedSuggestion = cleanPlaceholders(
        (response as any).suggestion ?? '',
      );
      setDraft(cleanedSuggestion);
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to generate AI reply');
    }
  };

  const handleRefreshAll = useCallback(async () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    setIsRefreshing(true);
    try {
      const tasks: Array<Promise<unknown>> = [
        inboxBootstrap.refetch(), // Refetch orders and email limit
        unassignedQuery.refetch(), // Refetch unassigned messages
      ];
      if (shop) {
        tasks.push(recentOrders.refetch());
      }
      if (selectedOrderId) {
        tasks.push(messages.refetch());
        if (shop) {
          tasks.push(orderDetail.refetch());
        }
      }
      await Promise.all(tasks);
      toast.success('Inbox data refreshed');
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to refresh data');
    } finally {
      refreshTimer.current = setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  }, [
    shop,
    selectedOrderId,
    inboxBootstrap.refetch,
    unassignedQuery.refetch,
    recentOrders.refetch,
    messages.refetch,
    orderDetail.refetch,
  ]);

  const handleSendReply = async () => {
    if (!selectedEmail || !selectedOrder) return;
    const inboundEmail = extractEmailAddress(selectedEmail.from);
    const orderEmail = extractEmailAddress(selectedOrder.email);
    const recipientEmail = inboundEmail ?? orderEmail;
    if (!recipientEmail) {
      toast.error('No valid recipient email found for this order.');
      return;
    }
    if (emailLimit.data && !emailLimit.data.allowed) {
      toast.error(
        `Email limit reached (${emailLimit.data.current}/${emailLimit.data.limit}). Please upgrade to continue.`,
      );
      return;
    }
    const currentOrderId = selectedOrder.shopifyId;
    try {
      const action = await createAction.mutateAsync({
        shop,
        shopifyOrderId: selectedOrder.shopifyId,
        email: recipientEmail,
        type: 'INFO_REQUEST',
        note: 'Manual approval',
        draft,
      });
      const result = await approveSend.mutateAsync({
        actionId: action.actionId,
        to: recipientEmail,
        subject: selectedEmail.subject ?? `Re: ${selectedOrder.name}`,
        body: draft,
      });
      if (result.ok) {
        // Mark this order as replied
        setRepliedOrderIds((prev) => new Set(prev).add(currentOrderId));

        if ((result as any).stub)
          toast.warning('Reply logged (Mailgun not configured)');
        else toast.success('Reply sent successfully');

        // Refetch data to get updated messages
        const [ordersResult] = await Promise.all([
          inboxBootstrap.refetch(), // Single refetch updates orders, unassigned, and emailLimit
          messages.refetch(),
        ]);

        // Find next order that needs a reply (use updated repliedOrderIds)
        const updatedRepliedIds = new Set([...repliedOrderIds, currentOrderId]);
        const allOrders = (ordersResult.data?.orders ?? []) as DbOrder[];
        const nextOrder = allOrders.find(
          (order) =>
            order.shopifyId !== currentOrderId &&
            !updatedRepliedIds.has(order.shopifyId),
        );

        if (nextOrder) {
          // Move to next order
          setSelectedOrderId(nextOrder.shopifyId);
          setDraft('');
          setUnlinkedSuggestion(null);
        } else {
          // No more orders needing replies - close modal and clear draft
          setSelectedOrderId(null);
          setSelectedUnlinkedId(null);
          setDraft('');
          setUnlinkedSuggestion(null);
          toast.success('All emails have been replied to!');
        }
      } else {
        toast.error(`Failed to send: ${(result as any).error}`);
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to send reply');
    }
  };

  const handleSendUnlinkedReply = async (message: any) => {
    const currentMessageId = message.id;
    try {
      await sendUnassignedReply.mutateAsync({
        messageId: message.id,
        replyBody: draft || message.aiSuggestion?.reply || '',
      });

      // Mark this message as replied
      setRepliedMessageIds((prev) => new Set(prev).add(currentMessageId));

      // Refetch unassigned messages
      const messagesResult = await unassignedQuery.refetch();

      // Find next unassigned message that needs a reply (use updated repliedMessageIds)
      const updatedRepliedMessageIds = new Set([
        ...repliedMessageIds,
        currentMessageId,
      ]);
      const allMessages = (messagesResult.data?.messages ??
        []) as UnassignedMessage[];
      const nextMessage = allMessages.find(
        (msg) =>
          msg.id !== currentMessageId && !updatedRepliedMessageIds.has(msg.id),
      );

      if (nextMessage) {
        // Move to next message
        setSelectedUnlinkedId(nextMessage.id);
        setDraft('');
        setUnlinkedSuggestion(null);
      } else {
        // No more messages needing replies - close modal and clear draft
        setSelectedUnlinkedId(null);
        setSelectedOrderId(null);
        setDraft('');
        setUnlinkedSuggestion(null);
        toast.success('All unassigned emails have been replied to!');
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Reply failed');
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="min-h-screen bg-white pt-32 md:pt-36">
        <header className="relative border-b border-slate-200/70 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-bold text-white">
                ZY
              </div>
              <div>
                <p className="text-xs text-slate-500">Zyyp</p>
                <p className="text-sm font-semibold tracking-tight text-slate-900">
                  Support AI Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Button
                variant="outline"
                className="rounded-full border-slate-200 text-xs text-slate-600"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </span>
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
            {(['orders', 'unlinked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setView(tab);
                  if (tab === 'unlinked') setSelectedOrderId(null);
                }}
                className={`rounded-xl px-4 py-2 font-semibold transition ${
                  view === tab
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'orders' ? 'Orders' : 'Unmatched emails'}
              </button>
            ))}
          </div>

          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card
                key={metric.title}
                className="flex flex-col gap-2 border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>{metric.title}</span>
                  {metric.icon}
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {metric.value}
                </p>
                <span className="text-xs text-emerald-500">
                  {metric.change}
                </span>
              </Card>
            ))}
          </section>

          {view === 'orders' ? (
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <Card className="border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">
                    Orders
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ListChecks className="h-4 w-4" />
                    synced{' '}
                    {recentOrders.isLoading
                      ? 'loading…'
                      : `${recentOrders.data?.orders?.length ?? 0}`}{' '}
                    records
                  </div>
                </div>
                <div className="divide-y divide-slate-200">
                  {dbOrders.isLoading ? (
                    <div className="space-y-2 p-4">
                      {[1, 2, 3, 4].map((key) => (
                        <OrderCardSkeleton key={key} />
                      ))}
                    </div>
                  ) : linkedPreviews.length ? (
                    linkedPreviews.map(({ order, preview }) => {
                      const isReplied = repliedOrderIds.has(order.shopifyId);
                      return (
                        <button
                          key={order.shopifyId}
                          type="button"
                          onClick={() => handleSelectOrder(order)}
                          className={`grid w-full grid-cols-[1.2fr,1.4fr,1fr,1fr] items-center gap-3 px-4 py-4 text-left transition ${
                            selectedOrderId === order.shopifyId
                              ? 'bg-slate-50'
                              : 'hover:bg-slate-50/60'
                          } ${isReplied ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            {isReplied && (
                              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold tracking-tight text-slate-900">
                                {order.name || `#${order.shopifyId}`}
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(order.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">
                              {order.email ?? 'No email'}
                            </p>
                            <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(order.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <Badge
                              className={`text-xs font-semibold ${
                                STATUS_COLORS[
                                  order.status as keyof typeof STATUS_COLORS
                                ] ?? STATUS_COLORS.default
                              }`}
                            >
                              {order.status || 'PENDING'}
                            </Badge>
                            <p className="mt-1 text-xs text-slate-500">
                              {recentOrders.data?.orders?.find(
                                (o: any) => o.id === order.shopifyId,
                              )?.fulfillmentStatus ?? '—'}
                            </p>
                          </div>
                          <div>
                            <p className="line-clamp-1 text-sm text-slate-600">
                              {preview?.subject ||
                                'Select to load latest email'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {relativeTime(preview?.createdAt)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Connect your Shopify store to populate orders.
                    </div>
                  )}
                </div>
              </Card>

              <aside className="space-y-4">
                <Card className="border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Live status</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                      Active
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">
                    {orders.length}
                  </p>
                  <p className="text-xs text-slate-500">Orders available</p>
                </Card>
                <Card className="border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-slate-500">Unmatched emails</div>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">
                    {unassigned.data?.messages?.length ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">Need triage</p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full rounded-full border-slate-200 text-xs text-slate-600"
                    onClick={() => setView('unlinked')}
                  >
                    Review now
                  </Button>
                </Card>
                <Card className="border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-slate-500">Email usage</div>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">
                    {emailLimit.data
                      ? `${emailLimit.data.current}/${emailLimit.data.limit}`
                      : '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Messages sent this period
                  </p>
                  {emailLimit.data && !emailLimit.data.allowed && (
                    <UpgradePrompt
                      usagePercentage={emailLimit.data.percentage}
                      currentUsage={emailLimit.data.current}
                      limit={emailLimit.data.limit}
                      planName={
                        emailLimit.data.planType
                          ? emailLimit.data.planType
                              .toLowerCase()
                              .replace(/^\w/, (c) => c.toUpperCase())
                          : 'Current'
                      }
                      variant="inline"
                      isTrial={emailLimit.data.trial?.isTrial ?? false}
                      trialExpired={emailLimit.data.trial?.expired ?? false}
                      trialDaysRemaining={
                        emailLimit.data.trial?.daysRemaining ?? null
                      }
                    />
                  )}
                </Card>
              </aside>
            </div>
          ) : (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font_semibold text-slate-900">
                  Unmatched emails
                </div>
                <div className="text-xs text-slate-500">
                  {unassigned.data?.messages?.length ?? 0} awaiting mapping
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {unassigned.isLoading ? (
                  <div className="space-y-4 p-4">
                    {[1, 2, 3].map((key) => (
                      <UnassignedEmailSkeleton key={key} />
                    ))}
                  </div>
                ) : (unassigned.data?.messages ?? []).length ? (
                  (
                    (unassigned.data?.messages ?? []) as UnassignedMessage[]
                  ).map((message) => {
                    const isReplied = repliedMessageIds.has(message.id);
                    return (
                      <div
                        key={message.id}
                        className={`grid grid-cols-[2fr,1fr,1fr] items-center gap-3 px-4 py-4 ${isReplied ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {isReplied && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {message.subject ?? 'No subject'}
                            </p>
                            <p className="text-xs text-slate-500">
                              From: {message.from}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                              {message.body}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </div>
                        <div className="flex flex-col gap-2 text-xs">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-slate-200 text-slate-600"
                            onClick={() => {
                              setSelectedUnlinkedId(message.id);
                              setSelectedOrderId(null);
                              setUnlinkedSuggestion(
                                message.aiSuggestion ?? null,
                              );
                              setDraft(message.aiSuggestion?.reply ?? '');
                            }}
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full bg-slate-900 text-white"
                            disabled={sendUnassignedReply.isPending}
                            onClick={() => handleSendUnlinkedReply(message)}
                          >
                            {sendUnassignedReply.isPending
                              ? 'Sending…'
                              : 'Send AI reply'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">
                    All emails are mapped. Great job! 🎉
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {(selectedOrder || selectedUnlinkedEmail) && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-10">
          <div
            className="modal-overlay absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => {
              setSelectedOrderId(null);
              setSelectedUnlinkedId(null);
              setDraft('');
              setUnlinkedSuggestion(null);
            }}
          />
          <div className="modal-container relative z-10 flex h-full w-full max-w-6xl min-h-[70vh] flex-col overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Inspector
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedOrder
                    ? (selectedOrder.name ?? `#${selectedOrder.shopifyId}`)
                    : (selectedUnlinkedEmail?.subject ??
                      selectedUnlinkedEmail?.thread?.subject ??
                      'Unmatched email')}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(
                    selectedOrder
                      ? selectedOrder.createdAt
                      : (selectedUnlinkedEmail?.createdAt ?? Date.now()),
                  ).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedOrder && (
                  <Badge
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_COLORS[
                        selectedOrder.status as keyof typeof STATUS_COLORS
                      ] ?? STATUS_COLORS.default
                    }`}
                  >
                    {selectedOrder.status}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
                  onClick={() => {
                    setSelectedOrderId(null);
                    setSelectedUnlinkedId(null);
                    setDraft('');
                    setUnlinkedSuggestion(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {selectedOrder && (
                <div className="space-y-5">
                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>Order details</span>
                      <Badge
                        className={`text-xs font-semibold ${
                          STATUS_COLORS[
                            selectedOrder.status as keyof typeof STATUS_COLORS
                          ] ?? STATUS_COLORS.default
                        }`}
                      >
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Order ID</span>
                        <span className="font-semibold text-slate-900">
                          {selectedOrder.name ?? `#${selectedOrder.shopifyId}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Email</span>
                        <span>{selectedOrder.email ?? 'Unavailable'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Placed</span>
                        <span>
                          {new Date(selectedOrder.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(selectedOrder.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 w-full rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-black"
                      onClick={() =>
                        refreshOrder.mutate({
                          shop,
                          orderId: selectedOrderId ?? '',
                        })
                      }
                      disabled={refreshOrder.isPending}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          refreshOrder.isPending ? 'animate-spin' : ''
                        }`}
                      />
                      {refreshOrder.isPending
                        ? 'Syncing…'
                        : 'Refresh from Shopify'}
                    </Button>
                  </Card>

                  {orderDetail.isLoading && <OrderDetailSkeleton />}

                  {orderDetail.data?.order && (
                    <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-semibold text-slate-900">
                        Items
                      </div>
                      <div className="mt-3 space-y-3">
                        {(orderDetail.data.order.lineItems ?? []).map(
                          (item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm text-slate-600"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {item.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Qty {item.quantity}
                                </p>
                              </div>
                              <span>{item.price}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </Card>
                  )}

                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        AI suggestion
                      </div>
                      {aiSuggestion && (
                        <Badge className="border border-indigo-100 bg-indigo-50 text-indigo-600">
                          {Math.round((aiSuggestion.confidence ?? 0) * 100)}%
                          confidence
                        </Badge>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {aiSuggestion?.rationale ??
                        'Select "Generate AI reply" to analyse the latest customer email.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Button
                        size="sm"
                        className="rounded-full bg-slate-900 text-white"
                        onClick={() =>
                          handleGenerateAi(selectedEmail, selectedOrder)
                        }
                        disabled={suggest.isPending}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {suggest.isPending ? 'Analysing…' : 'Generate AI reply'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-slate-200 text-slate-600"
                        onClick={() =>
                          setDraft(
                            cleanPlaceholders(aiSuggestion?.reply ?? draft),
                          )
                        }
                      >
                        Use suggestion
                      </Button>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 text-sm font-semibold text-slate-900">
                      Reply draft
                    </div>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={10}
                      placeholder="AI generated reply will appear here."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                        onClick={handleSendReply}
                        disabled={
                          !draft ||
                          createAction.isPending ||
                          approveSend.isPending
                        }
                      >
                        {createAction.isPending || approveSend.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            Send email
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full border-slate-200 text-sm text-slate-600"
                      >
                        Copy
                      </Button>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MessageSquare className="h-4 w-4" /> Thread
                    </div>
                    <div className="mt-3 space-y-3">
                      {(messages.data?.messages ?? []).length ? (
                        (messages.data?.messages as any[]).map((message) => (
                          <Fragment key={message.id}>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <Badge
                                  className={`border ${
                                    message.direction === 'INBOUND'
                                      ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                      : 'border-sky-100 bg-sky-50 text-sky-600'
                                  }`}
                                >
                                  {message.direction}
                                </Badge>
                                <span>
                                  {new Date(message.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <Separator className="my-2 bg-slate-200" />
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                {message.body}
                              </p>
                            </div>
                          </Fragment>
                        ))
                      ) : (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          No emails linked yet. Generate a reply to get started.
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {selectedUnlinkedEmail && (
                <div className="space-y-5">
                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">
                      Email preview
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      From: {selectedUnlinkedEmail.from} ·{' '}
                      {new Date(
                        selectedUnlinkedEmail.createdAt,
                      ).toLocaleString()}
                    </p>
                    <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                      {selectedUnlinkedEmail.body}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-slate-200 text-slate-600"
                        onClick={() => {
                          setSelectedUnlinkedId(null);
                          setUnlinkedSuggestion(null);
                          setDraft('');
                        }}
                      >
                        Close preview
                      </Button>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        AI suggestion
                      </div>
                      {((unlinkedSuggestion as any)?.confidence ??
                        selectedUnlinkedEmail.aiSuggestion?.confidence) && (
                        <Badge className="border border-indigo-100 bg-indigo-50 text-indigo-600">
                          {Math.round(
                            ((unlinkedSuggestion as any)?.confidence ??
                              selectedUnlinkedEmail.aiSuggestion?.confidence) *
                              100,
                          )}
                          % confidence
                        </Badge>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {(unlinkedSuggestion as any)?.rationale ??
                        selectedUnlinkedEmail.aiSuggestion?.rationale ??
                        'Generate a reply to analyse this email.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Button
                        size="sm"
                        className="rounded-full bg-slate-900 text-white"
                        onClick={() => handleGenerateAi(selectedUnlinkedEmail)}
                        disabled={suggest.isPending}
                      >
                        {suggest.isPending ? 'Analysing…' : 'Generate AI reply'}
                      </Button>
                      {(unlinkedSuggestion as any)?.draftReply ||
                      selectedUnlinkedEmail.aiSuggestion?.reply ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-slate-200 text-slate-600"
                          onClick={() =>
                            setDraft(
                              cleanPlaceholders(
                                (unlinkedSuggestion as any)?.draftReply ??
                                  selectedUnlinkedEmail.aiSuggestion?.reply ??
                                  '',
                              ),
                            )
                          }
                        >
                          Use suggestion
                        </Button>
                      ) : null}
                    </div>
                  </Card>

                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">
                      Reply draft
                    </div>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={10}
                      placeholder="AI generated reply will appear here."
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                        onClick={() =>
                          handleSendUnlinkedReply(selectedUnlinkedEmail)
                        }
                        disabled={
                          sendUnassignedReply.isPending ||
                          (!draft && !selectedUnlinkedEmail.aiSuggestion?.reply)
                        }
                      >
                        {sendUnassignedReply.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            Send AI reply
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full border-slate-200 text-sm text-slate-600"
                        onClick={() => navigator.clipboard.writeText(draft)}
                      >
                        Copy
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
