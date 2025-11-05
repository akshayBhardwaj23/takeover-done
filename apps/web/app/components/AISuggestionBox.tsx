'use client';

import { useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { 
  Sparkles, 
  RefreshCw, 
  Clock, 
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  Zap,
} from 'lucide-react';

interface Insight {
  title: string;
  body: string;
  action?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sales' | 'customer' | 'operations' | 'marketing';
}

interface AISuggestionBoxProps {
  shop?: string;
  className?: string;
}

export default function AISuggestionBox({ shop, className = '' }: AISuggestionBoxProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch aggregated data from tRPC
  const aggregatedData = trpc.getAggregatedInsights.useQuery(
    { shop },
    { 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Generate insights when data is available
  useEffect(() => {
    if (aggregatedData.data && insights.length === 0 && !isGenerating) {
      generateInsights();
    }
  }, [aggregatedData.data]);

  const generateInsights = async () => {
    if (!aggregatedData.data) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aggregatedData.data),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      setInsights(result.insights || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to generate insights');
      console.error('Error generating insights:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTimeAgo = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'from-red-500 to-orange-500';
      case 'medium': return 'from-amber-500 to-yellow-500';
      case 'low': return 'from-blue-500 to-indigo-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales': return '💰';
      case 'customer': return '😊';
      case 'operations': return '⚙️';
      case 'marketing': return '📢';
      default: return '💡';
    }
  };

  if (aggregatedData.isLoading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200/50">
        <div className="flex items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-indigo-300 border-t-indigo-600" />
          <p className="text-indigo-700 font-medium">Loading AI insights...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="overflow-hidden border-2 border-indigo-200/50 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 shadow-2xl">
        {/* Header */}
        <div className="border-b border-indigo-200/50 bg-white/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AI Commerce Advisor
                </h3>
                <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  Last updated {getTimeAgo()}
                </p>
              </div>
            </div>
            <Button
              onClick={generateInsights}
              disabled={isGenerating}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all hover:scale-105"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Failed to generate insights</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {insights.length === 0 && !isGenerating && !error && (
            <div className="text-center py-12">
              <div className="mx-auto w-fit rounded-full bg-indigo-100 p-6 mb-4">
                <Lightbulb className="h-12 w-12 text-indigo-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mb-2">No insights yet</p>
              <p className="text-sm text-slate-600 mb-4">
                Connect your store and start receiving intelligent suggestions
              </p>
              <Button
                onClick={generateInsights}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <Card
                key={index}
                className="group relative overflow-hidden border-2 border-white/50 bg-white/80 backdrop-blur-sm p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:border-indigo-300/50 animate-fadeInUp"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                {/* Animated gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getPriorityColor(insight.priority)} opacity-5 group-hover:opacity-10 transition-opacity`} />
                
                {/* Priority indicator */}
                <div className="absolute top-3 right-3">
                  <Badge 
                    className={`bg-gradient-to-r ${getPriorityColor(insight.priority)} text-white text-xs font-bold`}
                  >
                    {insight.priority}
                  </Badge>
                </div>

                <div className="relative">
                  {/* Category emoji */}
                  <div className="text-3xl mb-3">
                    {getCategoryIcon(insight.category)}
                  </div>

                  {/* Title */}
                  <h4 className="text-lg font-black text-slate-900 mb-2 pr-16 leading-tight">
                    {insight.title}
                  </h4>

                  {/* Body */}
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">
                    {insight.body}
                  </p>

                  {/* Action button */}
                  {insight.action && (
                    <a
                      href={insight.actionUrl || '#'}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group/link"
                    >
                      <Zap className="h-4 w-4" />
                      {insight.action}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Loading state */}
          {isGenerating && insights.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-white/50 animate-pulse border-2 border-white/50"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with stats */}
        <div className="border-t border-indigo-200/50 bg-white/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span>
                Analyzing {aggregatedData.data?.shopifyMetrics ? 'Shopify' : ''} 
                {aggregatedData.data?.shopifyMetrics && aggregatedData.data?.emailMetrics ? ' + ' : ''}
                {aggregatedData.data?.emailMetrics ? 'Email' : ''} data
              </span>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 font-semibold">
              <Sparkles className="h-3 w-3 mr-1" />
              {insights.length} Active insights
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

