'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import AISuggestionBox from '../components/AISuggestionBox';
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowRight,
  Store,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

function ShopifyAnalyticsInner() {
  const sp = useSearchParams();
  const shop = sp.get('shop');
  const [selectedShop, setSelectedShop] = useState(shop || '');

  const connections = trpc.connections.useQuery();
  const analytics = trpc.getShopifyAnalytics.useQuery(
    { shop: selectedShop },
    { enabled: !!selectedShop },
  );

  const shopifyStores =
    connections.data?.connections.filter((c: any) => c.type === 'SHOPIFY') ||
    [];

  // Auto-select first store if none selected
  if (!selectedShop && shopifyStores.length > 0) {
    const firstStoreDomain = shopifyStores[0].shopDomain;
    if (firstStoreDomain) {
      setSelectedShop(firstStoreDomain);
    }
  }

  if (!selectedShop) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Store className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No Shopify store connected
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Connect your Shopify store from the integrations page to unlock revenue and customer analytics.
            </p>
            <a
              href="/integrations"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Go to Integrations
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  if (analytics.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Store className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Shopify Business Analytics
              </h1>
              <p className="text-sm text-slate-500">
                Sales, orders, and customer insights
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const stats = analytics.data || {
    totalOrders: 0,
    ordersThisWeek: 0,
    ordersThisMonth: 0,
    totalRevenue: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    averageOrderValue: 0,
    currency: 'USD',
    totalCustomers: 0,
    newCustomersThisWeek: 0,
    ordersFulfilled: 0,
    ordersPending: 0,
    topProducts: [],
    revenueTrend: [],
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `${stats.currency} ${stats.totalRevenue.toLocaleString()}`,
      change: `+${stats.currency} ${stats.revenueThisWeek.toLocaleString()} this week`,
      subtext: `${stats.currency} ${stats.revenueThisMonth.toLocaleString()} this month`,
      icon: DollarSign,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'from-emerald-50 to-green-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      change: `+${stats.ordersThisWeek} this week`,
      subtext: `${stats.ordersThisMonth} this month`,
      icon: ShoppingBag,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Avg Order Value',
      value: `${stats.currency} ${stats.averageOrderValue.toLocaleString()}`,
      change: 'Per order average',
      subtext: `${stats.totalOrders} orders total`,
      icon: BarChart3,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'from-violet-50 to-purple-50',
      textColor: 'text-violet-600',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      change: `+${stats.newCustomersThisWeek} this week`,
      subtext: 'Unique customers',
      icon: Users,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-50 to-orange-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Store className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Shopify Business Analytics
              </h1>
              <p className="text-sm text-slate-500">
                Sales, orders, and customer insights
              </p>
            </div>
          </div>
          {shopifyStores.length > 1 && (
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {shopifyStores.map((store: any) => (
                <option key={store.id} value={store.shopDomain}>
                  {store.shopDomain}
                </option>
              ))}
            </select>
          )}
        </header>

        <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          <Store className="h-4 w-4" />
          {selectedShop}
        </Badge>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <AISuggestionBox shop={selectedShop} />
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 grid-cols-1">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {stat.change}
                    </p>
                    <p className="text-xs text-slate-400">{stat.subtext}</p>
                  </div>
                  <div className="rounded-full bg-slate-100 p-2">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Revenue trend</h2>
              <p className="text-sm text-slate-500">Last 7 days of sales performance</p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trend
            </Badge>
          </div>
          <div className="space-y-3">
            {stats.revenueTrend.map((day, index) => {
              const maxRevenue = Math.max(...stats.revenueTrend.map((d) => d.revenue));
              const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-semibold text-slate-600">
                    {dayName}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {dateStr}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-28 text-right text-sm font-semibold text-slate-700">
                    {stats.currency} {day.revenue.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Package className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Order status</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Fulfilled</span>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {stats.ordersFulfilled.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Pending</span>
                <Badge className="border border-amber-200 bg-amber-50 text-amber-600">
                  <Clock className="mr-1 h-3 w-3" />
                  {stats.ordersPending.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Fulfillment rate</span>
                <Badge className="border border-blue-200 bg-blue-50 text-blue-600">
                  {stats.totalOrders > 0
                    ? `${((stats.ordersFulfilled / stats.totalOrders) * 100).toFixed(0)}%`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <TrendingUp className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Top products</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.topProducts.length === 0 ? (
                <p className="text-slate-500">No product data available yet</p>
              ) : (
                stats.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span>{product.name}</span>
                    </div>
                    <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                      {product.count} orders
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Business overview</h2>
              <p className="text-sm text-slate-500">
                Key performance indicators for {selectedShop}
              </p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
              <DollarSign className="mr-2 h-4 w-4" />
              Monthly summary
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-4 grid-cols-1">
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Monthly revenue
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.currency} {stats.revenueThisMonth.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stats.ordersThisMonth} orders
              </p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Avg order value
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.currency} {stats.averageOrderValue.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Per order average</p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customers
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.totalCustomers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                +{stats.newCustomersThisWeek} this week
              </p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Growth rate
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.ordersThisMonth > 0 && stats.totalOrders > 0
                  ? `${((stats.ordersThisMonth / stats.totalOrders) * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Monthly growth</p>
            </Card>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function ShopifyAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </main>
      }
    >
      <ShopifyAnalyticsInner />
    </Suspense>
  );
}
