'use client';
import { trpc } from '../../lib/trpc';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { ScrollArea } from '../../../../@ai-ecom/api/components/ui/scroll-area';
import { Separator } from '../../../../@ai-ecom/api/components/ui/separator';

type OrderSummary = {
  id: string;
  name: string;
  email?: string;
  totalPrice: string;
  createdAt: string;
};
type LineItem = { id: string; title: string; quantity: number; price: string };
type DbOrder = {
  id: string;
  shopifyId: string;
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

  const orders = useMemo<OrderSummary[]>(
    () => (data?.orders ?? []) as OrderSummary[],
    [data],
  );
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

  // Email threads (not tied to a selected order)
  const emailThreads = trpc.threadsList.useQuery({ take: 30 });
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const threadMessages = trpc.threadMessages.useQuery(
    { threadId: selectedThread || '' },
    { enabled: !!selectedThread },
  );

  return (
    <main className="grid h-[calc(100dvh-0px)] grid-cols-12 bg-gradient-to-b from-white via-indigo-50/30 to-fuchsia-50/30">
      <section className="col-span-3 border-r bg-white/90 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-sm font-semibold text-transparent">
            Orders
          </h2>
          <Button variant="secondary" onClick={() => setSelectedThread(null)}>
            Email
          </Button>
        </div>
        {!shop && (
          <Card className="mt-3 border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Add ?shop=your-shop.myshopify.com to the URL to load orders.
          </Card>
        )}
        {dbOrders.data?.orders?.length ? (
          <ScrollArea className="mt-3 h-[calc(100dvh-120px)] rounded border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(dbOrders.data.orders as DbOrder[]).map((o) => (
                  <tr
                    key={o.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selected === o.shopifyId ? 'bg-indigo-50' : ''}`}
                    onClick={() => setSelected(o.shopifyId)}
                  >
                    <td className="px-3 py-2 text-gray-900">#{o.shopifyId}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {o.email ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {(o.totalAmount / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={`${o.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-700' : o.status === 'REFUNDED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {o.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        ) : (
          <ul className="space-y-2">
            {orders.length === 0 && shop && (
              <li className="text-sm text-gray-500">No orders found.</li>
            )}
            {orders.map((o) => (
              <li
                key={o.id}
                className={`cursor-pointer rounded border p-3 ${selected === o.id ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => setSelected(o.id)}
              >
                <div className="text-sm font-medium">{o.name}</div>
                <div className="text-xs text-gray-600">{o.email ?? '—'}</div>
                <div className="mt-1 text-xs text-gray-600">
                  {o.totalPrice} • {new Date(o.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="col-span-5 border-r bg-white/90 p-4 backdrop-blur">
        <h2 className="mb-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-sm font-semibold text-transparent">
          {selectedThread ? 'Thread' : 'Order details'}
        </h2>
        {!selected && !selectedThread && (
          <div className="text-sm text-white/60">
            Select an order to view details, AI suggestions, and actions.
          </div>
        )}
        {selected && !selectedThread && orderDetail.data?.order && (
          <div className="space-y-3">
            <Card className="p-3">
              <div className="text-sm font-medium">
                {orderDetail.data.order.name} •{' '}
                {orderDetail.data.order.totalPrice}
              </div>
              <div className="text-xs text-white/60">
                {orderDetail.data.order.email ?? '—'}
              </div>
              <ul className="mt-2 list-disc pl-4 text-xs text-white/80">
                {orderDetail.data.order.lineItems.map((li: LineItem) => (
                  <li key={li.id}>
                    {li.quantity} × {li.title} — {li.price}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="space-y-2 p-3">
              <div className="text-sm font-medium">AI Suggestion</div>
              <Button
                onClick={() => {
                  const o = orderDetail.data?.order;
                  if (!o) return;
                  suggest.mutate({
                    customerMessage: 'Customer asked about order status',
                    orderSummary: `${o.name} ${o.totalPrice}`,
                    tone: 'friendly',
                  });
                }}
              >
                Suggest reply
              </Button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded border border-white/20 bg-black/40 p-2 text-sm text-white placeholder-white/40"
                rows={6}
                placeholder="AI draft will appear here..."
              />
              <div className="flex gap-2">
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
                    await approveSend.mutateAsync({
                      actionId: res.actionId,
                      to: o.email ?? 'customer@example.com',
                      subject: `Re: ${o.name}`,
                      body: draft,
                    });
                    alert('Approved & (stub) sent');
                  }}
                >
                  Approve & Send (stub)
                </Button>
              </div>
            </Card>
          </div>
        )}
      </section>
      <section className="col-span-4 bg-white/90 p-4 backdrop-blur">
        <h2 className="mb-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-sm font-semibold text-transparent">
          {selectedThread ? 'Messages' : 'Email matches'}
        </h2>
        {!selected && !selectedThread && (
          <div className="text-sm text-gray-600">
            Select an order to view messages.
          </div>
        )}
        {selected && !selectedThread && (
          <ScrollArea className="h-[calc(100dvh-120px)]">
            <div className="space-y-2 text-sm">
              {(messages.data?.messages ?? []).length === 0 && (
                <Card className="p-3 text-gray-500">No related messages.</Card>
              )}
              {(messages.data?.messages ?? []).map((m) => (
                <Card key={m.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-gray-500">
                      {m.direction}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(m.createdAt as any).toLocaleString()}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="text-xs text-gray-600">
                    {m.from} → {m.to}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                    {m.body}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Threads view */}
        {!selected && (
          <ScrollArea className="h-[calc(100dvh-120px)]">
            <div className="space-y-2 text-sm">
              {(emailThreads.data?.threads ?? []).length === 0 && (
                <Card className="p-3 text-gray-500">No threads yet.</Card>
              )}
              {(emailThreads.data?.threads ?? []).map((t: any) => (
                <Card
                  key={t.id}
                  className={`cursor-pointer p-3 ${selectedThread === t.id ? 'ring-2 ring-indigo-500' : ''}`}
                  onClick={() => setSelectedThread(t.id)}
                >
                  <div className="text-sm font-medium">
                    {t.subject ?? '(no subject)'}
                  </div>
                  <div className="text-xs text-gray-600">{t.customerEmail}</div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Thread messages */}
        {selectedThread && (
          <ScrollArea className="h-[calc(100dvh-120px)]">
            <div className="space-y-2 text-sm">
              {(threadMessages.data?.messages ?? []).length === 0 && (
                <Card className="p-3 text-gray-500">
                  No messages in this thread.
                </Card>
              )}
              {(threadMessages.data?.messages ?? []).map((m: any) => (
                <Card key={m.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-gray-500">
                      {m.direction}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(m.createdAt as any).toLocaleString()}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="text-xs text-gray-600">
                    {m.from} → {m.to}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                    {m.body}
                  </div>
                  {m.aiSuggestion && (
                    <div className="mt-3 rounded border bg-gray-50 p-2 text-xs">
                      <div className="font-semibold">AI Suggestion</div>
                      <div className="mt-1 whitespace-pre-wrap">
                        {m.aiSuggestion.reply}
                      </div>
                      <div className="mt-1 text-gray-600">
                        Action: {m.aiSuggestion.proposedAction} • Confidence:{' '}
                        {m.aiSuggestion.confidence}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </section>
    </main>
  );
}
