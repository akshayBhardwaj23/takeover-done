'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  Zap,
  BarChart3,
  Sparkles,
  CheckCircle,
  X,
  Clock,
  Filter,
  Calendar,
  Image as ImageIcon,
  Users,
  Send,
  Eye,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../../components/SkeletonLoaders';

// Integration Card Component
function IntegrationCard({
  name,
  isConnected,
  accountId,
  onConnect,
}: {
  name: string;
  isConnected: boolean;
  accountId?: string;
  onConnect: () => void;
}) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-lg font-bold text-slate-700">
                {name === 'Meta Ads' ? 'M' : 'G'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
              <Badge
                className={`mt-1 rounded-full px-3 py-0.5 text-xs font-semibold ${
                  isConnected
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-600'
                    : 'border border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {isConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </div>
          {isConnected && accountId && (
            <p className="mt-3 text-sm text-slate-500">
              Account ID: <span className="font-mono text-slate-700">{accountId}</span>
            </p>
          )}
        </div>
      </div>
      <Button
        onClick={onConnect}
        className={`mt-4 w-full rounded-full ${
          isConnected
            ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            : 'bg-slate-900 text-white hover:bg-black'
        }`}
      >
        {isConnected ? 'Manage Connection' : `Connect ${name}`}
      </Button>
    </Card>
  );
}

// Performance Summary Card Component
function PerformanceCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  isLoading,
}: {
  title: string;
  value: string;
  change: string;
  icon: any;
  trend: 'up' | 'down';
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <StatsCardSkeleton />;
  }

  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <Card className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-xs font-semibold text-slate-600">{change}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full bg-slate-100 p-2">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
          <TrendIcon
            className={`h-4 w-4 ${
              trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
            }`}
          />
        </div>
      </div>
    </Card>
  );
}

// Recommendation Card Component
function RecommendationCard({
  title,
  description,
  icon,
  action,
  onApply,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  onApply: () => void;
}) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 text-xl">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          <p className="mt-2 text-xs font-medium text-orange-600">{action}</p>
        </div>
        <Button
          onClick={onApply}
          className="rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-black"
        >
          Apply
        </Button>
      </div>
    </Card>
  );
}

// Alert Card Component
function AlertCard({
  timestamp,
  description,
  severity,
}: {
  timestamp: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}) {
  const severityConfig = {
    info: {
      icon: Info,
      color: 'border-blue-200 bg-blue-50 text-blue-600',
      badge: 'border-blue-200 bg-blue-50 text-blue-600',
    },
    warning: {
      icon: AlertTriangle,
      color: 'border-amber-200 bg-amber-50 text-amber-600',
      badge: 'border-amber-200 bg-amber-50 text-amber-600',
    },
    critical: {
      icon: AlertCircle,
      color: 'border-rose-200 bg-rose-50 text-rose-600',
      badge: 'border-rose-200 bg-rose-50 text-rose-600',
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={`rounded-2xl border ${config.color} p-4 shadow-sm`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.color.split(' ')[3]}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.badge}`}>
              {severity.toUpperCase()}
            </Badge>
            <span className="text-xs text-slate-500">{timestamp}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">{description}</p>
        </div>
      </div>
    </Card>
  );
}

