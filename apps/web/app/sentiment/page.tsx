'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  Heart,
  Mail,
  ShoppingBag,
  RotateCcw,
  Activity,
  BarChart3,
  Users,
  MessageSquare,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

export default function SentimentPage() {
  const [days, setDays] = useState(30);
  const [selectedShop, setSelectedShop] = useState<string>('');

  const connections = trpc.connections.useQuery();
  const sentiment = trpc.getSentimentAnalytics.useQuery(
    {
      shop: selectedShop || undefined,
      days,
    },
    {
      refetchInterval: 60000, // Refetch every minute
    },
  );

  const shopifyStores =
    connections.data?.connections.filter((c: any) => c.type === 'SHOPIFY') ||
    [];

  if (sentiment.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Heart className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Customer Sentiment
              </h1>
              <p className="text-sm text-slate-500">
                Track customer satisfaction and sentiment trends
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

  const data = sentiment.data || {
    overallScore: 0,
    positivePercent: 0,
    negativePercent: 0,
    neutralPercent: 0,
    frustratedPercent: 0,
    angryPercent: 0,
    sentimentTrend: 'stable' as const,
    bySource: {
      email: { count: 0, avgScore: 0 },
      order: { count: 0, avgScore: 0 },
      return_request: { count: 0, avgScore: 0 },
    },
    distribution: {
      positive: 0,
      neutral: 0,
      negative: 0,
      frustrated: 0,
      angry: 0,
    },
    trends: [],
    topCustomers: [],
    topIssues: [],
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return 'Positive';
    if (score >= 50) return 'Neutral';
    if (score >= 30) return 'Negative';
    return 'Very Negative';
  };

  const statCards = [
    {
      title: 'Overall Sentiment',
      value: `${data.overallScore}`,
      label: getSentimentLabel(data.overallScore),
      change:
        data.sentimentTrend === 'improving'
          ? 'Trending up'
          : data.sentimentTrend === 'declining'
            ? 'Trending down'
            : 'Stable',
      subtext: `${days} day period`,
      icon: Heart,
      color: getSentimentColor(data.overallScore),
      trend: data.sentimentTrend,
    },
    {
      title: 'Positive Sentiment',
      value: `${data.positivePercent}%`,
      change: `${data.distribution.positive} interactions`,
      subtext: 'Happy & satisfied',
      icon: Smile,
      color: 'text-emerald-600',
      trend: 'up' as const,
    },
    {
      title: 'Negative Sentiment',
      value: `${data.negativePercent}%`,
      change: `${data.distribution.negative + data.distribution.frustrated + data.distribution.angry} interactions`,
      subtext: 'Unhappy, frustrated, or angry',
      icon: Frown,
      color: 'text-red-600',
      trend: 'down' as const,
    },
    {
      title: 'Neutral Sentiment',
      value: `${data.neutralPercent}%`,
      change: `${data.distribution.neutral} interactions`,
      subtext: 'Factual & informational',
      icon: Meh,
      color: 'text-slate-600',
      trend: 'stable' as const,
    },
  ];

  const totalInteractions =
    data.distribution.positive +
    data.distribution.neutral +
    data.distribution.negative +
    data.distribution.frustrated +
    data.distribution.angry;

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Heart className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Customer Sentiment
              </h1>
              <p className="text-sm text-slate-500">
                Track customer satisfaction and sentiment trends
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {shopifyStores.length > 1 && (
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">All Stores</option>
                {shopifyStores.map((store: any) => (
                  <option key={store.id} value={store.shopDomain}>
                    {store.shopDomain}
                  </option>
                ))}
              </select>
            )}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Badge className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              <Activity className="h-4 w-4" />
              Live Data
            </Badge>
          </div>
        </header>

        {totalInteractions === 0 ? (
          <Card className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Heart className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900">
              No sentiment data yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Sentiment analysis will appear here as customers interact with
              your store through emails, orders, and return requests.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                const TrendIcon =
                  stat.trend === 'up' || stat.trend === 'improving'
                    ? TrendingUp
                    : stat.trend === 'down' || stat.trend === 'declining'
                      ? TrendingDown
                      : Activity;
                return (
                  <Card
                    key={stat.title}
                    className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {stat.title}
                        </p>
                        <p
                          className={`text-3xl font-bold ${stat.color || 'text-slate-900'}`}
                        >
                          {stat.value}
                        </p>
                        {stat.label && (
                          <p className="text-xs font-semibold text-slate-600">
                            {stat.label}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-slate-600">
                          {stat.change}
                        </p>
                        <p className="text-xs text-slate-400">{stat.subtext}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-full bg-slate-100 p-2">
                          <Icon className={`h-5 w-5 ${stat.color || 'text-slate-700'}`} />
                        </div>
                        <TrendIcon
                          className={`h-4 w-4 ${
                            stat.trend === 'up' || stat.trend === 'improving'
                              ? 'text-emerald-500'
                              : stat.trend === 'down' || stat.trend === 'declining'
                                ? 'text-red-500'
                                : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
              <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Sentiment Distribution
                    </h2>
                    <p className="text-sm text-slate-500">
                      Breakdown of customer sentiment types
                    </p>
                  </div>
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {totalInteractions} total
                  </Badge>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Positive',
                      count: data.distribution.positive,
                      percent: data.positivePercent,
                      color: 'bg-emerald-500',
                      icon: Smile,
                    },
                    {
                      label: 'Neutral',
                      count: data.distribution.neutral,
                      percent: data.neutralPercent,
                      color: 'bg-slate-400',
                      icon: Meh,
                    },
                    {
                      label: 'Negative',
                      count: data.distribution.negative,
                      percent: Math.round(
                        (data.distribution.negative / totalInteractions) * 100,
                      ),
                      color: 'bg-orange-500',
                      icon: Frown,
                    },
                    {
                      label: 'Frustrated',
                      count: data.distribution.frustrated,
                      percent: data.frustratedPercent,
                      color: 'bg-amber-500',
                      icon: AlertCircle,
                    },
                    {
                      label: 'Angry',
                      count: data.distribution.angry,
                      percent: data.angryPercent,
                      color: 'bg-red-500',
                      icon: AlertCircle,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="flex w-24 items-center gap-2 text-sm font-semibold text-slate-600">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </div>
                        <div className="flex-1">
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full ${item.color} transition-all`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right text-sm font-semibold text-slate-700">
                          {item.count} ({item.percent}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Sentiment by Source
                    </h2>
                    <p className="text-sm text-slate-500">
                      Where customer sentiment comes from
                    </p>
                  </div>
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Sources
                  </Badge>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Email Messages',
                      count: data.bySource.email.count,
                      avgScore: Math.round(
                        ((data.bySource.email.avgScore + 1) / 2) * 100,
                      ),
                      icon: Mail,
                      color: 'text-blue-600',
                    },
                    {
                      label: 'Orders with Issues',
                      count: data.bySource.order.count,
                      avgScore: Math.round(
                        ((data.bySource.order.avgScore + 1) / 2) * 100,
                      ),
                      icon: ShoppingBag,
                      color: 'text-orange-600',
                    },
                    {
                      label: 'Return Requests',
                      count: data.bySource.return_request.count,
                      avgScore: Math.round(
                        ((data.bySource.return_request.avgScore + 1) / 2) *
                          100,
                      ),
                      icon: RotateCcw,
                      color: 'text-red-600',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-white p-2">
                            <Icon className={`h-5 w-5 ${item.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.label}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.count} interactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${getSentimentColor(item.avgScore)}`}
                          >
                            {item.avgScore}
                          </p>
                          <p className="text-xs text-slate-500">Avg Score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Sentiment Trend
                  </h2>
                  <p className="text-sm text-slate-500">
                    Daily sentiment score over time
                  </p>
                </div>
                <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {days} days
                </Badge>
              </div>
              <div className="space-y-3">
                {data.trends.length > 0 ? (
                  data.trends.map((day, index) => {
                    const maxScore = 100;
                    const percentage = (day.score / maxScore) * 100;
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
                        <div className="w-24 text-sm font-semibold text-slate-600">
                          {dayName}
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {dateStr}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full transition-all ${getSentimentColor(day.score).replace('text-', 'bg-')}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right">
                          <p
                            className={`text-sm font-semibold ${getSentimentColor(day.score)}`}
                          >
                            {day.score}
                          </p>
                          <p className="text-xs text-slate-400">
                            {day.count} interactions
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No trend data available
                  </p>
                )}
              </div>
            </Card>

            {data.topCustomers.length > 0 && (
              <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Customers Needing Attention
                    </h2>
                    <p className="text-sm text-slate-500">
                      Customers with lowest sentiment scores
                    </p>
                  </div>
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                    <Users className="mr-2 h-4 w-4" />
                    Top 10
                  </Badge>
                </div>
                <div className="space-y-2">
                  {data.topCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {customer.email}
                          </p>
                          <p className="text-xs text-slate-500">
                            {customer.count} interactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${getSentimentColor(customer.avgScore)}`}
                        >
                          {customer.avgScore}
                        </p>
                        <p className="text-xs text-slate-500">Avg Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {data.topIssues.length > 0 && (
              <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Top Issues & Complaints
                    </h2>
                    <p className="text-sm text-slate-500">
                      Most common topics from negative sentiment
                    </p>
                  </div>
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Issues
                  </Badge>
                </div>
                <div className="space-y-2">
                  {data.topIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
                          {index + 1}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {issue.topic}
                        </p>
                      </div>
                      <Badge className="border border-red-200 bg-red-50 text-red-700">
                        {issue.count} occurrences
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
