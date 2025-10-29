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
} from 'lucide-react';

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
    <main className="flex h-[calc(100dvh-0px)] bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Left Sidebar - Orders List */}
      <section className="flex w-80 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
          <p className="text-sm text-slate-600">
            Manage orders and support emails
          </p>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab('orders');
              setSelectedThread(null);
              setSelected(null);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-50'
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
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'emails'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Mail className="mr-2 inline-block h-4 w-4" />
            Emails
          </button>
        </div>

        {!shop && (
          <div className="m-4">
            <Card className="border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mb-2 h-5 w-5 text-amber-600" />
              <p className="text-xs text-amber-900">
                Add ?shop=your-shop.myshopify.com to the URL to load orders.
              </p>
            </Card>
          </div>
        )}

        <ScrollArea className="flex-1">
          {dbOrders.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                <p className="text-sm text-slate-600">Loading orders...</p>
              </div>
            </div>
          ) : dbOrders.data?.orders?.length ? (
            <div className="p-2">
              {(dbOrders.data.orders as DbOrder[]).map((o) => (
                <Card
                  key={o.id}
                  className={`mb-2 cursor-pointer p-3 transition-all hover:shadow-md ${
                    selected === o.shopifyId
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                  onClick={() => {
                    setSelected(o.shopifyId);
                    setSelectedThread(null);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {o.name || `#${o.shopifyId}`}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        o.status === 'FULFILLED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : o.status === 'REFUNDED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {o.status}
                    </Badge>
                  </div>
                  <p className="mb-1 truncate text-xs text-slate-600">
                    {o.email ?? 'No email'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      ${(o.totalAmount / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              No orders found
            </div>
          )}
        </ScrollArea>
      </section>

      {/* Middle Section - Order Details / Thread View */}
      <section className="flex flex-1 flex-col border-r border-slate-200 bg-white">
        {!selected && !selectedThread && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Package className="mx-auto h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">
                No order selected
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Select an order from the sidebar to view details
              </p>
            </div>
          </div>
        )}

        {selected && orderDetail.isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
              <p className="text-sm text-slate-600">Loading order details...</p>
            </div>
          </div>
        )}

        {selected && orderDetail.data?.order && (
          <div className="flex flex-1 flex-col">
            {/* Order Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {orderDetail.data.order.name}
                  </h2>
                  <p className="mt-1 text-indigo-100">
                    {orderDetail.data.order.email ?? 'No email'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {orderDetail.data.order.totalPrice}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-white/30 bg-white/10 text-white hover:bg-white/20"
                    onClick={() =>
                      refreshOrder.mutate({
                        shop: shop,
                        orderId: selected || '',
                      })
                    }
                    disabled={refreshOrder.isPending}
                  >
                    <RefreshCw
                      className={`mr-2 h-3 w-3 ${refreshOrder.isPending ? 'animate-spin' : ''}`}
                    />
                    {refreshOrder.isPending
                      ? 'Syncing...'
                      : 'Refresh from Shopify'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-b border-slate-200 p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Order Items
              </h3>
              <div className="space-y-2">
                {orderDetail.data.order.lineItems.map((li: any) => (
                  <div
                    key={li.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{li.title}</p>
                      <p className="text-sm text-slate-600">
                        Qty: {li.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">{li.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggestions Section */}
            {aiSuggestion && (
              <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6">
                <div className="mb-3 flex items-center">
                  <Sparkles className="mr-2 h-5 w-5 text-violet-600" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-900">
                    AI Suggestions
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestion.proposedAction && (
                      <Button
                        variant="default"
                        className="bg-violet-600 hover:bg-violet-700"
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
                            alert('Action created successfully!');
                          } catch (error) {
                            alert('Failed to create action');
                          }
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {createAction.isPending
                          ? 'Creating...'
                          : aiSuggestion.proposedAction.replace('_', ' ')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
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
                  <p className="text-xs text-violet-600">
                    Confidence: {aiSuggestion.confidence}
                  </p>
                </div>
              </div>
            )}

            {/* AI Reply Generator */}
            <div className="flex-1 overflow-auto p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                AI Reply Assistant
              </h3>
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
                  className="w-full"
                  variant="outline"
                  disabled={suggest.isPending}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {suggest.isPending ? 'Generating...' : 'Generate AI Reply'}
                </Button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      alert(
                        (sendResult as any).stub
                          ? 'Reply logged (Mailgun not configured)'
                          : 'Reply sent successfully!',
                      );
                      setDraft(''); // Clear draft after sending
                    } else {
                      alert(`Failed to send: ${(sendResult as any).error}`);
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={
                    !draft || createAction.isPending || approveSend.isPending
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  {createAction.isPending || approveSend.isPending
                    ? 'Sending...'
                    : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedThread && (
          <div className="flex flex-1 flex-col">
            <div className="border-b border-slate-200 p-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedThread(null)}
                className="mb-4"
              >
                ← Back to Orders
              </Button>
              <h2 className="text-xl font-semibold text-slate-900">
                Email Thread
              </h2>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {(threadMessages.data?.messages ?? []).map((m: any) => (
                  <Card key={m.id} className="border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        variant={
                          m.direction === 'INBOUND' ? 'default' : 'secondary'
                        }
                      >
                        {m.direction}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mb-2 text-xs text-slate-600">
                      <strong>From:</strong> {m.from} → <strong>To:</strong>{' '}
                      {m.to}
                    </div>
                    <Separator className="my-3" />
                    <div className="whitespace-pre-wrap text-sm text-slate-800">
                      {m.body}
                    </div>
                    {m.aiSuggestion && (
                      <div className="mt-4 rounded-lg bg-violet-50 p-3">
                        <div className="mb-1 flex items-center text-xs font-semibold text-violet-900">
                          <Sparkles className="mr-1 h-3 w-3" />
                          AI Suggestion
                        </div>
                        <p className="text-sm text-slate-700">
                          {m.aiSuggestion.reply}
                        </p>
                        <p className="mt-2 text-xs text-violet-600">
                          Action: {m.aiSuggestion.proposedAction} • Confidence:{' '}
                          {m.aiSuggestion.confidence}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </section>

      {/* Right Sidebar - Messages & Unassigned */}
      <section className="flex w-96 flex-col border-l border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {selected ? 'Email Matches' : 'Unassigned Emails'}
          </h3>
        </div>

        <ScrollArea className="flex-1">
          {selected && (
            <div className="p-4">
              {(messages.data?.messages ?? []).length === 0 && (
                <Card className="border-slate-200 p-4 text-center">
                  <Mail className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    No emails mapped to this order
                  </p>
                </Card>
              )}
              <div className="space-y-3">
                {(messages.data?.messages ?? []).map((m: any) => (
                  <Card key={m.id} className="border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        variant={
                          m.direction === 'INBOUND' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {m.direction}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {m.from.split('@')[0]}@...
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-800">
                      {m.body}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!selected && (
            <div className="p-4">
              {unassigned.isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                    <p className="text-sm text-slate-600">
                      Loading unassigned emails...
                    </p>
                  </div>
                </div>
              ) : (unassigned.data?.messages ?? []).length === 0 ? (
                <Card className="border-slate-200 p-4 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm text-slate-600">
                    All emails are mapped!
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(unassigned.data?.messages ?? []).map((m: any) => (
                    <Card
                      key={m.id}
                      className="border-amber-200 bg-amber-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-slate-500">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mb-2 text-xs font-semibold text-slate-900">
                        From: {m.from}
                      </p>
                      <div className="mb-3 rounded bg-white/80 p-3">
                        <p className="text-xs font-medium text-slate-600 mb-1">
                          Customer Message:
                        </p>
                        <p className="text-sm text-slate-700">{m.body}</p>
                      </div>
                      {m.aiSuggestion && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-violet-700">
                              <Sparkles className="mr-1 inline h-3 w-3" />
                              AI Suggestion: {m.aiSuggestion.proposedAction}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {(m.aiSuggestion.confidence * 100).toFixed(0)}%
                              confidence
                            </Badge>
                          </div>
                          <div className="rounded bg-white p-3 border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-2">
                              AI Reply:
                            </p>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap">
                              {m.aiSuggestion.reply}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-violet-600 hover:bg-violet-700"
                            disabled={sendUnassignedReply.isLoading}
                            onClick={async () => {
                              try {
                                const result =
                                  await sendUnassignedReply.mutateAsync({
                                    messageId: m.id,
                                    replyBody: m.aiSuggestion.reply,
                                  });
                                if (result.ok) {
                                  alert(
                                    (result as any).stub
                                      ? 'Reply logged (Mailgun not configured)'
                                      : 'Reply sent successfully!',
                                  );
                                } else {
                                  alert(
                                    `Failed to send: ${(result as any).error}`,
                                  );
                                }
                              } catch (error: any) {
                                alert(`Error: ${error.message}`);
                              }
                            }}
                          >
                            <Send className="mr-2 h-3 w-3" />
                            {sendUnassignedReply.isLoading
                              ? 'Sending...'
                              : 'Send AI Reply'}
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </section>
    </main>
  );
}