// Approval Modal Component
function ApprovalModal({
  isOpen,
  onClose,
  adData,
  platform,
}: {
  isOpen: boolean;
  onClose: () => void;
  adData: any;
  platform: 'meta' | 'google';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-10">
      <div
        className="modal-overlay absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-container relative z-10 flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Approve New Ad
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Ad Preview */}
            <Card className="border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Ad Creative Preview</h3>
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {adData?.creatives?.map((creative: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-xs text-white">
                      Variation {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Ad Copy */}
            <Card className="border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Ad Copy</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Headline</p>
                  <p className="mt-1 font-medium text-slate-900">{adData?.headline}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Primary Text</p>
                  <p className="mt-1 text-slate-700">{adData?.primaryText}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CTA</p>
                  <Badge className="mt-1 border border-slate-200 bg-slate-50 text-slate-700">
                    {adData?.cta}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Targeting */}
            <Card className="border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Target Audience</h3>
              <p className="mt-2 text-sm text-slate-600">{adData?.targetAudience}</p>
            </Card>

            {/* Budget & Impact */}
            <Card className="border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Budget & Impact</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Suggested Budget</span>
                  <span className="font-semibold text-slate-900">{adData?.budget || '$50/day'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Predicted ROAS Impact</span>
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                    {adData?.predictedROAS || '+12%'}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              className="rounded-full border-slate-200 text-slate-600"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-slate-900 text-white hover:bg-black"
              onClick={() => {
                // Placeholder for approval logic
                onClose();
              }}
            >
              Approve & Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdvertisementsPage() {
  const [metaConnected, setMetaConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'meta' | 'google'>('all');
  const [flagLowROAS, setFlagLowROAS] = useState(false);
  const [adDescription, setAdDescription] = useState('');
  const [generatedAd, setGeneratedAd] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalPlatform, setApprovalPlatform] = useState<'meta' | 'google'>('meta');

  // Simulate loading
  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const performanceCards = [
    {
      title: 'ROAS (last 7 days)',
      value: '4.2x',
      change: '+12% vs last week',
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'Top Performing Campaign',
      value: 'Summer Sale',
      change: 'ROAS: 5.8x',
      icon: Target,
      trend: 'up' as const,
    },
    {
      title: 'Highest Wasted Spend',
      value: '$1,240',
      change: 'Campaign #4',
      icon: TrendingDown,
      trend: 'down' as const,
    },
    {
      title: 'Estimated Weekly Revenue Impact',
      value: '+$8.2K',
      change: 'Based on AI recommendations',
      icon: TrendingUp,
      trend: 'up' as const,
    },
  ];

  const campaigns = [
    {
      name: 'Summer Sale 2024',
      platform: 'Meta' as const,
      spend: '$2,450',
      revenue: '$12,180',
      roas: '4.97x',
      ctr: '3.2%',
      cpc: '$0.42',
      cpm: '$8.50',
      status: 'Active' as const,
    },
    {
      name: 'Product Launch Campaign',
      platform: 'Google' as const,
      spend: '$1,890',
      revenue: '$9,450',
      roas: '5.00x',
      ctr: '4.1%',
      cpc: '$0.58',
      cpm: '$12.30',
      status: 'Active' as const,
    },
    {
      name: 'Retargeting - Abandoned Cart',
      platform: 'Meta' as const,
      spend: '$3,200',
      revenue: '$8,960',
      roas: '2.80x',
      ctr: '2.1%',
      cpc: '$0.35',
      cpm: '$7.20',
      status: 'Active' as const,
    },
    {
      name: 'Brand Awareness Q2',
      platform: 'Google' as const,
      spend: '$1,240',
      revenue: '$2,480',
      roas: '2.00x',
      ctr: '1.5%',
      cpc: '$0.72',
      cpm: '$15.80',
      status: 'Paused' as const,
    },
  ];

  const recommendations = [
    {
      title: 'Pause Campaign #4 — Low ROAS',
      description: 'Campaign "Brand Awareness Q2" has ROAS of 2.0x, below threshold of 3.0x',
      icon: '📉',
      action: 'Pause campaign to reallocate budget',
    },
    {
      title: 'Increase budget for Campaign #2 by 15%',
      description: 'High-performing campaign showing strong conversion signals',
      icon: '📈',
      action: 'Increase daily budget from $90 to $103.50',
    },
    {
      title: 'Update creative for Ad Set C — fatigue detected',
      description: 'CTR dropped 18% over last 3 days, suggesting creative fatigue',
      icon: '⚡',
      action: 'Generate new creative variations',
    },
  ];

  const alerts = [
    {
      timestamp: '2 hours ago',
      description: 'Spend spike detected: Campaign #1 increased by 45%',
      severity: 'warning' as const,
    },
    {
      timestamp: '5 hours ago',
      description: 'Campaign fatigue detected: Ad Set C CTR dropped 18%',
      severity: 'info' as const,
    },
    {
      timestamp: '1 day ago',
      description: 'CTR drop: Campaign #4 below 1.5% threshold',
      severity: 'warning' as const,
    },
    {
      timestamp: '2 days ago',
      description: 'CPC increase: Average CPC up 12% across Meta campaigns',
      severity: 'info' as const,
    },
    {
      timestamp: '3 days ago',
      description: 'Recommendation applied: Budget increased for Campaign #2',
      severity: 'info' as const,
    },
  ];

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (selectedPlatform !== 'all' && campaign.platform.toLowerCase() !== selectedPlatform) {
      return false;
    }
    if (flagLowROAS) {
      const roasValue = parseFloat(campaign.roas.replace('x', ''));
      return roasValue < 3.0;
    }
    return true;
  });

  const handleGenerateAd = () => {
    if (!adDescription.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedAd({
        headline: 'Transform Your Business Today',
        primaryText: 'Discover how our solution can help you achieve your goals faster and more efficiently.',
        cta: 'Learn More',
        creatives: [
          { id: 1, url: '' },
          { id: 2, url: '' },
          { id: 3, url: '' },
        ],
        targetAudience: 'Ages 25-45, interested in business solutions, located in US',
        predictedROAS: '+15%',
        budget: '$50/day',
      });
      setIsGenerating(false);
    }, 2000);
  };

  const handleSendToPlatform = (platform: 'meta' | 'google') => {
    setApprovalPlatform(platform);
    setApprovalModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        {/* Header Section */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Advertisements</h1>
              <p className="text-sm text-slate-500">
                AI-powered insights, optimization, and ad creation across Meta and Google Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
              <Clock className="h-4 w-4" />
              Next AI Analysis: 3 hours
            </Badge>
            <Button
              variant="outline"
              className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
            >
              Daily AI Summary
            </Button>
          </div>
        </header>

        {/* Integration Section */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Integrations</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <IntegrationCard
              name="Meta Ads"
              isConnected={metaConnected}
              accountId={metaConnected ? 'act_123456789' : undefined}
              onConnect={() => setMetaConnected(!metaConnected)}
            />
            <IntegrationCard
              name="Google Ads"
              isConnected={googleConnected}
              accountId={googleConnected ? '123-456-7890' : undefined}
              onConnect={() => setGoogleConnected(!googleConnected)}
            />
          </div>
        </section>

        {/* AI Performance Summary */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">AI Performance Summary</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {performanceCards.map((card) => (
              <PerformanceCard key={card.title} {...card} isLoading={isLoading} />
            ))}
          </div>
        </section>

        {/* Campaign Performance Table */}
        <section>
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Campaign Performance</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={selectedPlatform}
                  onChange={(e) =>
                    setSelectedPlatform(e.target.value as 'all' | 'meta' | 'google')
                  }
                  className="border-none bg-transparent text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">All Platforms</option>
                  <option value="meta">Meta Ads</option>
                  <option value="google">Google Ads</option>
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <select className="border-none bg-transparent text-sm text-slate-700 focus:outline-none">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={flagLowROAS}
                  onChange={(e) => setFlagLowROAS(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-700">Flag low-ROAS campaigns</span>
              </label>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Campaign Name
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Platform
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Spend
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Revenue
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ROAS
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CTR
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CPC
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CPM
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="py-4 text-sm font-medium text-slate-900">
                        {campaign.name}
                      </td>
                      <td className="py-4">
                        <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
                          {campaign.platform}
                        </Badge>
                      </td>
                      <td className="py-4 text-right text-sm text-slate-700">
                        {campaign.spend}
                      </td>
                      <td className="py-4 text-right text-sm font-semibold text-slate-900">
                        {campaign.revenue}
                      </td>
                      <td className="py-4 text-right">
                        <Badge
                          className={`${
                            parseFloat(campaign.roas.replace('x', '')) >= 4
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : parseFloat(campaign.roas.replace('x', '')) >= 3
                                ? 'border-amber-200 bg-amber-50 text-amber-600'
                                : 'border-rose-200 bg-rose-50 text-rose-600'
                          }`}
                        >
                          {campaign.roas}
                        </Badge>
                      </td>
                      <td className="py-4 text-right text-sm text-slate-700">
                        {campaign.ctr}
                      </td>
                      <td className="py-4 text-right text-sm text-slate-700">
                        {campaign.cpc}
                      </td>
                      <td className="py-4 text-right text-sm text-slate-700">
                        {campaign.cpm}
                      </td>
                      <td className="py-4">
                        <Badge
                          className={`${
                            campaign.status === 'Active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* AI Recommendations Section */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">AI Growth Recommendations</h2>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                {...rec}
                onApply={() => {
                  // Placeholder for apply logic
                  console.log('Applying recommendation:', rec.title);
                }}
              />
            ))}
          </div>
        </section>

        {/* AI Ad Creator */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Create New AI Ad</h2>
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Describe what type of ad you want to create
                </label>
                <textarea
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  rows={4}
                  placeholder="e.g., Create a conversion-focused ad for our new product launch targeting business professionals..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <Button
                onClick={handleGenerateAd}
                disabled={!adDescription.trim() || isGenerating}
                className="rounded-full bg-slate-900 text-white hover:bg-black disabled:opacity-50"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate AI Ad'}
              </Button>

              {generatedAd && (
                <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Suggested Headline</h3>
                    <p className="mt-1 text-sm text-slate-700">{generatedAd.headline}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Primary Text</h3>
                    <p className="mt-1 text-sm text-slate-700">{generatedAd.primaryText}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">CTA</h3>
                    <Badge className="mt-1 border border-slate-200 bg-white text-slate-700">
                      {generatedAd.cta}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Creative Variations</h3>
                    <div className="mt-2 flex gap-3">
                      {generatedAd.creatives.map((creative: any, idx: number) => (
                        <div
                          key={idx}
                          className="relative h-32 w-32 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200"
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Suggested Target Audience</h3>
                    <p className="mt-1 text-sm text-slate-700">{generatedAd.targetAudience}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Predicted ROAS Impact</h3>
                    <Badge className="mt-1 border border-emerald-200 bg-emerald-50 text-emerald-600">
                      {generatedAd.predictedROAS}
                    </Badge>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleSendToPlatform('meta')}
                      className="flex-1 rounded-full bg-slate-900 text-white hover:bg-black"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send to Meta Ads
                    </Button>
                    <Button
                      onClick={() => handleSendToPlatform('google')}
                      className="flex-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send to Google Ads
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Historical Insights Feed */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">AI Alerts & History</h2>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <AlertCard key={idx} {...alert} />
            ))}
          </div>
        </section>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        adData={generatedAd}
        platform={approvalPlatform}
      />
    </main>
  );
}

