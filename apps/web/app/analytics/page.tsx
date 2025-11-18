'use client';

import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import AISuggestionBox from '../components/AISuggestionBox';
import {
  TrendingUp,
  Mail,
  CheckCircle,
  Clock,
  Sparkles,
  Users,
  DollarSign,
  Activity,
  Target,
  Zap,
  BarChart3,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

export default function AnalyticsPage() {
  const analytics = trpc.getAnalytics.useQuery();
  const connections = trpc.connections.useQuery();
  const gaData = trpc.getGoogleAnalyticsData.useQuery(
    {},
    {
      enabled: !!connections.data?.connections.find((c: any) => c.type === 'GOOGLE_ANALYTICS'),
    },
  );

  if (analytics.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Activity className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">
                Track your support performance and AI insights
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
    totalEmails: 0,
    emailsThisWeek: 0,
    emailsThisMonth: 0,
    averageResponseTime: 0,
    aiSuggestionAccuracy: 0,
    aiSuggestionsTotal: 0,
    totalOrders: 0,
    mappedEmails: 0,
    unmappedEmails: 0,
    actionsTaken: 0,
    actionsThisWeek: 0,
    customerSatisfactionScore: 0,
    volumeTrend: [],
  };

  const statCards = [
    {
      title: 'Total Emails',
      value: stats.totalEmails.toLocaleString(),
      change: `+${stats.emailsThisWeek} this week`,
      subtext: `${stats.emailsThisMonth} this month`,
      icon: Mail,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      textColor: 'text-blue-600',
      trend: 'up',
    },
    {
      title: 'Avg Response Time',
      value:
        stats.averageResponseTime != null && stats.averageResponseTime > 0
          ? stats.averageResponseTime < 60
            ? `${stats.averageResponseTime}m`
            : `${(stats.averageResponseTime / 60).toFixed(1)}h`
          : 'N/A',
      change: 'Time to first action',
      subtext: 'Industry avg: 2-4 hours',
      icon: Clock,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'from-emerald-50 to-green-50',
      textColor: 'text-emerald-600',
      trend: 'down',
    },
    {
      title: 'AI Accuracy',
      value: `${((stats.aiSuggestionAccuracy || 0) * 100).toFixed(0)}%`,
      change: `${stats.actionsTaken} actions taken`,
      subtext: `${stats.aiSuggestionsTotal} suggestions made`,
      icon: Sparkles,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'from-violet-50 to-purple-50',
      textColor: 'text-violet-600',
      trend: 'up',
    },
    {
      title: 'Customer Satisfaction',
      value: `${stats.customerSatisfactionScore.toFixed(0)}%`,
      change: 'Based on action types',
      subtext: 'Refunds, replacements, etc.',
      icon: Target,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-50 to-orange-50',
      textColor: 'text-amber-600',
      trend: 'up',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Activity className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                AI Support Analytics
              </h1>
              <p className="text-sm text-slate-500">
                Track performance, ROI, and AI insights
              </p>
            </div>
          </div>
          <Badge className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
            <Activity className="h-4 w-4" />
            Live Data
          </Badge>
        </header>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <AISuggestionBox />
        </Card>

        <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
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
                    <p className="text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {stat.change}
                    </p>
                    <p className="text-xs text-slate-400">{stat.subtext}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="rounded-full bg-slate-100 p-2">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <TrendIcon
                      className={`h-4 w-4 ${
                        stat.trend === 'up'
                          ? 'text-emerald-500'
                          : 'text-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Email volume trend
              </h2>
              <p className="text-sm text-slate-500">
                Last 7 days of inbound email activity
              </p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trend
            </Badge>
          </div>
          <div className="space-y-3">
            {stats.volumeTrend.map((day, index) => {
              const maxCount = Math.max(
                ...stats.volumeTrend.map((d) => d.count),
              );
              const percentage =
                maxCount > 0 ? (day.count / maxCount) * 100 : 0;
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
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-slate-700">
                    {day.count}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-3 grid-cols-1">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <CheckCircle className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Email mapping
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify_between">
                <span>Mapped to orders</span>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                  {stats.mappedEmails.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify_between">
                <span>Unmapped conversations</span>
                <Badge className="border border-amber-200 bg-amber-50 text-amber-600">
                  {stats.unmappedEmails.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify_between font-semibold">
                <span>Success rate</span>
                <Badge className="border border-indigo-200 bg-indigo-50 text-indigo-600">
                  {stats.totalEmails > 0
                    ? `${((stats.mappedEmails / stats.totalEmails) * 100).toFixed(1)}%`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Sparkles className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                AI automation
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify_between">
                <span>Suggestions made</span>
                <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                  {stats.aiSuggestionsTotal.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify_between">
                <span>Actions taken</span>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                  {stats.actionsTaken.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify_between font-semibold">
                <span>This week</span>
                <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                  +{stats.actionsThisWeek.toLocaleString()}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items_center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Zap className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                ROI impact
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify_between">
                <span>Total orders</span>
                <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                  {stats.totalOrders.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify_between">
                <span>Automation rate</span>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                  {stats.totalEmails > 0
                    ? `${((stats.actionsTaken / stats.totalEmails) * 100).toFixed(0)}%`
                    : 'N/A'}
                </Badge>
              </div>
              <div className="flex items-center justify_between font-semibold">
                <span>Time saved</span>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                  {stats.actionsTaken > 0
                    ? `~${Math.round(stats.actionsTaken * 5)}m`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {gaData.data && (
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Google Analytics Summary
                </h2>
                <p className="text-sm text-slate-500">
                  Website traffic overview (last 7 days)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  GA4 Data
                </Badge>
                <a
                  href="/google-analytics"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                >
                  View Full Analytics
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4 grid-cols-1">
              <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sessions
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {gaData.data.sessions.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total sessions
                </p>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Users
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {gaData.data.users.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Unique visitors
                </p>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Page Views
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {gaData.data.pageViews.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total views
                </p>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bounce Rate
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {(gaData.data.bounceRate * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Single-page sessions
                </p>
              </Card>
            </div>
          </Card>
        )}

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Return on investment
              </h2>
              <p className="text-sm text-slate-500">
                Demonstrate value to your merchants and stakeholders
              </p>
            </div>
            <Badge className="border border-slate-200 bg-slate-100 text-slate-600">
              <DollarSign className="mr-2 h-4 w-4" />
              ROI summary
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-4 grid-cols-1">
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Emails processed
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.totalEmails.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                +{stats.emailsThisWeek} this week
              </p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions automated
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.actionsTaken.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stats.totalEmails > 0
                  ? `${((stats.actionsTaken / stats.totalEmails) * 100).toFixed(0)}% automation rate`
                  : 'Getting started'}
              </p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Time saved
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.actionsTaken > 0
                  ? `${Math.round(stats.actionsTaken * 5)}`
                  : '0'}
                <span className="ml-1 text-lg text-slate-500">m</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ~5 min per automated action
              </p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer satisfaction
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.customerSatisfactionScore.toFixed(0)}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Based on action types
              </p>
            </Card>
          </div>
        </Card>
      </div>
    </main>
  );
}
