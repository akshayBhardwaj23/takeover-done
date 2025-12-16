'use client';

import { Suspense, useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Users,
  ArrowRight,
  BarChart3,
  Zap,
  ShoppingCart,
  Globe,
  Clock,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PauseCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import { StatsCardSkeleton } from '../../components/SkeletonLoaders';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { useToast, ToastContainer } from '../../components/Toast';

// Types for AI insights
interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'action';
  category: 'performance' | 'revenue' | 'optimization' | 'action';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action?: string;
  entityId?: string;
  entityName?: string;
}

// Generate AI insights based on ad performance data
function generateAIInsights(stats: any): AIInsight[] {
  const insights: AIInsight[] = [];

  // Safety check
  if (!stats || typeof stats !== 'object') {
    return insights;
  }

  // ROAS Analysis
  if (stats.roas !== undefined) {
    if (stats.roas < 1) {
      insights.push({
        type: 'warning',
        category: 'revenue',
        title: 'Negative Return on Ad Spend',
        description: `Your ROAS is ${stats.roas.toFixed(2)}x, meaning you're spending more than you're earning. Consider pausing low-performing campaigns and reallocating budget to better performers.`,
        impact: 'high',
        action: 'Review and pause underperforming campaigns',
      });
    } else if (stats.roas >= 1 && stats.roas < 2) {
      insights.push({
        type: 'info',
        category: 'revenue',
        title: 'Moderate ROAS Performance',
        description: `Your ROAS is ${stats.roas.toFixed(2)}x. While profitable, there's room for improvement. Focus on optimizing ad creative and targeting.`,
        impact: 'medium',
        action: 'Optimize targeting and creative',
      });
    } else if (stats.roas >= 2 && stats.roas < 4) {
      insights.push({
        type: 'success',
        category: 'revenue',
        title: 'Good ROAS Performance',
        description: `Your ROAS is ${stats.roas.toFixed(2)}x. This is solid performance! Consider scaling your budget on top campaigns to maximize revenue.`,
        impact: 'medium',
        action: 'Scale successful campaigns',
      });
    } else {
      insights.push({
        type: 'success',
        category: 'revenue',
        title: 'Excellent ROAS Performance',
        description: `Your ROAS is ${stats.roas.toFixed(2)}x. Outstanding performance! Scale aggressively and explore similar audiences.`,
        impact: 'high',
        action: 'Scale budget and expand to lookalike audiences',
      });
    }
  }

  // CTR Analysis
  if (stats.ctr !== undefined && stats.ctr > 0) {
    const ctrPercent = stats.ctr * 100;
    if (ctrPercent < 0.5) {
      insights.push({
        type: 'warning',
        category: 'performance',
        title: 'Low Click-Through Rate',
        description: `Your CTR is ${ctrPercent.toFixed(2)}%. This suggests your ad creative or targeting may not be resonating with your audience. Test new creatives and refine your audience.`,
        impact: 'high',
        action: 'Test new ad creatives and refine targeting',
      });
    } else if (ctrPercent >= 0.5 && ctrPercent < 1) {
      insights.push({
        type: 'info',
        category: 'performance',
        title: 'Average Click-Through Rate',
        description: `Your CTR is ${ctrPercent.toFixed(2)}%. This is acceptable but could be improved with better ad copy and more compelling visuals.`,
        impact: 'medium',
        action: 'A/B test ad copy and visuals',
      });
    } else if (ctrPercent >= 2) {
      insights.push({
        type: 'success',
        category: 'performance',
        title: 'Excellent Click-Through Rate',
        description: `Your CTR is ${ctrPercent.toFixed(2)}%. Your ads are highly engaging! Keep monitoring and maintain this quality.`,
        impact: 'low',
      });
    }
  }

  // CPC Analysis
  if (stats.cpc !== undefined && stats.cpc > 0) {
    if (stats.cpc > 5) {
      insights.push({
        type: 'warning',
        category: 'optimization',
        title: 'High Cost Per Click',
        description: `Your CPC is $${stats.cpc.toFixed(2)}, which is higher than average. Consider refining your targeting to reach more qualified audiences at lower costs.`,
        impact: 'high',
        action: 'Refine audience targeting to lower CPC',
      });
    } else if (stats.cpc <= 1) {
      insights.push({
        type: 'success',
        category: 'optimization',
        title: 'Efficient Cost Per Click',
        description: `Your CPC is $${stats.cpc.toFixed(2)}, which is very efficient. You're acquiring clicks at a great rate!`,
        impact: 'low',
      });
    }
  }

  // Campaign Analysis
  if (stats.campaigns && Array.isArray(stats.campaigns) && stats.campaigns.length > 0) {
    // Find underperforming campaigns
    const underperformingCampaigns = stats.campaigns.filter((c: any) => {
      if (c.roas !== undefined && c.roas < 0.5 && c.spend > 10) {
        return true;
      }
      if (c.ctr < 0.003 && c.spend > 10) {
        // Less than 0.3% CTR
        return true;
      }
      return false;
    });

    if (underperformingCampaigns.length > 0) {
      underperformingCampaigns.slice(0, 3).forEach((campaign: any) => {
        const reason =
          campaign.roas !== undefined && campaign.roas < 0.5
            ? `poor ROAS (${campaign.roas.toFixed(2)}x)`
            : `low CTR (${(campaign.ctr * 100).toFixed(2)}%)`;

        insights.push({
          type: 'action',
          category: 'action',
          title: `Pause Campaign: ${campaign.name}`,
          description: `This campaign has ${reason} and has spent $${campaign.spend.toFixed(2)}. Consider pausing it to prevent further wasteful spending.`,
          impact: 'high',
          action: 'Pause this campaign',
          entityId: campaign.id,
          entityName: campaign.name,
        });
      });
    }

    // Find top performers to scale
    const topPerformers = stats.campaigns
      .filter((c: any) => c.roas !== undefined && c.roas >= 3 && c.spend > 20)
      .slice(0, 2);

    if (topPerformers.length > 0) {
      topPerformers.forEach((campaign: any) => {
        insights.push({
          type: 'success',
          category: 'revenue',
          title: `Scale Campaign: ${campaign.name}`,
          description: `This campaign has excellent ROAS (${campaign.roas.toFixed(2)}x). Increase budget by 20-30% to maximize revenue while maintaining efficiency.`,
          impact: 'high',
          action: 'Increase campaign budget',
          entityId: campaign.id,
          entityName: campaign.name,
        });
      });
    }
  }

  // Ad Set Analysis
  if (stats.adsets && Array.isArray(stats.adsets) && stats.adsets.length > 0) {
    const underperformingAdsets = stats.adsets.filter((a: any) => {
      if (a.roas !== undefined && a.roas < 0.5 && a.spend > 5) {
        return true;
      }
      if (a.ctr < 0.003 && a.spend > 5) {
        return true;
      }
      return false;
    });

    if (underperformingAdsets.length > 0) {
      const worstAdset = underperformingAdsets[0];
      const reason =
        worstAdset.roas !== undefined && worstAdset.roas < 0.5
          ? `poor ROAS (${worstAdset.roas.toFixed(2)}x)`
          : `low CTR (${(worstAdset.ctr * 100).toFixed(2)}%)`;

      insights.push({
        type: 'action',
        category: 'action',
        title: `Pause Ad Set: ${worstAdset.name}`,
        description: `This ad set has ${reason}. The audience targeting may not be optimal. Pause and test a different audience segment.`,
        impact: 'medium',
        action: 'Pause this ad set',
        entityId: worstAdset.id,
        entityName: worstAdset.name,
      });
    }

    // Find top-performing ad sets to create optimized copies
    const topAdSets = stats.adsets
      .filter((a: any) => a.roas !== undefined && a.roas >= 3 && a.spend > 10)
      .slice(0, 1);

    if (topAdSets.length > 0) {
      topAdSets.forEach((adSet: any) => {
        insights.push({
          type: 'success',
          category: 'revenue',
          title: `Scale Ad Set: ${adSet.name}`,
          description: `This ad set has excellent ROAS (${adSet.roas.toFixed(2)}x). Create an optimized copy with similar targeting to test variations and scale your success.`,
          impact: 'high',
          action: 'Create optimized ad set',
          entityId: adSet.id,
          entityName: adSet.name,
        });
      });
    }
  }

  // Frequency Analysis
  if (stats.frequency !== undefined && typeof stats.frequency === 'number' && stats.frequency > 0) {
    if (stats.frequency > 4) {
      insights.push({
        type: 'warning',
        category: 'optimization',
        title: 'High Ad Frequency',
        description: `Your average frequency is ${stats.frequency.toFixed(2)}, meaning people are seeing your ads too often. This can lead to ad fatigue. Expand your audience or refresh your creative.`,
        impact: 'medium',
        action: 'Expand audience or refresh creative',
      });
    } else if (stats.frequency < 1.5 && stats.reach && stats.reach > 1000) {
      insights.push({
        type: 'info',
        category: 'optimization',
        title: 'Low Ad Frequency',
        description: `Your frequency is ${stats.frequency.toFixed(2)}. Consider retargeting engaged users to improve conversion rates.`,
        impact: 'low',
        action: 'Set up retargeting campaigns',
      });
    }
  }

  // Conversion Rate Analysis
  if (stats.conversions !== undefined && stats.clicks > 0) {
    const conversionRate = (stats.conversions / stats.clicks) * 100;
    if (conversionRate < 1) {
      insights.push({
        type: 'warning',
        category: 'optimization',
        title: 'Low Conversion Rate',
        description: `Your conversion rate is ${conversionRate.toFixed(2)}%. Many people click but don't convert. Optimize your landing page, ensure fast load times, and clarify your value proposition.`,
        impact: 'high',
        action: 'Optimize landing page and checkout flow',
      });
    } else if (conversionRate >= 3) {
      insights.push({
        type: 'success',
        category: 'performance',
        title: 'Strong Conversion Rate',
        description: `Your conversion rate is ${conversionRate.toFixed(2)}%. Your landing page and offer are well-aligned with your ad messaging!`,
        impact: 'low',
      });
    }
  }

  // Budget Optimization
  if (stats.spend > 0 && stats.campaigns && stats.campaigns.length > 3) {
    const topCampaignSpend = stats.campaigns
      .slice(0, 3)
      .reduce((sum: number, c: any) => sum + c.spend, 0);
    const totalSpend = stats.spend;
    const topThreePercentage = (topCampaignSpend / totalSpend) * 100;

    if (topThreePercentage < 50) {
      insights.push({
        type: 'info',
        category: 'optimization',
        title: 'Budget Distribution',
        description: `Your budget is spread across many campaigns. Consider consolidating budget into your top performers to maximize efficiency.`,
        impact: 'medium',
        action: 'Consolidate budget to top campaigns',
      });
    }
  }

  // General best practices
  if (insights.length === 0 || insights.filter((i) => i.type === 'success').length > insights.length / 2) {
    insights.push({
      type: 'info',
      category: 'optimization',
      title: 'Continue Testing',
      description: `Your campaigns are performing well! Keep testing new audiences, creatives, and ad formats to find additional opportunities for growth.`,
      impact: 'low',
      action: 'Test new audiences and creatives',
    });
  }

  // Sort by impact
  const impactOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
}

