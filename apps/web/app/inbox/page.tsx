'use client';
import { trpc } from '../../lib/trpc';
import { useEffect, useMemo, useState } from 'react';
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
  XCircle,
  Sparkles,
  MessageSquare,
  Inbox,
  Zap,
  ArrowRight,
  Clock,
  DollarSign,
} from 'lucide-react';
import {
  OrderCardSkeleton,
  OrderDetailSkeleton,
  EmailCardSkeleton,
  UnassignedEmailSkeleton,
} from '../../components/SkeletonLoaders';
import { useToast, ToastContainer } from '../../components/Toast';

type DbOrder = {
  id: string;
  shopifyId: string;
  name?: string | null;
  email?: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export default function InboxPage() {
  const toast = useToast();
  const [shop, setShop] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop');
    if (s) setShop(s);
  }, []);

  const { data } = trpc.ordersRecent.useQuery(
    { shop: shop || '', limit: 10 },
    { enabled: !!shop },
  );
  const dbOrders = trpc.ordersListDb.useQuery({ take: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  const orderDetail = trpc.orderGet.useQuery(
    { shop: shop || '', orderId: selected || '' },
    { enabled: !!shop && !!selected },
  );
  const [draft, setDraft] = useState('');
  const suggest = trpc.aiSuggestReply.useMutation({
    onSuccess: (d) => setDraft(d.suggestion),
  });
  const createAction = trpc.actionCreate.useMutation();
  const approveSend = trpc.actionApproveAndSend.useMutation();

  const messages = trpc.messagesByOrder.useQuery(
    { shopifyOrderId: selected ?? '' },
    { enabled: !!selected },
  );

  const emailThreads = trpc.threadsList.useQuery({ take: 30 });
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const threadMessages = trpc.threadMessages.useQuery(
    { threadId: selectedThread || '' },
    { enabled: !!selectedThread },
  );
  const [activeTab, setActiveTab] = useState<'orders' | 'emails'>('orders');

  const unassigned = trpc.unassignedInbound.useQuery({ take: 20 });
  const assignMessage = trpc.assignMessageToOrder.useMutation({
    onSuccess: () => {
      messages.refetch();
      unassigned.refetch();
    },
  });
  const refreshOrder = trpc.refreshOrderFromShopify.useMutation({
    onSuccess: () => {
      dbOrders.refetch();
      orderDetail.refetch();
    },
  });
  const sendUnassignedReply = trpc.sendUnassignedReply.useMutation({
    onSuccess: () => {
      unassigned.refetch();
    },
  });

  // Get AI suggestion from messages
  const aiSuggestion = useMemo(() => {
    const m = (messages.data?.messages as any[] | undefined)?.find(
      (x) => x.aiSuggestion?.proposedAction,
    );
    return m?.aiSuggestion;
  }, [messages.data]);

  // Auto-populate draft with AI suggestion when it's available
  useEffect(() => {
    if (aiSuggestion?.reply && !draft) {
      setDraft(aiSuggestion.reply);
    }
  }, [aiSuggestion, draft]);

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="flex h-[calc(100dvh-0px)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Left Sidebar - Orders List */}
        <section className="flex w-80 flex-col border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
          {/* Header */}
          <div className="border-b border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/20">
                <Inbox className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Inbox</h1>
                <p className="text-xs text-slate-400">AI-powered support</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800/50 bg-slate-900/30 p-1">
            <button
              onClick={() => {
                setActiveTab('orders');
                setSelectedThread(null);
                setSelected(null);
              }}
              className={`group flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Package className="mr-2 inline-block h-4 w-4" />
              Orders
            </button>
            <button
              onClick={() => {
                setActiveTab('emails');
                setSelected(null);
              }}
              className={`group flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'emails'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Mail className="mr-2 inline-block h-4 w-4" />
              Emails
            </button>
          </div>

          {!shop && (
            <div className="m-3">
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4">
                <AlertCircle className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-xs text-amber-200">
                  Add ?shop=your-shop.myshopify.com to the URL to load orders.
                </p>
              </Card>
            </div>
          )}

          <ScrollArea className="flex-1">
            {dbOrders.isLoading ? (
              <div className="p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <OrderCardSkeleton key={i} />
                ))}
              </div>
            ) : dbOrders.data?.orders?.length ? (
              <div className="space-y-2 p-3">
                {(dbOrders.data.orders as DbOrder[]).map((o) => (
                  <Card
                    key={o.id}
                    className={`group relative cursor-pointer overflow-hidden border p-4 transition-all ${
                      selected === o.shopifyId
                        ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-800/50 bg-slate-800/30 hover:border-indigo-500/30 hover:bg-slate-800/50'
                    }`}
                    onClick={() => {
                      setSelected(o.shopifyId);
                      setSelectedThread(null);
                    }}
                  >
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20" />
                    <div className="relative">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-white">
                          {o.name || `#${o.shopifyId}`}
                        </span>
                        <Badge
                          className={`text-xs font-semibold ${
                            o.status === 'FULFILLED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : o.status === 'REFUNDED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {o.status}
                        </Badge>
                      </div>
                      <p className="mb-2 truncate text-xs text-slate-400">
                        {o.email ?? 'No email'}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-sm font-bold text-white">
                            {(o.totalAmount / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-700" />
                <p className="mt-3 text-sm font-medium text-slate-400">
                  No orders found
                </p>
              </div>
            )}
          </ScrollArea>
        </section>

        {/* Middle Section - Order Details / Thread View */}
        <section className="flex flex-1 flex-col border-r border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          {!selected && !selectedThread && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-fit rounded-full bg-slate-800/50 p-8">
                  <Package className="h-16 w-16 text-slate-600" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">
                  No order selected
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Select an order from the sidebar to view details and AI
                  suggestions
                </p>
              </div>
            </div>
          )}

          {selected && orderDetail.isLoading && <OrderDetailSkeleton />}

          {selected && orderDetail.data?.order && (
            <div className="flex flex-1 flex-col">
              {/* Order Header */}
              <div className="relative overflow-hidden border-b border-slate-800/50 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-8">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className="bg-white/20 text-white backdrop-blur-sm">
                        Order Details
                      </Badge>
                    </div>
                    <h2 className="text-3xl font-black text-white">
                      {orderDetail.data.order.name}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-indigo-100">
                      <Mail className="h-4 w-4" />
                      {orderDetail.data.order.email ?? 'No email'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
                      <p className="text-xs text-indigo-100">Total Value</p>
                      <div className="text-3xl font-black text-white">
                        {orderDetail.data.order.totalPrice}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 border-white/20 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                      onClick={() =>
                        refreshOrder.mutate({
                          shop: shop,
                          orderId: selected || '',
                        })
                      }
                      disabled={refreshOrder.isPending}
                    >
                      <RefreshCw
                        className={`mr-2 h-3.5 w-3.5 ${refreshOrder.isPending ? 'animate-spin' : ''}`}
                      />
                      {refreshOrder.isPending
                        ? 'Syncing...'
                        : 'Refresh from Shopify'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-b border-slate-800/50 bg-slate-900/20 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Package className="h-4 w-4" />
                  Order Items
                </h3>
                <div className="space-y-2">
                  {orderDetail.data.order.lineItems.map((li: any) => (
                    <div
                      key={li.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-800/30 p-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white">{li.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Quantity: {li.quantity}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-emerald-400">
                        {li.price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Suggestions Section */}
              {aiSuggestion && (
                <div className="relative overflow-hidden border-b border-slate-800/50 bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-pink-600/20 p-6">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2 shadow-lg shadow-violet-500/20">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">
                        AI Suggestions
                      </h3>
                      <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                        Powered by AI
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestion.proposedAction && (
                          <Button
                            className="bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-purple-700"
                            disabled={createAction.isPending}
                            onClick={async () => {
                              const o = orderDetail.data?.order;
                              if (!o) return;
                              try {
                                await createAction.mutateAsync({
                                  shop: shop,
                                  shopifyOrderId: o.id,
                                  email: o.email ?? undefined,
                                  type: aiSuggestion.proposedAction as any,
                                  note: 'AI suggested action',
                                  draft: aiSuggestion.reply,
                                });
                                toast.success('Action created successfully!');
                              } catch (error) {
                                toast.error('Failed to create action');
                              }
                            }}
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            {createAction.isPending
                              ? 'Creating...'
                              : aiSuggestion.proposedAction.replace('_', ' ')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800"
                          onClick={() => {
                            const first = (
                              messages.data?.messages as any[] | undefined
                            )?.[0];
                            if (first?.threadId)
                              setSelectedThread(first.threadId as string);
                          }}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          View Email Thread
                        </Button>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-violet-300">
                        <CheckCircle className="h-3 w-3" />
                        Confidence: {aiSuggestion.confidence}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Reply Generator */}
              <div className="flex-1 overflow-auto bg-slate-900/20 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    AI Reply Assistant
                  </h3>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      const o = orderDetail.data?.order;
                      if (!o) return;

                      // Get the latest customer message for context
                      const latestMessage = (
                        messages.data?.messages as any[] | undefined
                      )?.find((m) => m.direction === 'INBOUND');

                      suggest.mutate({
                        customerMessage:
                          latestMessage?.body || 'Customer inquiry',
                        orderSummary: `${o.name || `#${o.id}`} - $${o.totalPrice}`,
                        tone: 'friendly',
                        customerEmail: o.email || latestMessage?.from,
                        orderId: o.id,
                      });
                    }}
                    className="w-full border-indigo-500/30 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 font-semibold text-white hover:from-indigo-600/30 hover:to-purple-600/30"
                    disabled={suggest.isPending}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {suggest.isPending ? 'Generating...' : 'Generate AI Reply'}
                  </Button>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    rows={8}
                    placeholder="AI-generated reply will appear here. You can edit before sending..."
                  />
                  <Button
                    onClick={async () => {
                      const o = orderDetail.data?.order;
                      if (!o) return;
                      const res = await createAction.mutateAsync({
                        shop: shop,
                        shopifyOrderId: o.id,
                        email: o.email ?? undefined,
                        type: 'INFO_REQUEST',
                        note: 'Manual approval',
                        draft,
                      });
                      const sendResult = await approveSend.mutateAsync({
                        actionId: res.actionId,
                        to: o.email ?? 'customer@example.com',
                        subject: `Re: ${o.name}`,
                        body: draft,
                      });
                      if (sendResult.ok) {
                        if ((sendResult as any).stub) {
                          toast.warning(
                            'Reply logged (Mailgun not configured)',
                          );
                        } else {
                          toast.success('Reply sent successfully!');
                        }
                        setDraft(''); // Clear draft after sending
                      } else {
                        toast.error(
                          `Failed to send: ${(sendResult as any).error}`,
                        );
                      }
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 font-bold shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-purple-700"
                    disabled={
                      !draft || createAction.isPending || approveSend.isPending
                    }
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {createAction.isPending || approveSend.isPending
                      ? 'Sending...'
                      : 'Send Reply'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedThread && (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800 p-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedThread(null)}
                  className="mb-4 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800"
                >
                  ← Back to Orders
                </Button>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-indigo-400" />
                  <h2 className="text-2xl font-black text-white">
                    Email Thread
                  </h2>
                </div>
              </div>
              <ScrollArea className="flex-1 bg-slate-900/20 p-6">
                <div className="space-y-4">
                  {(threadMessages.data?.messages ?? []).map((m: any) => (
                    <Card
                      key={m.id}
                      className="relative overflow-hidden border border-slate-800/50 bg-slate-800/30 p-5"
                    >
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <Badge
                            className={`font-semibold ${
                              m.direction === 'INBOUND'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {m.direction}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="mb-3 text-xs text-slate-400">
                          <strong className="text-slate-300">From:</strong>{' '}
                          {m.from} →{' '}
                          <strong className="text-slate-300">To:</strong> {m.to}
                        </div>
                        <Separator className="my-4 bg-slate-700/50" />
                        <div className="whitespace-pre-wrap text-sm text-slate-300">
                          {m.body}
                        </div>
                        {m.aiSuggestion && (
                          <div className="mt-4 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-purple-600/20 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-violet-400" />
                              <span className="text-xs font-bold uppercase text-violet-300">
                                AI Suggestion
                              </span>
                            </div>
                            <p className="mb-3 text-sm text-slate-300">
                              {m.aiSuggestion.reply}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-violet-300">
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {m.aiSuggestion.proposedAction}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {m.aiSuggestion.confidence}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </section>

        {/* Right Sidebar - Messages & Unassigned */}
        <section className="flex w-96 flex-col border-l border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          <div className="border-b border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                {selected ? 'Email Matches' : 'Unassigned Emails'}
              </h3>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {selected && (
              <div className="p-4">
                {messages.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <EmailCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (messages.data?.messages ?? []).length === 0 ? (
                  <Card className="border-slate-800/50 bg-slate-800/30 p-6 text-center">
                    <div className="mx-auto w-fit rounded-full bg-slate-700/50 p-4">
                      <Mail className="h-8 w-8 text-slate-500" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-400">
                      No emails mapped to this order
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {(messages.data?.messages ?? []).map((m: any) => (
                      <Card
                        key={m.id}
                        className="group relative overflow-hidden border border-slate-800/50 bg-slate-800/30 p-4 transition-all hover:border-indigo-500/30 hover:bg-slate-800/50"
                      >
                        <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20" />
                        <div className="relative">
                          <div className="mb-3 flex items-center justify-between">
                            <Badge
                              className={`text-xs font-semibold ${
                                m.direction === 'INBOUND'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {m.direction}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {new Date(m.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mb-2 text-xs text-slate-400">
                            {m.from.split('@')[0]}@...
                          </p>
                          <p className="line-clamp-2 text-sm text-slate-300">
                            {m.body}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selected && (
              <div className="p-4">
                {unassigned.isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <UnassignedEmailSkeleton key={i} />
                    ))}
                  </div>
                ) : (unassigned.data?.messages ?? []).length === 0 ? (
                  <Card className="border-slate-800/50 bg-slate-800/30 p-6 text-center">
                    <div className="mx-auto w-fit rounded-full bg-emerald-500/20 p-4">
                      <CheckCircle className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-300">
                      All emails are mapped!
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      No unassigned emails at the moment
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {(unassigned.data?.messages ?? []).map((m: any) => (
                      <Card
                        key={m.id}
                        className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-600/10 to-orange-600/10 p-4"
                      >
                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl" />
                        <div className="relative">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-400" />
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                Unassigned
                              </Badge>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {new Date(m.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mb-3 text-xs font-semibold text-amber-200">
                            From: {m.from}
                          </p>
                          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                            <p className="text-xs font-medium text-slate-400 mb-1.5">
                              Customer Message:
                            </p>
                            <p className="text-sm text-slate-300">{m.body}</p>
                          </div>
                          {m.aiSuggestion && (
                            <div className="mt-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                                  <p className="text-xs font-semibold text-violet-300">
                                    {m.aiSuggestion.proposedAction}
                                  </p>
                                </div>
                                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                                  {(m.aiSuggestion.confidence * 100).toFixed(0)}
                                  % confident
                                </Badge>
                              </div>
                              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                                <p className="text-xs font-medium text-indigo-300 mb-2 flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3" />
                                  AI Generated Reply:
                                </p>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                  {m.aiSuggestion.reply}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-purple-700"
                                disabled={sendUnassignedReply.isLoading}
                                onClick={async () => {
                                  try {
                                    const result =
                                      await sendUnassignedReply.mutateAsync({
                                        messageId: m.id,
                                        replyBody: m.aiSuggestion.reply,
                                      });
                                    if (result.ok) {
                                      if ((result as any).stub) {
                                        toast.warning(
                                          'Reply logged (Mailgun not configured)',
                                        );
                                      } else {
                                        toast.success(
                                          'Reply sent successfully!',
                                        );
                                      }
                                    } else {
                                      toast.error(
                                        `Failed to send: ${(result as any).error}`,
                                      );
                                    }
                                  } catch (error: any) {
                                    toast.error(`Error: ${error.message}`);
                                  }
                                }}
                              >
                                <Send className="mr-2 h-3.5 w-3.5" />
                                {sendUnassignedReply.isLoading
                                  ? 'Sending...'
                                  : 'Send AI Reply'}
                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </section>
      </main>
    </>
  );
}
