'use client';

import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
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
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';

export default function AnalyticsPage() {
  const analytics = trpc.getAnalytics.useQuery();

  if (analytics.isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
            <p className="mt-2 text-slate-600">
              Track your support performance and AI insights
            </p>
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
        stats.averageResponseTime > 0
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
              AI Support Analytics
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              Track performance, ROI, and AI insights
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">
            <Activity className="mr-1 h-4 w-4" />
            Live Data
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
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
                      <TrendIcon
                        className={`h-3 w-3 ${
                          stat.trend === 'up'
                            ? 'text-emerald-600'
                            : 'text-blue-600'
                        }`}
                      />
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

        {/* Email Volume Trend Chart */}
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Email Volume Trend
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Last 7 days of inbound email activity
              </p>
            </div>
            <BarChart3 className="h-6 w-6 text-indigo-500" />
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
                  <div className="w-20 text-sm font-medium text-slate-700">
                    {dayName}
                    <span className="ml-1 text-xs text-slate-500">
                      {dateStr}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-slate-900">
                    {day.count}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Email Mapping */}
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 p-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Email Mapping
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Mapped to Orders</span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {stats.mappedEmails.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Unmapped</span>
                <Badge className="bg-amber-100 text-amber-700">
                  {stats.unmappedEmails.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  Success Rate
                </span>
                <Badge className="bg-indigo-100 text-indigo-700">
                  {stats.totalEmails > 0
                    ? `${((stats.mappedEmails / stats.totalEmails) * 100).toFixed(1)}%`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* AI Performance */}
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-3">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                AI Automation
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Suggestions Made</span>
                <Badge className="bg-violet-100 text-violet-700">
                  {stats.aiSuggestionsTotal.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Actions Taken</span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {stats.actionsTaken.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  This Week
                </span>
                <Badge className="bg-violet-100 text-violet-700">
                  +{stats.actionsThisWeek.toLocaleString()}
                </Badge>
              </div>
            </div>
          </Card>

          {/* ROI Indicators */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 p-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                ROI Impact
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Total Orders</span>
                <Badge className="bg-slate-100 text-slate-700">
                  {stats.totalOrders.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Automation Rate</span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {stats.totalEmails > 0
                    ? `${((stats.actionsTaken / stats.totalEmails) * 100).toFixed(0)}%`
                    : 'N/A'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  Time Saved
                </span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {stats.actionsTaken > 0
                    ? `~${Math.round(stats.actionsTaken * 5)}m`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* ROI Summary */}
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-4 shadow-lg">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Return on Investment
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Demonstrating value to your merchants
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                Emails Processed
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.totalEmails.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                +{stats.emailsThisWeek} this week
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Actions Automated
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.actionsTaken.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {stats.totalEmails > 0
                  ? `${((stats.actionsTaken / stats.totalEmails) * 100).toFixed(0)}% automation rate`
                  : 'Getting started'}
              </p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                Time Saved
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.actionsTaken > 0
                  ? `${Math.round(stats.actionsTaken * 5)}`
                  : '0'}
                <span className="text-lg text-slate-600">m</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                ~5 min per automated action
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                CSAT Score
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.customerSatisfactionScore.toFixed(0)}%
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Based on action types
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
