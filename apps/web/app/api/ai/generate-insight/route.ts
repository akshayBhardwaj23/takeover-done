import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface AnalyticsData {
  shopifyMetrics?: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    refundRate: number;
    fulfillmentTime: number;
    weekOverWeekChange?: {
      revenue: number;
      orders: number;
      refunds: number;
    };
  };
  emailMetrics?: {
    totalEmails: number;
    avgResponseTime: number;
    sentimentScore: number;
    topComplaints: string[];
    weekOverWeekChange?: {
      volume: number;
      negativeSentiment: number;
    };
  };
}

interface Insight {
  title: string;
  body: string;
  action?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sales' | 'customer' | 'operations' | 'marketing';
}

export async function POST(req: NextRequest) {
  try {
    const data: AnalyticsData = await req.json();
    
    // Generate insights based on the data
    const insights: Insight[] = [];
    
    // Shopify insights
    if (data.shopifyMetrics) {
      const { weekOverWeekChange, refundRate, fulfillmentTime, avgOrderValue } = data.shopifyMetrics;
      
      // Revenue trend
      if (weekOverWeekChange?.revenue !== undefined) {
        if (weekOverWeekChange.revenue < -10) {
          insights.push({
            title: `📉 Sales dropped ${Math.abs(weekOverWeekChange.revenue).toFixed(0)}%`,
            body: `Revenue declined this week. ${refundRate > 5 ? 'High refund rate and ' : ''}${fulfillmentTime > 5 ? 'delayed shipments may be contributing factors' : 'Consider reviewing pricing and promotions'}.`,
            action: 'View Sales Analytics',
            actionUrl: '/shopify-analytics',
            priority: 'high',
            category: 'sales',
          });
        } else if (weekOverWeekChange.revenue > 15) {
          insights.push({
            title: `📈 Strong sales growth +${weekOverWeekChange.revenue.toFixed(0)}%`,
            body: 'Revenue is trending up. Consider scaling successful campaigns and maintaining current fulfillment speed.',
            action: 'View Trends',
            actionUrl: '/shopify-analytics',
            priority: 'medium',
            category: 'sales',
          });
        }
      }
      
      // Refund rate
      if (refundRate > 8) {
        insights.push({
          title: '⚠️ High refund rate detected',
          body: `${refundRate.toFixed(1)}% of orders are being refunded. Review product quality, shipping accuracy, and customer expectations.`,
          action: 'Analyze Refunds',
          actionUrl: '/analytics',
          priority: 'high',
          category: 'operations',
        });
      }
      
      // Fulfillment time
      if (fulfillmentTime > 3) {
        insights.push({
          title: '🚚 Slow fulfillment times',
          body: `Average ${fulfillmentTime.toFixed(1)} days to fulfill. Faster shipping can reduce refunds and improve satisfaction.`,
          action: 'Review Orders',
          actionUrl: '/shopify-analytics',
          priority: 'medium',
          category: 'operations',
        });
      }
      
      // AOV optimization
      if (avgOrderValue < 50) {
        insights.push({
          title: '💰 Low average order value',
          body: `Current AOV is $${avgOrderValue.toFixed(2)}. Consider upsell bundles, free shipping thresholds, or product recommendations.`,
          action: 'Optimize AOV',
          actionUrl: '/shopify-analytics',
          priority: 'medium',
          category: 'sales',
        });
      }
    }
    
    // Email insights
    if (data.emailMetrics) {
      const { weekOverWeekChange, sentimentScore, topComplaints, avgResponseTime } = data.emailMetrics;
      
      // Email volume spike
      if (weekOverWeekChange?.volume && weekOverWeekChange.volume > 30) {
        insights.push({
          title: '📧 Email volume spiked',
          body: `Support emails increased ${weekOverWeekChange.volume.toFixed(0)}% this week. ${topComplaints.length > 0 ? `Top issue: ${topComplaints[0]}.` : 'Monitor for emerging issues.'}`,
          action: 'View Support Metrics',
          actionUrl: '/analytics',
          priority: 'high',
          category: 'customer',
        });
      }
      
      // Negative sentiment
      if (sentimentScore < -0.2 || (weekOverWeekChange?.negativeSentiment && weekOverWeekChange.negativeSentiment > 20)) {
        insights.push({
          title: '😟 Customer sentiment declining',
          body: `Negative feedback increased. ${topComplaints.length > 0 ? `Common complaints: ${topComplaints.slice(0, 2).join(', ')}.` : 'Review recent interactions and AI responses.'}`,
          action: 'Check Feedback',
          actionUrl: '/analytics',
          priority: 'high',
          category: 'customer',
        });
      }
      
      // Response time
      if (avgResponseTime > 120) {
        insights.push({
          title: '⏱️ Slow response times',
          body: `Average ${(avgResponseTime / 60).toFixed(1)} hours to respond. Enable more AI automation to reduce wait times.`,
          action: 'Setup Automation',
          actionUrl: '/integrations',
          priority: 'medium',
          category: 'operations',
        });
      }
      
      // Top complaints analysis
      if (topComplaints.length > 0) {
        const discountMentioned = topComplaints.some(c => 
          c.toLowerCase().includes('discount') || 
          c.toLowerCase().includes('coupon') ||
          c.toLowerCase().includes('promo')
        );
        
        if (discountMentioned) {
          insights.push({
            title: '🎟️ Discount confusion detected',
            body: 'Multiple customers asking about promotions. Consider clearer discount communication or extending campaign validity.',
            action: 'Review Promotions',
            actionUrl: '/shopify-analytics',
            priority: 'medium',
            category: 'marketing',
          });
        }
      }
    }
    
    // If we have both metrics, create combined insights
    if (data.shopifyMetrics && data.emailMetrics) {
      const { weekOverWeekChange: shopifyChange } = data.shopifyMetrics;
      const { weekOverWeekChange: emailChange } = data.emailMetrics;
      
      // Correlation insight
      if (shopifyChange?.revenue && shopifyChange.revenue < -10 && 
          emailChange?.negativeSentiment && emailChange.negativeSentiment > 15) {
        insights.push({
          title: '🔗 Revenue drop correlates with feedback',
          body: 'Sales decline matches increased negative sentiment. Focus on resolving customer complaints to recover revenue.',
          action: 'Priority Actions',
          actionUrl: '/analytics',
          priority: 'high',
          category: 'customer',
        });
      }
    }
    
    // Sort by priority and limit to 5 insights
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedInsights = insights
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5);
    
    // If no insights, provide positive/neutral ones
    if (sortedInsights.length === 0) {
      sortedInsights.push({
        title: '✨ Everything looks good',
        body: 'Your store metrics are healthy. Keep monitoring for trends and continue optimizing customer experience.',
        priority: 'low',
        category: 'operations',
      });
      
      sortedInsights.push({
        title: '🚀 Ready for growth',
        body: 'Consider expanding your AI automation to handle more customer inquiries and free up team time.',
        action: 'Explore Automation',
        actionUrl: '/integrations',
        priority: 'low',
        category: 'operations',
      });
    }
    
    return NextResponse.json({ 
      insights: sortedInsights,
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

