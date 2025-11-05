'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
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
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
        <Card className="max-w-md p-8 text-center">
          <Store className="mx-auto h-16 w-16 text-slate-400" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            No Shopify Store Connected
          </h2>
          <p className="mt-2 text-slate-600">
            Connect a Shopify store from the integrations page to view
            analytics.
          </p>
          <a
            href="/integrations"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-3 font-semibold text-white transition-all hover:from-emerald-700 hover:to-cyan-700"
          >
            Go to Integrations
            <ArrowRight className="h-4 w-4" />
          </a>
        </Card>
      </main>
    );
  }

  if (analytics.isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Shopify Analytics
            </h1>
            <p className="mt-2 text-slate-600">Loading store data...</p>
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/50 p-6 pt-20">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-4xl font-bold text-transparent">
              Shopify Business Analytics
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              Sales, orders, and customer insights
            </p>
          </div>
          {shopifyStores.length > 1 && (
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:border-emerald-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {shopifyStores.map((store: any) => (
                <option key={store.id} value={store.shopDomain}>
                  {store.shopDomain}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Current Store Badge */}
        <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
          <Store className="mr-1 h-4 w-4" />
          {selectedShop}
        </Badge>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={`border-none bg-gradient-to-br ${stat.bgColor} p-6 shadow-sm transition-all hover:shadow-lg hover:scale-105`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${stat.textColor}`}>
                        {stat.title}
                      </p>
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      {stat.change}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {stat.subtext}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl bg-gradient-to-br ${stat.color} p-3 shadow-md`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Revenue Trend Chart */}
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Revenue Trend
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Last 7 days of sales performance
              </p>
            </div>
            <BarChart3 className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="space-y-3">
            {stats.revenueTrend.map((day, index) => {
              const maxRevenue = Math.max(
                ...stats.revenueTrend.map((d) => d.revenue),
              );
              const percentage =
                maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', {
                weekday: 'short',
              });
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-700">
                    {dayName}
                    <span className="ml-1 text-xs text-slate-500">
                      {dateStr}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right text-sm font-semibold text-slate-900">
                    {stats.currency} {day.revenue.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Order Status */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Order Status
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Fulfilled</span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {stats.ordersFulfilled.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Pending</span>
                <Badge className="bg-amber-100 text-amber-700">
                  <Clock className="mr-1 h-3 w-3" />
                  {stats.ordersPending.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  Fulfillment Rate
                </span>
                <Badge className="bg-blue-100 text-blue-700">
                  {stats.totalOrders > 0
                    ? `${((stats.ordersFulfilled / stats.totalOrders) * 100).toFixed(0)}%`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Top Products */}
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Top Products
              </h2>
            </div>
            <div className="space-y-3">
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No product data available yet
                </p>
              ) : (
                stats.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full bg-violet-200 text-violet-700">
                        {index + 1}
                      </Badge>
                      <span className="text-sm text-slate-700">
                        {product.name}
                      </span>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700">
                      {product.count} orders
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Business Summary */}
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 p-4 shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Business Overview
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Key performance indicators for {selectedShop}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Monthly Revenue
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.currency} {stats.revenueThisMonth.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {stats.ordersThisMonth} orders
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                AOV
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.currency} {stats.averageOrderValue.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-600">Average order value</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                Customers
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.totalCustomers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                +{stats.newCustomersThisWeek} this week
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                Growth Rate
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.ordersThisMonth > 0 && stats.totalOrders > 0
                  ? `${((stats.ordersThisMonth / stats.totalOrders) * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-600">Monthly growth</p>
            </div>
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
