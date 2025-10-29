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
    averageResponseTime: 0,
    aiSuggestionAccuracy: 0,
    totalOrders: 0,
    mappedEmails: 0,
    unmappedEmails: 0,
    actionsTaken: 0,
  };

  const statCards = [
    {
      title: 'Total Emails',
      value: stats.totalEmails.toLocaleString(),
      change: `+${stats.emailsThisWeek} this week`,
      icon: Mail,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Mapped Emails',
      value: stats.mappedEmails.toLocaleString(),
      change: `${((stats.mappedEmails / (stats.totalEmails || 1)) * 100).toFixed(1)}% success rate`,
      icon: CheckCircle,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'from-emerald-50 to-green-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'AI Accuracy',
      value: `${((stats.aiSuggestionAccuracy || 0) * 100).toFixed(0)}%`,
      change: 'Based on user actions',
      icon: Sparkles,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'from-violet-50 to-purple-50',
      textColor: 'text-violet-600',
    },
    {
      title: 'Avg Response Time',
      value:
        stats.averageResponseTime > 0 ? `${stats.averageResponseTime}m` : 'N/A',
      change: 'Time to first response',
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-50 to-orange-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-2 text-slate-600">
            Track your support performance and AI insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={`border-none bg-gradient-to-br ${stat.bgColor} p-6 shadow-sm transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${stat.textColor}`}>
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{stat.change}</p>
                  </div>
                  <div
                    className={`rounded-lg bg-gradient-to-br ${stat.color} p-3`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Order Insights */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Order Insights
              </h2>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Orders</span>
                <Badge variant="secondary" className="text-sm">
                  {stats.totalOrders.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Orders with Emails
                </span>
                <Badge variant="secondary" className="text-sm">
                  {stats.mappedEmails.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Unmapped Emails</span>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700"
                >
                  {stats.unmappedEmails.toLocaleString()}
                </Badge>
              </div>
            </div>
          </Card>

          {/* AI Performance */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                AI Performance
              </h2>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Suggestions Generated
                </span>
                <Badge variant="secondary" className="text-sm">
                  {stats.totalEmails.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Actions Taken</span>
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700"
                >
                  {stats.actionsTaken.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Acceptance Rate</span>
                <Badge
                  variant="secondary"
                  className="bg-violet-100 text-violet-700"
                >
                  {stats.totalEmails > 0
                    ? `${((stats.actionsTaken / stats.totalEmails) * 100).toFixed(1)}%`
                    : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Quick Stats
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-600">Emails This Week</p>
                  <p className="text-xl font-bold text-slate-900">
                    {stats.emailsThisWeek.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-600">Value Protected</p>
                  <p className="text-xl font-bold text-slate-900">
                    Coming Soon
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-xs text-slate-600">Automation Rate</p>
                  <p className="text-xl font-bold text-slate-900">
                    {stats.totalEmails > 0
                      ? `${((stats.actionsTaken / stats.totalEmails) * 100).toFixed(0)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