function MetaAdsInner() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [adSetNameInput, setAdSetNameInput] = useState<string>('');
  const toast = useToast();

  // Fetch connections
  const connections = trpc.connections.useQuery();

  // Fetch accounts
  const accounts = trpc.getMetaAdsAccounts.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Get Meta Ads connections
  const metaAdsConnections =
    connections.data?.connections.filter((c: any) => c.type === 'META_ADS') ||
    [];

  // Auto-select account: first from metadata, then first from API
  useEffect(() => {
    if (selectedAccountId) return; // Already selected

    // Try metadata first
    if (metaAdsConnections.length > 0) {
      const metadata = (metaAdsConnections[0] as any).metadata as Record<
        string,
        unknown
      > | null;
      const metadataAccountId = metadata?.adAccountId as string | undefined;

      if (metadataAccountId && accounts.data?.accounts) {
        const exists = accounts.data.accounts.some(
          (a) => a.adAccountId === metadataAccountId,
        );
        if (exists) {
          setSelectedAccountId(metadataAccountId);
          return;
        }
      }
    }

    // Fallback to first account from API
    if (accounts.data?.accounts && accounts.data.accounts.length > 0) {
      setSelectedAccountId(accounts.data.accounts[0].adAccountId);
    }
  }, [metaAdsConnections, accounts.data?.accounts, selectedAccountId]);

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(
    Date.now() -
      (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) *
        24 *
        60 *
        60 *
        1000,
  )
    .toISOString()
    .split('T')[0];

  // Fetch insights data
  const insights = trpc.getMetaAdsInsights.useQuery(
    {
      adAccountId: selectedAccountId,
      startDate,
      endDate,
    },
    {
      enabled: !!selectedAccountId && selectedAccountId.length > 0,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  );

  // AI Review queries
  const cooldown = trpc.checkMetaAdsAIReviewCooldown.useQuery(undefined, {
    enabled: !!selectedAccountId,
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });

  const reviewHistory = trpc.getMetaAdsAIReviewHistory.useQuery(
    { adAccountId: selectedAccountId },
    {
      enabled: !!selectedAccountId,
      refetchOnWindowFocus: false,
    },
  );

  const generateReview = trpc.generateMetaAdsAIReview.useMutation({
    onSuccess: () => {
      cooldown.refetch();
      reviewHistory.refetch();
    },
  });

  const [showAllReviews, setShowAllReviews] = useState(false);

  // Update account mutation
  const updateAccount = trpc.updateMetaAdsAccount.useMutation({
    onSuccess: () => {
      connections.refetch();
    },
  });

  // Action mutations
  const pauseCampaign = trpc.pauseCampaign.useMutation({
    onSuccess: () => {
      toast.success('Campaign status updated successfully!');
      setActionDialogOpen(false);
      insights.refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update campaign');
    },
  });

  const pauseAdSet = trpc.pauseAdSet.useMutation({
    onSuccess: () => {
      toast.success('Ad set status updated successfully!');
      setActionDialogOpen(false);
      insights.refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update ad set');
    },
  });

  const scaleCampaign = trpc.scaleCampaign.useMutation({
    onSuccess: () => {
      toast.success('Campaign budget updated successfully!');
      setActionDialogOpen(false);
      setBudgetInput('');
      insights.refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update campaign budget');
    },
  });

  const createOptimizedAdSet = trpc.createOptimizedAdSet.useMutation({
    onSuccess: () => {
      toast.success('New ad set created successfully! Review it in Meta Ads Manager.');
      setActionDialogOpen(false);
      setAdSetNameInput('');
      setBudgetInput('');
      insights.refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create ad set');
    },
  });

  // Handle account selection
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    const selectedAccount = accounts.data?.accounts?.find(
      (a) => a.adAccountId === accountId,
    );
    if (selectedAccount) {
      updateAccount.mutate({
        adAccountId: selectedAccount.adAccountId,
        adAccountName: selectedAccount.adAccountName,
      });
    }
  };

  // Show loading state while checking for connections
  if (connections.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">
              Checking for Meta Ads connection...
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // No connection
  if (metaAdsConnections.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No Meta Ads connected
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Connect your Meta Ads account from the integrations page to unlock
              ad analytics.
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

  // Accounts loading
  if (accounts.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">Loading accounts...</p>
            </div>
          </div>
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">
              Loading Meta Ads accounts...
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // Accounts error
  if (accounts.error) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
              <BarChart3 className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              Unable to load accounts
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {accounts.error.message ||
                'Failed to fetch Meta Ads accounts. Please try reconnecting.'}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => accounts.refetch()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
              >
                Retry
              </button>
              <a
                href="/integrations"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:bg-slate-50"
              >
                Reconnect
              </a>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // No accounts available
  if (!accounts.data?.accounts || accounts.data.accounts.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No accounts found
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              No Meta Ads accounts were found for your account. Please check
              your Meta Business Manager setup.
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

  // No account selected yet - redirect to selection page
  if (!selectedAccountId) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">No account selected</h2>
            <p className="mt-3 text-sm text-slate-500">
              Please select a Meta Ads account to view analytics.
            </p>
            <a
              href="/meta-ads/select-account"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Select Account
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  // Insights loading
  if (insights.isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">Loading insights...</p>
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

  // Insights error
  if (insights.error) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <BarChart3 className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              Failed to load insights
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {insights.error.message ||
                'Unable to fetch Meta Ads insights. Please try again.'}
            </p>
            <button
              onClick={() => insights.refetch()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Retry
            </button>
          </Card>
        </div>
      </main>
    );
  }

  // Display insights data
  const stats = insights.data || {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversions: undefined,
    conversionValue: undefined,
    roas: undefined,
    cpa: undefined,
    reach: undefined,
    frequency: undefined,
    linkClicks: undefined,
    postEngagement: undefined,
    videoViews: undefined,
    campaigns: [],
    adsets: [],
    trend: [],
  };

  // Generate AI insights
  const aiInsights = generateAIInsights(stats);

  // Handle taking action on an insight
  const handleTakeAction = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setActionDialogOpen(true);
    setBudgetInput('');
    setAdSetNameInput('');
  };

  // Execute the action based on insight type
  const executeAction = () => {
    if (!selectedInsight) return;

    if (selectedInsight.type === 'action' && selectedInsight.entityId) {
      // Pause campaign or ad set
      if (selectedInsight.title.includes('Campaign')) {
        pauseCampaign.mutate({
          campaignId: selectedInsight.entityId,
          status: 'PAUSED',
        });
      } else if (selectedInsight.title.includes('Ad Set')) {
        pauseAdSet.mutate({
          adSetId: selectedInsight.entityId,
          status: 'PAUSED',
        });
      }
    } else if (
      selectedInsight.category === 'revenue' &&
      selectedInsight.title.includes('Scale') &&
      selectedInsight.entityId
    ) {
      // Scale campaign budget
      const budget = parseFloat(budgetInput);
      if (isNaN(budget) || budget <= 0) {
        toast.error('Please enter a valid budget amount');
        return;
      }
      scaleCampaign.mutate({
        campaignId: selectedInsight.entityId,
        dailyBudget: budget,
      });
    } else if (
      selectedInsight.category === 'revenue' &&
      (selectedInsight.title.includes('Scale Ad Set') ||
        selectedInsight.title.includes('Create')) &&
      selectedInsight.entityId &&
      selectedInsight.entityName
    ) {
      // Create optimized ad set based on top performer
      const budget = parseFloat(budgetInput);
      const name = adSetNameInput.trim() || `${selectedInsight.entityName} - Optimized Copy`;

      if (isNaN(budget) || budget <= 0) {
        toast.error('Please enter a valid budget amount');
        return;
      }

      if (!name) {
        toast.error('Please enter a name for the new ad set');
        return;
      }

      // Find the ad set from stats
      const adSet = stats.adsets.find(
        (a: any) => a.id === selectedInsight.entityId || a.name === selectedInsight.entityName,
      );

      if (adSet && selectedAccountId) {
        createOptimizedAdSet.mutate({
          adAccountId: selectedAccountId,
          campaignId: adSet.campaignId || '',
          sourceAdSetId: adSet.id,
          name: name,
          dailyBudget: budget,
        });
      } else {
        toast.error('Unable to find ad set details');
      }
    }
  };

  const statCards = [
    {
      title: 'Spend',
      value: `$${stats.spend.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: `${stats.clicks.toLocaleString()} clicks`,
      subtext: 'Total ad spend',
      icon: DollarSign,
    },
    {
      title: 'Impressions',
      value: stats.impressions.toLocaleString(),
      change: `${stats.clicks.toLocaleString()} clicks`,
      subtext: 'Total impressions',
      icon: Eye,
    },
    {
      title: 'Clicks',
      value: stats.clicks.toLocaleString(),
      change:
        stats.impressions > 0
          ? `${((stats.clicks / stats.impressions) * 100).toFixed(2)}% CTR`
          : '0% CTR',
      subtext: 'Total clicks',
      icon: MousePointerClick,
    },
    {
      title: 'CTR',
      value: `${(stats.ctr * 100).toFixed(2)}%`,
      change: `${stats.cpc ? `$${stats.cpc.toFixed(2)} CPC` : 'N/A'}`,
      subtext: 'Click-through rate',
      icon: Target,
    },
  ];

  const performanceCards = [];
  if (stats.roas !== undefined) {
    performanceCards.push({
      title: 'ROAS',
      value: `${stats.roas.toFixed(2)}x`,
      change: stats.conversionValue
        ? `$${stats.conversionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue`
        : 'N/A',
      subtext: 'Return on ad spend',
      icon: TrendingUp,
    });
  }
  if (stats.conversions !== undefined && stats.conversions > 0) {
    performanceCards.push({
      title: 'Conversions',
      value: stats.conversions.toLocaleString(),
      change: stats.cpa ? `$${stats.cpa.toFixed(2)} CPA` : 'N/A',
      subtext: 'Total conversions',
      icon: ShoppingCart,
    });
  }
  if (stats.reach !== undefined && stats.reach > 0) {
    performanceCards.push({
      title: 'Reach',
      value: stats.reach.toLocaleString(),
      change: stats.frequency
        ? `${stats.frequency.toFixed(2)}x frequency`
        : 'N/A',
      subtext: 'Unique people reached',
      icon: Users,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <BarChart3 className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Meta Ads</h1>
              <p className="text-sm text-slate-500">
                Ad performance and insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as '7d' | '30d' | '90d')
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </header>

        {/* AI Insights Section */}
        {aiInsights.length > 0 && (
          <Card className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-3">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  AI-Powered Insights
                </h2>
                <p className="text-sm text-slate-600">
                  Actionable recommendations to optimize your ad performance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {aiInsights.map((insight, index) => {
                const getInsightIcon = () => {
                  switch (insight.type) {
                    case 'success':
                      return CheckCircle2;
                    case 'warning':
                      return AlertTriangle;
                    case 'action':
                      return PauseCircle;
                    default:
                      return Lightbulb;
                  }
                };

                const getInsightColor = () => {
                  switch (insight.type) {
                    case 'success':
                      return {
                        border: 'border-emerald-200',
                        bg: 'bg-emerald-50',
                        icon: 'text-emerald-600',
                        badge: 'bg-emerald-100 text-emerald-700',
                      };
                    case 'warning':
                      return {
                        border: 'border-amber-200',
                        bg: 'bg-amber-50',
                        icon: 'text-amber-600',
                        badge: 'bg-amber-100 text-amber-700',
                      };
                    case 'action':
                      return {
                        border: 'border-red-200',
                        bg: 'bg-red-50',
                        icon: 'text-red-600',
                        badge: 'bg-red-100 text-red-700',
                      };
                    default:
                      return {
                        border: 'border-blue-200',
                        bg: 'bg-blue-50',
                        icon: 'text-blue-600',
                        badge: 'bg-blue-100 text-blue-700',
                      };
                  }
                };

                const Icon = getInsightIcon();
                const colors = getInsightColor();

                return (
                  <div
                    key={index}
                    className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-5 transition hover:shadow-md`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-full ${colors.bg} p-2 ring-2 ring-white`}
                        >
                          <Icon className={`h-5 w-5 ${colors.icon}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900">
                            {insight.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-700">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {insight.action && (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${colors.badge} border-0 font-semibold`}
                          >
                            💡 {insight.action}
                          </Badge>
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <Badge
                          className={`border-0 ${
                            insight.impact === 'high'
                              ? 'bg-red-100 text-red-700'
                              : insight.impact === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        {(insight.type === 'action' ||
                          (insight.category === 'revenue' &&
                            (insight.title.includes('Scale') ||
                              insight.title.includes('Create')))) && (
                          <Button
                            onClick={() => handleTakeAction(insight)}
                            size="sm"
                            variant={
                              insight.type === 'action'
                                ? 'destructive'
                                : 'default'
                            }
                            className="ml-2 h-7 text-xs"
                          >
                            {insight.type === 'action' ? (
                              <>
                                <PauseCircle className="h-3 w-3" />
                                Take Action
                              </>
                            ) : (
                              <>
                                <TrendingUp className="h-3 w-3" />
                                Implement
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-indigo-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Pro Tip
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Review these insights regularly and take action on high-impact items first. 
                    Optimization is an ongoing process - test, measure, and iterate continuously 
                    for best results.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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

        {performanceCards.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {performanceCards.map((stat) => {
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
        )}

        {/* AI Review Section - After analytics tiles */}
        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">AI Campaign Review</h2>
                <p className="text-sm text-slate-500">
                  Get AI-powered insights on campaigns, adsets, budget, and creative optimization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {cooldown.data?.canGenerate ? (
                <button
                  onClick={() => generateReview.mutate()}
                  disabled={generateReview.isPending || !selectedAccountId}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generateReview.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Review
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Available in {cooldown.data?.hoursRemaining || 0}h
                  </span>
                </div>
              )}
            </div>
          </div>

          {generateReview.isError && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">
                  {generateReview.error?.message || 'Failed to generate review. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {reviewHistory.data?.reviews && reviewHistory.data.reviews.length > 0 ? (
            <div className="space-y-4">
              {/* Always show the most recent review */}
              {(() => {
                const mostRecentReview = reviewHistory.data.reviews[0];
                const insights = mostRecentReview.insights as any;
                const reviewDate = new Date(mostRecentReview.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-medium text-slate-600">
                          Latest Review - {reviewDate}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-900">{mostRecentReview.summary}</p>
                    </div>

                    {/* Campaigns Section */}
                    {insights.campaigns && (
                      <div className="mb-4 space-y-3">
                        {insights.campaigns.toStop && insights.campaigns.toStop.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <PauseCircle className="h-4 w-4 text-red-600" />
                              Campaigns to Stop
                            </h4>
                            <div className="space-y-2">
                              {insights.campaigns.toStop.slice(0, 3).map((campaign: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-red-200 bg-white p-3"
                                >
                                  <p className="font-medium text-slate-900">{campaign.name}</p>
                                  <p className="mt-1 text-xs text-slate-600">{campaign.reason}</p>
                                  {campaign.metrics && (
                                    <div className="mt-2 flex gap-2 text-xs">
                                      {campaign.metrics.roas !== undefined && (
                                        <Badge className="border-red-200 bg-red-50 text-red-700">
                                          ROAS: {campaign.metrics.roas.toFixed(2)}x
                                        </Badge>
                                      )}
                                      {campaign.metrics.spend !== undefined && (
                                        <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                                          Spend: ${campaign.metrics.spend.toFixed(2)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.campaigns.toScale && insights.campaigns.toScale.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                              Campaigns to Scale
                            </h4>
                            <div className="space-y-2">
                              {insights.campaigns.toScale.slice(0, 3).map((campaign: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-emerald-200 bg-white p-3"
                                >
                                  <p className="font-medium text-slate-900">{campaign.name}</p>
                                  <p className="mt-1 text-xs text-slate-600">{campaign.reason}</p>
                                  {campaign.metrics && (
                                    <div className="mt-2 flex gap-2 text-xs">
                                      {campaign.metrics.roas !== undefined && (
                                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                          ROAS: {campaign.metrics.roas.toFixed(2)}x
                                        </Badge>
                                      )}
                                      {campaign.metrics.spend !== undefined && (
                                        <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                                          Spend: ${campaign.metrics.spend.toFixed(2)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Budget Recommendations */}
                    {insights.budget && insights.budget.recommendations && insights.budget.recommendations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          Budget Recommendations
                        </h4>
                        <div className="space-y-2">
                          {insights.budget.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-blue-200 bg-white p-3"
                            >
                              <p className="font-medium text-slate-900">{rec.action}</p>
                              <p className="mt-1 text-xs text-slate-600">{rec.reason}</p>
                              {rec.expectedImpact && (
                                <p className="mt-1 text-xs text-blue-700">
                                  Expected Impact: {rec.expectedImpact}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Creative Tips */}
                    {insights.creative && insights.creative.tips && insights.creative.tips.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Lightbulb className="h-4 w-4 text-purple-600" />
                          Creative Optimization Tips
                        </h4>
                        <div className="space-y-2">
                          {insights.creative.tips.slice(0, 2).map((tip: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-purple-200 bg-white p-3"
                            >
                              <p className="font-medium text-slate-900">{tip.title}</p>
                              <p className="mt-1 text-xs text-slate-600">{tip.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show all reviews button if there are more than one */}
                    {reviewHistory.data.reviews.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <button
                          onClick={() => setShowAllReviews(!showAllReviews)}
                          className="text-sm font-medium text-purple-600 hover:text-purple-700"
                        >
                          {showAllReviews ? 'Hide' : 'Show'} All Reviews ({reviewHistory.data.reviews.length})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : cooldown.data?.lastReviewAt && !reviewHistory.data?.reviews ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-600">
                Your last review was generated on{' '}
                {new Date(cooldown.data.lastReviewAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                . Generate a new review to see insights.
              </p>
            </div>
          ) : !cooldown.data?.lastReviewAt && !generateReview.isPending ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-purple-400" />
              <p className="mt-4 text-sm font-medium text-slate-900">
                No reviews generated yet
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Click "Generate Review" to get AI-powered insights about your campaigns, adsets, budget, and creative performance.
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Performance trend
              </h2>
              <p className="text-sm text-slate-500">
                Spend, impressions, and clicks over time
              </p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trend
            </Badge>
          </div>
          <div className="space-y-3">
            {stats.trend.length === 0 ? (
              <p className="py-8 text-center text-slate-500">
                No trend data available
              </p>
            ) : (
              stats.trend.map((day, index) => {
                const maxSpend = Math.max(
                  ...stats.trend.map((d) => d.spend),
                  1,
                );
                const percentage =
                  maxSpend > 0 ? (day.spend / maxSpend) * 100 : 0;
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
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-40 text-right text-sm font-semibold text-slate-700">
                      ${day.spend.toFixed(2)} •{' '}
                      {day.impressions.toLocaleString()} impressions •{' '}
                      {day.clicks.toLocaleString()} clicks
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Zap className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Top campaigns
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.campaigns.length === 0 ? (
                <p className="text-slate-500">No campaign data available</p>
              ) : (
                stats.campaigns.slice(0, 10).map((campaign, index) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span className="max-w-[200px] truncate">
                        {campaign.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.roas !== undefined && (
                        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                          {campaign.roas.toFixed(2)}x ROAS
                        </Badge>
                      )}
                      <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                        ${campaign.spend.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-3">
                <Target className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Top ad sets
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              {stats.adsets.length === 0 ? (
                <p className="text-slate-500">No ad set data available</p>
              ) : (
                stats.adsets.slice(0, 10).map((adset, index) => (
                  <div
                    key={adset.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full border border-violet-200 bg-violet-50 text-violet-600">
                        {index + 1}
                      </Badge>
                      <span className="max-w-[200px] truncate">
                        {adset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {adset.roas !== undefined && (
                        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-600">
                          {adset.roas.toFixed(2)}x ROAS
                        </Badge>
                      )}
                      <Badge className="border border-violet-200 bg-violet-50 text-violet-600">
                        ${adset.spend.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-3">
              <Clock className="h-5 w-5 text-slate-700" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Performance metrics
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CPC
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ${stats.cpc.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Average cost per click
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CPM
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ${stats.cpm.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cost per 1,000 impressions
              </p>
            </div>
            {stats.reach !== undefined && stats.reach > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Frequency
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {stats.frequency?.toFixed(2) || 'N/A'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Average impressions per person
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedInsight?.type === 'action'
                ? 'Confirm Action'
                : 'Implement Suggestion'}
            </DialogTitle>
            <DialogDescription>
              {selectedInsight?.type === 'action'
                ? `Are you sure you want to pause "${selectedInsight?.entityName || 'this item'}"? This will stop all ads in this ${selectedInsight?.title.includes('Campaign') ? 'campaign' : 'ad set'}.`
                : selectedInsight?.title.includes('Scale')
                  ? `This will ${selectedInsight?.title.includes('Campaign') ? 'increase the campaign budget' : 'create a new optimized ad set'} based on "${selectedInsight?.entityName || 'top performer'}".`
                  : 'Please review the details below before proceeding.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedInsight?.type === 'action' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900">
                  ⚠️ Warning
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Pausing will immediately stop all ads. You can reactivate later
                  from Meta Ads Manager.
                </p>
              </div>
            ) : selectedInsight?.title.includes('Scale Campaign') ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    New Daily Budget ($)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter daily budget"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Recommended: 20-30% increase from current budget
                  </p>
                </div>
              </div>
            ) : (selectedInsight?.title.includes('Scale Ad Set') ||
              selectedInsight?.title.includes('Create')) &&
              selectedInsight?.entityName ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Ad Set Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter ad set name"
                    value={adSetNameInput}
                    onChange={(e) => setAdSetNameInput(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Daily Budget ($)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter daily budget"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The new ad set will be created paused for your review
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={
                pauseCampaign.isPending ||
                pauseAdSet.isPending ||
                scaleCampaign.isPending ||
                createOptimizedAdSet.isPending
              }
            >
              Cancel
            </Button>
            <Button
              variant={selectedInsight?.type === 'action' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={
                pauseCampaign.isPending ||
                pauseAdSet.isPending ||
                scaleCampaign.isPending ||
                createOptimizedAdSet.isPending ||
                (selectedInsight?.title.includes('Scale') && !budgetInput) ||
                (selectedInsight?.title.includes('Scale') &&
                  selectedInsight?.entityName &&
                  !adSetNameInput)
              }
            >
              {pauseCampaign.isPending ||
              pauseAdSet.isPending ||
              scaleCampaign.isPending ||
              createOptimizedAdSet.isPending
                ? 'Processing...'
                : selectedInsight?.type === 'action'
                  ? 'Pause Now'
                  : 'Implement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </main>
  );
}

export default function MetaAdsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </main>
      }
    >
      <MetaAdsInner />
    </Suspense>
  );
}
