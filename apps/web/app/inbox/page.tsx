'use client';
import { trpc } from '../../lib/trpc';
import { useEffect, useMemo, useState } from 'react';

type OrderSummary = {
  id: string;
  name: string;
  email?: string;
  totalPrice: string;
  createdAt: string;
};
type LineItem = { id: string; title: string; quantity: number; price: string };

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

  return (
    <main className="grid h-[calc(100dvh-0px)] grid-cols-12">
      <section className="col-span-4 border-r p-4">
        <h2 className="mb-2 font-semibold">Recent orders</h2>
        {!shop && (
          <div className="text-sm text-gray-600">
            Add ?shop=your-shop.myshopify.com to the URL to load orders.
          </div>
        )}
        <ul className="space-y-2">
          {orders.length === 0 && shop && (
            <li className="text-sm text-gray-500">No orders found.</li>
          )}
          {dbOrders.data?.orders?.length
            ? dbOrders.data.orders.map((o) => (
                <li
                  key={o.id}
                  className={`rounded border p-3 cursor-pointer ${selected === o.shopifyId ? 'ring-2 ring-indigo-500' : ''}`}
                  onClick={() => setSelected(o.shopifyId)}
                >
                  <div className="text-sm font-medium">
                    Shopify #{o.shopifyId}
                  </div>
                  <div className="text-xs text-gray-600">{o.email ?? '—'}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {(o.totalAmount / 100).toFixed(2)} • {o.status}
                  </div>
                </li>
              ))
            : null}
          {orders.map((o) => (
            <li
              key={o.id}
              className={`rounded border p-3 cursor-pointer ${selected === o.id ? 'ring-2 ring-indigo-500' : ''}`}
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
      </section>
      <section className="col-span-8 p-4">
        <h2 className="mb-2 font-semibold">Details</h2>
        {!selected && (
          <div className="text-sm text-gray-600">
            Select an order to view details, AI suggestions, and actions.
          </div>
        )}
        {selected && orderDetail.data?.order && (
          <div className="space-y-3">
            <div className="rounded border p-3">
              <div className="text-sm font-medium">
                {orderDetail.data.order.name} •{' '}
                {orderDetail.data.order.totalPrice}
              </div>
              <div className="text-xs text-gray-600">
                {orderDetail.data.order.email ?? '—'}
              </div>
              <ul className="mt-2 text-xs text-gray-700 list-disc pl-4">
                {orderDetail.data.order.lineItems.map((li: LineItem) => (
                  <li key={li.id}>
                    {li.quantity} × {li.title} — {li.price}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded border p-3 space-y-2">
              <div className="text-sm font-medium">AI Suggestion</div>
              <button
                className="rounded bg-black px-3 py-1.5 text-sm text-white"
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
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded border p-2 text-sm"
                rows={6}
                placeholder="AI draft will appear here..."
              />
              <div className="flex gap-2">
                <button
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
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
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
