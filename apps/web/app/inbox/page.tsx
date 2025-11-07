'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
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
  Search,
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

export default function InboxPage() {
  const toast = useToast();
  const [shop, setShop] = useState('');
  const [view, setView] = useState<'orders' | 'unlinked'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedUnlinkedId, setSelectedUnlinkedId] = useState<string | null>(null);
  const [messagePreviewByOrder, setMessagePreviewByOrder] = useState<Record<string, MessagePreview>>({});
  const [draft, setDraft] = useState('');
  const [unlinkedSuggestion, setUnlinkedSuggestion] = useState<any>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop');
    if (s) setShop(s);
  }, []);

  const recentOrders = trpc.ordersRecent.useQuery(
    { shop: shop || '', limit: 10 },
    { enabled: !!shop },
  );
  const dbOrders = trpc.ordersListDb.useQuery({ take: 25 });
  const messages = trpc.messagesByOrder.useQuery(
    { shopifyOrderId: selectedOrderId ?? '' },
    { enabled: !!selectedOrderId },
  );
  const orderDetail = trpc.orderGet.useQuery(
    { shop: shop || '', orderId: selectedOrderId || '' },
    { enabled: !!shop && !!selectedOrderId },
  );
  const emailLimit = trpc.checkEmailLimit.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unassigned = trpc.unassignedInbound.useQuery({ take: 40 });

  const suggest = trpc.aiSuggestReply.useMutation();
  const createAction = trpc.actionCreate.useMutation();
  const approveSend = trpc.actionApproveAndSend.useMutation();
  const refreshOrder = trpc.refreshOrderFromShopify.useMutation({
    onSuccess: () => {
      dbOrders.refetch();
      orderDetail.refetch();
      toast.success('Order synced from Shopify');
    },
  });
  const sendUnassignedReply = trpc.sendUnassignedReply.useMutation({
    onSuccess: () => {
      unassigned.refetch();
      emailLimit.refetch();
      toast.success('Reply sent successfully');
    },
    onError: (error) => {
      if (error.data?.code === 'FORBIDDEN' && error.message?.includes('Email limit')) {
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

  const orders = useMemo(() => (dbOrders.data?.orders ?? []) as DbOrder[], [dbOrders.data?.orders]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.shopifyId === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const selectedEmail = useMemo(() => {
    if (!messages.data?.messages?.length) return null;
    const inbound = (messages.data.messages as any[]).find((msg) => msg.direction === 'INBOUND');
    return (inbound ?? (messages.data.messages as any[])[0]) ?? null;
  }, [messages.data]);

  const selectedUnlinkedEmail = useMemo(() => {
    if (!selectedUnlinkedId) return null;
    return (unassigned.data?.messages ?? []).find((msg: any) => msg.id === selectedUnlinkedId) ?? null;
  }, [selectedUnlinkedId, unassigned.data?.messages]);

  const metrics = useMemo(() => {
    const openTickets = orders.length;
    const refundRate = `${Math.max(0, Math.round(((recentOrders.data?.orders?.length ?? 0) / 50) * 1000) / 10)}%`;
    const avgExecution = recentOrders.data?.orders?.length ? '12.4s' : '—';
    return [
      { title: 'Active orders', value: openTickets.toString(), icon: <Inbox className="h-4 w-4 text-slate-400" />, change: '+8%' },
      { title: 'Task success rate', value: `${Math.max(0, 100 - (emailLimit.data?.percentage ?? 0)).toFixed(1)}%`, icon: <CheckCircle className="h-4 w-4 text-emerald-400" />, change: '+4%' },
      { title: 'Avg execution time', value: avgExecution, icon: <Clock className="h-4 w-4 text-sky-400" />, change: '-12%' },
      { title: 'Unlinked emails', value: (unassigned.data?.messages?.length ?? 0).toString(), icon: <Mail className="h-4 w-4 text-rose-400" />, change: '+2%' },
    ];
  }, [orders.length, recentOrders.data?.orders, emailLimit.data?.percentage, unassigned.data?.messages?.length]);

  const linkedPreviews = useMemo(() => {
    if (!orders.length) return [] as Array<{ order: DbOrder; preview: MessagePreview | null }>;
    return orders.map((order) => ({
      order,
      preview: messagePreviewByOrder[order.shopifyId] ?? null,
    }));
  }, [orders, messagePreviewByOrder]);

  const handleSelectOrder = (order: DbOrder) => {
    setSelectedOrderId(order.shopifyId);
    setSelectedUnlinkedId(null);
    setUnlinkedSuggestion(null);
    setDraft('');
    setView('orders');
  };

  const handleGenerateAi = async (message: any, order?: DbOrder) => {
    const inboundCandidate = message?.direction === 'INBOUND' ? message : message ?? selectedEmail;
    if (!inboundCandidate) {
      toast.info('No inbound email to analyse.');
      return;
    }
    const fallbackSummary = message?.subject || message?.snippet || message?.body || 'Customer inquiry';
    const orderSummary = order
      ? orderDetail.data?.order?.name || order.name || `Order ${order.shopifyId}`
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
      setDraft((response as any).suggestion ?? '');
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to generate AI reply');
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !selectedOrder) return;
    if (emailLimit.data && !emailLimit.data.allowed) {
      toast.error(
        `Email limit reached (${emailLimit.data.current}/${emailLimit.data.limit}). Please upgrade to continue.`,
      );
      return;
    }
    try {
      const action = await createAction.mutateAsync({
        shop,
        shopifyOrderId: selectedOrder.shopifyId,
        email: selectedOrder.email ?? selectedEmail.from,
        type: 'INFO_REQUEST',
        note: 'Manual approval',
        draft,
      });
      const result = await approveSend.mutateAsync({
        actionId: action.actionId,
        to: selectedOrder.email ?? selectedEmail.from,
        subject: selectedEmail.subject ?? `Re: ${selectedOrder.name}`,
        body: draft,
      });
      if (result.ok) {
        if ((result as any).stub) toast.warning('Reply logged (Mailgun not configured)');
        else toast.success('Reply sent successfully');
        setDraft('');
        emailLimit.refetch();
      } else {
        toast.error(`Failed to send: ${(result as any).error}`);
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to send reply');
    }
  };

  const handleSendUnlinkedReply = async (message: any) => {
    try {
      await sendUnassignedReply.mutateAsync({
        messageId: message.id,
        replyBody: draft || message.aiSuggestion?.reply || '',
      });
      setDraft('');
      setUnlinkedSuggestion(null);
      setSelectedUnlinkedId(null);
    } catch (error: any) {
      toast.error(error.message ?? 'Reply failed');
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="min-h-screen bg-white pt-28 md:pt-32">
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
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
                <Search className="h-4 w-4" />
                <input
                  placeholder="Search shop…"
                  value={shop}
                  onChange={(event) => setShop(event.target.value)}
                  className="w-36 bg-transparent text-sm outline-none"
                />
              </div>
              <Button variant="outline" className="rounded-full border-slate-200 text-xs text-slate-600">
                Refresh
              </Button>
              <Button variant="outline" className="rounded-full border-slate-200 text-xs text-slate-600">
                Settings
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
                  view === tab ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'orders' ? 'Orders' : 'Unlinked emails'}
              </button>
            ))}
          </div>

          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.title} className="flex flex-col gap-2 border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>{metric.title}</span>
                  {metric.icon}
                </div>
                <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
                <span className="text-xs text-emerald-500">{metric.change}</span>
              </Card>
            ))}
          </section>

          {view === 'orders' ? (
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <Card className="border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">Orders</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ListChecks className="h-4 w-4" />
                    synced {recentOrders.isLoading ? 'loading…' : `${recentOrders.data?.orders?.length ?? 0}`} records
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
                    linkedPreviews.map(({ order, preview }) => (
                      <button
                        key={order.shopifyId}
                        type="button"
                        onClick={() => handleSelectOrder(order)}
                        className={`grid w-full grid-cols-[1.2fr,1.4fr,1fr,1fr] items-center gap-3 px-4 py-4 text-left transition ${
                          selectedOrderId === order.shopifyId ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div>
                          <div className="font-semibold tracking-tight text-slate-900">
                            {order.name || `#${order.shopifyId}`}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">{order.email ?? 'No email'}</p>
                          <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(order.totalAmount)}
                          </p>
                        </div>
                        <div>
                          <Badge
                            className={`text-xs font-semibold ${
                              STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.default
                            }`}
                          >
                            {order.status || 'PENDING'}
                          </Badge>
                          <p className="mt-1 text-xs text-slate-500">{recentOrders.data?.orders?.find((o: any) => o.id === order.shopifyId)?.fulfillmentStatus ?? '—'}</p>
                        </div>
                        <div>
                          <p className="line-clamp-1 text-sm text-slate-600">
                            {preview?.subject || 'Select to load latest email'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {relativeTime(preview?.createdAt)}
                          </p>
                        </div>
                      </button>
                    ))
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
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{orders.length}</p>
                  <p className="text-xs text-slate-500">Orders available</p>
                </Card>
                <Card className="border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-slate-500">Unlinked emails</div>
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
                    {emailLimit.data ? `${emailLimit.data.current}/${emailLimit.data.limit}` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Messages sent this period</p>
                  {emailLimit.data && !emailLimit.data.allowed && (
                    <UpgradePrompt
                      usagePercentage={emailLimit.data.percentage}
                      currentUsage={emailLimit.data.current}
                      limit={emailLimit.data.limit}
                      planName="Current"
                      variant="inline"
                    />
                  )}
                </Card>
              </aside>
            </div>
          ) : (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">Unlinked emails</div>
                <div className="text-xs text-slate-500">{unassigned.data?.messages?.length ?? 0} awaiting mapping</div>
              </div>
              <div className="divide-y divide-slate-200">
                {unassigned.isLoading ? (
                  <div className="space-y-4 p-4">
                    {[1, 2, 3].map((key) => (
                      <UnassignedEmailSkeleton key={key} />
                    ))}
                  </div>
                ) : (unassigned.data?.messages ?? []).length ? (
                  (unassigned.data?.messages ?? []).map((message: any) => (
                    <div key={message.id} className="grid grid-cols-[2fr,1fr,1fr] items-center gap-3 px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{message.subject ?? 'No subject'}</p>
                        <p className="text-xs text-slate-500">From: {message.from}</p>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{message.body}</p>
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
                            setUnlinkedSuggestion(message.aiSuggestion ?? null);
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
                          {sendUnassignedReply.isPending ? 'Sending…' : 'Send AI reply'}
                        </Button>
                      </div>
                    </div>
                  ))
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
        <div className="fixed inset-0 z-[80] flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSelectedOrderId(null);
              setSelectedUnlinkedId(null);
              setDraft('');
              setUnlinkedSuggestion(null);
            }}
          />
          <aside className="relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Inspector</p>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedOrder ? selectedOrder.name ?? `#${selectedOrder.shopifyId}` : selectedUnlinkedEmail?.subject}
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-slate-200 text-xs text-slate-600"
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

            {selectedOrder && (
              <div className="space-y-5">
                <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Order details</span>
                    <Badge
                      className={`text-xs font-semibold ${
                        STATUS_COLORS[selectedOrder.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.default
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
                      <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-4 w-full rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-black"
                    onClick={() => refreshOrder.mutate({
                      shop,
                      orderId: selectedOrderId ?? '',
                    })}
                    disabled={refreshOrder.isPending}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshOrder.isPending ? 'animate-spin' : ''}`} />
                    {refreshOrder.isPending ? 'Syncing…' : 'Refresh from Shopify'}
                  </Button>
                </Card>

                {orderDetail.isLoading && <OrderDetailSkeleton />}

                {orderDetail.data?.order && (
                  <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Items</div>
                    <div className="mt-3 space-y-3">
                      {(orderDetail.data.order.lineItems ?? []).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm text-slate-600">
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                          </div>
                          <span>{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">AI suggestion</div>
                    {aiSuggestion && (
                      <Badge className="border border-indigo-100 bg-indigo-50 text-indigo-600">
                        {Math.round((aiSuggestion.confidence ?? 0) * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {aiSuggestion?.rationale ?? 'Select "Generate AI reply" to analyse the latest customer email.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Button
                      size="sm"
                      className="rounded-full bg-slate-900 text-white"
                      onClick={() => handleGenerateAi(selectedEmail, selectedOrder)}
                      disabled={suggest.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {suggest.isPending ? 'Analysing…' : 'Generate AI reply'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-slate-200 text-slate-600"
                      onClick={() => setDraft(aiSuggestion?.reply ?? draft)}
                    >
                      Use suggestion
                    </Button>
                  </div>
                </Card>

                <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-sm font-semibold text-slate-900">Reply draft</div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={10}
                    placeholder="AI generated reply will appear here."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-black"
                      onClick={handleSendReply}
                      disabled={!draft || createAction.isPending || approveSend.isPending}
                    >
                      {createAction.isPending || approveSend.isPending ? 'Sending…' : 'Send email'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="rounded-full border-slate-200 text-sm text-slate-600">
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
                              <span>{new Date(message.createdAt).toLocaleString()}</span>
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
                  <div className="text-sm font-semibold text-slate-900">Email preview</div>
                  <p className="mt-2 text-xs text-slate-500">
                    From: {selectedUnlinkedEmail.from} ·{' '}
                    {new Date(selectedUnlinkedEmail.createdAt).toLocaleString()}
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
                    <div className="text-sm font-semibold text-slate-900">AI suggestion</div>
                    {(
                      (unlinkedSuggestion as any)?.confidence ??
                      selectedUnlinkedEmail.aiSuggestion?.confidence
                    ) && (
                      <Badge className="border border-indigo-100 bg-indigo-50 text-indigo-600">
                        {Math.round(
                          ((unlinkedSuggestion as any)?.confidence ?? selectedUnlinkedEmail.aiSuggestion?.confidence) * 100,
                        )}
                        % confidence
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {(unlinkedSuggestion as any)?.rationale ?? selectedUnlinkedEmail.aiSuggestion?.rationale ??
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
                    {(unlinkedSuggestion as any)?.draftReply || selectedUnlinkedEmail.aiSuggestion?.reply ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-slate-200 text-slate-600"
                        onClick={() =>
                          setDraft(
                            (unlinkedSuggestion as any)?.draftReply ?? selectedUnlinkedEmail.aiSuggestion?.reply ?? '',
                          )
                        }
                      >
                        Use suggestion
                      </Button>
                    ) : null}
                  </div>
                </Card>

                <Card className="border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Reply draft</div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={10}
                    placeholder="AI generated reply will appear here."
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-black"
                      onClick={() => handleSendUnlinkedReply(selectedUnlinkedEmail)}
                      disabled={sendUnassignedReply.isPending || (!draft && !selectedUnlinkedEmail.aiSuggestion?.reply)}
                    >
                      {sendUnassignedReply.isPending ? 'Sending…' : 'Send AI reply'}
                      <ArrowRight className="ml-2 h-4 w-4" />
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
          </aside>
        </div>
      )}
    </>
  );
}
