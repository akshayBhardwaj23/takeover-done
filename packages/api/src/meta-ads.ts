import { decryptSecure } from './crypto';

export interface MetaAdAccount {
  adAccountId: string;
  adAccountName: string;
  accountStatus: number;
}

export interface MetaAdsInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  currency?: string; // Currency code (e.g., 'INR', 'USD')
  conversions?: number;
  conversionValue?: number;
  roas?: number;
  cpa?: number;
  reach?: number;
  frequency?: number;
  linkClicks?: number;
  postEngagement?: number;
  videoViews?: number;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions?: number;
    conversionValue?: number;
    roas?: number;
  }>;
  adsets: Array<{
    id: string;
    name: string;
    campaignId: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions?: number;
    conversionValue?: number;
    roas?: number;
  }>;
  trend: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions?: number;
    conversionValue?: number;
  }>;
}

/**
 * Exchange short-lived token for long-lived token
 */
export async function exchangeLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const appId = process.env.META_ADS_APP_ID;
  const appSecret = process.env.META_ADS_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('Missing Meta Ads OAuth credentials');
  }

  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Token exchange failed: ${errorText}`;

    // Handle specific error cases
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.message) {
        errorMessage = `Token exchange failed: ${errorData.error.message}`;
      }
      if (errorData.error?.code === 190) {
        errorMessage =
          'Token has expired. Please reconnect your Meta Ads account.';
      }
      if (errorData.error?.code === 10) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      }
    } catch {
      // Keep original error message if parsing fails
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  accessToken: string,
  exchangeToken: string | null,
): Promise<string> {
  // Check if token is expired or about to expire
  // If we have an exchange token, try to get a new long-lived token
  if (exchangeToken) {
    try {
      console.log('[Meta Ads] Refreshing access token...');
      const decryptedExchangeToken = decryptSecure(exchangeToken);
      const tokenData = await exchangeLongLivedToken(decryptedExchangeToken);
      console.log('[Meta Ads] Token refreshed successfully');
      return tokenData.access_token;
    } catch (error: any) {
      console.warn('[Meta Ads] Token refresh failed:', {
        message: error.message,
        error: error,
      });

      // Fall back to existing token if refresh fails
      try {
        const decryptedToken = decryptSecure(accessToken);
        console.log('[Meta Ads] Trying existing token...');

        // Try to validate the existing token by making a test call
        const testRes = await fetch(
          `https://graph.facebook.com/v21.0/me?access_token=${decryptedToken}`,
        );

        if (testRes.ok) {
          console.log('[Meta Ads] Existing token is still valid');
          return decryptedToken;
        }

        const errorText = await testRes.text();
        console.error('[Meta Ads] Existing token validation failed:', {
          status: testRes.status,
          error: errorText.substring(0, 200),
        });

        let errorMessage = `Token validation failed: ${testRes.status}`;

        // Handle specific error codes
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.code === 190) {
            errorMessage =
              'Access token has expired. Please reconnect your Meta Ads account.';
          } else if (errorData.error?.code === 10) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (errorData.error?.code === 200) {
            errorMessage =
              'Invalid permissions. Please reconnect with proper permissions.';
          } else if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // Keep original error message if parsing fails
          errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      } catch (validationError: any) {
        console.error(
          '[Meta Ads] Both token refresh and validation failed:',
          validationError.message,
        );
        throw new Error(
          `Token refresh and validation failed: ${error.message || 'Unknown error'}`,
        );
      }
    }
  }

  // If no exchange token, decrypt and use existing token
  console.log('[Meta Ads] No exchange token, using existing token');
  return decryptSecure(accessToken);
}

/**
 * List ad accounts for authenticated user
 */
export async function listAdAccounts(
  accessToken: string,
  exchangeToken: string | null,
): Promise<MetaAdAccount[]> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  try {
    // Get user's ID first
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${validToken}`,
    );

    if (!meRes.ok) {
      const errorText = await meRes.text();
      console.error('[Meta Ads] Failed to fetch user info:', {
        status: meRes.status,
        statusText: meRes.statusText,
        error: errorText,
      });

      let errorMessage = `Failed to fetch user info: ${meRes.status}`;

      // Handle specific error codes
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 190) {
          errorMessage =
            'Access token has expired. Please reconnect your Meta Ads account.';
        } else if (errorData.error?.code === 10) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (errorData.error?.code === 200) {
          errorMessage =
            'Invalid permissions. Please reconnect with proper permissions.';
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else {
          errorMessage = `${errorMessage} - ${errorText.substring(0, 200)}`;
        }
      } catch {
        errorMessage = `${errorMessage} - ${errorText.substring(0, 200)}`;
      }

      throw new Error(errorMessage);
    }

    const meData = (await meRes.json()) as { id: string; name?: string };

    // Get ad accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v21.0/${meData.id}/adaccounts?fields=id,name,account_id,account_status&limit=50&access_token=${validToken}`,
    );

    if (!adAccountsRes.ok) {
      const errorText = await adAccountsRes.text();
      console.error('[Meta Ads] Failed to fetch ad accounts:', {
        status: adAccountsRes.status,
        statusText: adAccountsRes.statusText,
        error: errorText,
      });

      let errorMessage = `Failed to fetch ad accounts: ${adAccountsRes.status}`;

      // Handle specific error codes
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 190) {
          errorMessage =
            'Access token has expired. Please reconnect your Meta Ads account.';
        } else if (errorData.error?.code === 10) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (errorData.error?.code === 200) {
          errorMessage =
            'Invalid permissions. Please reconnect with proper permissions (ads_read required).';
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else {
          errorMessage = `${errorMessage} - ${errorText.substring(0, 200)}`;
        }
      } catch {
        errorMessage = `${errorMessage} - ${errorText.substring(0, 200)}`;
      }

      throw new Error(errorMessage);
    }

    const adAccountsData = (await adAccountsRes.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        account_id?: string;
        account_status?: number;
      }>;
    };

    if (!adAccountsData.data || adAccountsData.data.length === 0) {
      return [];
    }

    return adAccountsData.data.map((account) => ({
      adAccountId: account.id,
      adAccountName: account.name || account.account_id || account.id,
      accountStatus: account.account_status || 0,
    }));
  } catch (error) {
    console.error('[Meta Ads] Error listing ad accounts:', error);
    throw error;
  }
}

/**
 * Fetch comprehensive ad insights from Meta Ads Insights API
 */
export async function fetchMetaAdsInsights(
  adAccountId: string,
  accessToken: string,
  exchangeToken: string | null,
  startDate: string,
  endDate: string,
): Promise<MetaAdsInsights> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  // Clean adAccountId (ensure it's in format 'act_123456789')
  const cleanAdAccountId = adAccountId.startsWith('act_')
    ? adAccountId
    : `act_${adAccountId.replace(/^act_/, '')}`;

  try {
    // First, fetch ad account details to get currency
    const accountUrl = new URL(
      `https://graph.facebook.com/v21.0/${cleanAdAccountId}`,
    );
    accountUrl.searchParams.set('fields', 'currency');
    accountUrl.searchParams.set('access_token', validToken);

    let currency = 'USD'; // Default to USD
    try {
      const accountRes = await fetch(accountUrl.toString());
      if (accountRes.ok) {
        const accountData = (await accountRes.json()) as { currency?: string };
        if (accountData.currency) {
          currency = accountData.currency;
        }
      }
    } catch (error) {
      console.warn('[Meta Ads] Failed to fetch currency, using USD as default:', error);
    }

    // Fetch insights for the account
    const insightsUrl = new URL(
      `https://graph.facebook.com/v21.0/${cleanAdAccountId}/insights`,
    );
    insightsUrl.searchParams.set(
      'fields',
      'spend,impressions,clicks,ctr,cpc,cpm,actions,action_values,reach,frequency,link_clicks,post_engagement,video_views',
    );
    insightsUrl.searchParams.set(
      'time_range',
      JSON.stringify({
        since: startDate,
        until: endDate,
      }),
    );
    insightsUrl.searchParams.set('level', 'account');
    insightsUrl.searchParams.set('access_token', validToken);

    const insightsRes = await fetch(insightsUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCtr = 0;
    let totalCpc = 0;
    let totalCpm = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalReach = 0;
    let totalFrequency = 0;
    let totalLinkClicks = 0;
    let totalPostEngagement = 0;
    let totalVideoViews = 0;

    if (insightsRes.ok) {
      const insightsData = (await insightsRes.json()) as {
        data?: Array<{
          spend?: string;
          impressions?: string;
          clicks?: string;
          ctr?: string;
          cpc?: string;
          cpm?: string;
          actions?: Array<{ action_type: string; value: string }>;
          action_values?: Array<{ action_type: string; value: string }>;
          reach?: string;
          frequency?: string;
          link_clicks?: string;
          post_engagement?: string;
          video_views?: string;
        }>;
      };

      if (insightsData.data && insightsData.data.length > 0) {
        const accountInsights = insightsData.data[0];
        totalSpend = parseFloat(accountInsights.spend || '0');
        totalImpressions = parseInt(accountInsights.impressions || '0', 10);
        totalClicks = parseInt(accountInsights.clicks || '0', 10);
        totalCtr = parseFloat(accountInsights.ctr || '0');
        totalCpc = parseFloat(accountInsights.cpc || '0');
        totalCpm = parseFloat(accountInsights.cpm || '0');
        totalReach = parseInt(accountInsights.reach || '0', 10);
        totalFrequency = parseFloat(accountInsights.frequency || '0');
        totalLinkClicks = parseInt(accountInsights.link_clicks || '0', 10);
        totalPostEngagement = parseInt(
          accountInsights.post_engagement || '0',
          10,
        );
        totalVideoViews = parseInt(accountInsights.video_views || '0', 10);

        // Extract conversions (purchase events)
        if (accountInsights.actions) {
          const purchaseAction = accountInsights.actions.find(
            (action) => action.action_type === 'purchase',
          );
          if (purchaseAction) {
            totalConversions = parseInt(purchaseAction.value || '0', 10);
          }
        }

        // Extract conversion value
        if (accountInsights.action_values) {
          const purchaseValue = accountInsights.action_values.find(
            (action) => action.action_type === 'purchase',
          );
          if (purchaseValue) {
            totalConversionValue = parseFloat(purchaseValue.value || '0');
          }
        }
      }
    }

    // Calculate ROAS
    const roas =
      totalSpend > 0 && totalConversionValue > 0
        ? totalConversionValue / totalSpend
        : undefined;

    // Calculate CPA
    const cpa =
      totalConversions > 0 && totalSpend > 0
        ? totalSpend / totalConversions
        : undefined;

    // Fetch campaigns with insights
    const campaignsUrl = new URL(
      `https://graph.facebook.com/v21.0/${cleanAdAccountId}/campaigns`,
    );
    campaignsUrl.searchParams.set('fields', 'id,name,status');
    campaignsUrl.searchParams.set('limit', '50');
    campaignsUrl.searchParams.set('access_token', validToken);

    const campaignsRes = await fetch(campaignsUrl.toString());
    let campaigns: Array<{
      id: string;
      name: string;
      status: string;
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cpc: number;
      cpm: number;
      conversions?: number;
      conversionValue?: number;
      roas?: number;
    }> = [];

    if (campaignsRes.ok) {
      const campaignsData = (await campaignsRes.json()) as {
        data?: Array<{ id: string; name?: string; status?: string }>;
      };

      if (campaignsData.data) {
        // Fetch insights for each campaign
        for (const campaign of campaignsData.data.slice(0, 20)) {
          // Limit to 20 campaigns to avoid rate limits
          const campaignInsightsUrl = new URL(
            `https://graph.facebook.com/v21.0/${campaign.id}/insights`,
          );
          campaignInsightsUrl.searchParams.set(
            'fields',
            'spend,impressions,clicks,ctr,cpc,cpm,actions,action_values',
          );
          campaignInsightsUrl.searchParams.set(
            'time_range',
            JSON.stringify({
              since: startDate,
              until: endDate,
            }),
          );
          campaignInsightsUrl.searchParams.set('access_token', validToken);

          try {
            const campaignInsightsRes = await fetch(
              campaignInsightsUrl.toString(),
            );
            if (campaignInsightsRes.ok) {
              const campaignInsightsData =
                (await campaignInsightsRes.json()) as {
                  data?: Array<{
                    spend?: string;
                    impressions?: string;
                    clicks?: string;
                    ctr?: string;
                    cpc?: string;
                    cpm?: string;
                    actions?: Array<{ action_type: string; value: string }>;
                    action_values?: Array<{
                      action_type: string;
                      value: string;
                    }>;
                  }>;
                };

              if (
                campaignInsightsData.data &&
                campaignInsightsData.data.length > 0
              ) {
                const insights = campaignInsightsData.data[0];
                const spend = parseFloat(insights.spend || '0');
                const impressions = parseInt(insights.impressions || '0', 10);
                const clicks = parseInt(insights.clicks || '0', 10);
                const ctr = parseFloat(insights.ctr || '0');
                const cpc = parseFloat(insights.cpc || '0');
                const cpm = parseFloat(insights.cpm || '0');

                let conversions = 0;
                let conversionValue = 0;

                if (insights.actions) {
                  const purchaseAction = insights.actions.find(
                    (action) => action.action_type === 'purchase',
                  );
                  if (purchaseAction) {
                    conversions = parseInt(purchaseAction.value || '0', 10);
                  }
                }

                if (insights.action_values) {
                  const purchaseValue = insights.action_values.find(
                    (action) => action.action_type === 'purchase',
                  );
                  if (purchaseValue) {
                    conversionValue = parseFloat(purchaseValue.value || '0');
                  }
                }

                const campaignRoas =
                  spend > 0 && conversionValue > 0
                    ? conversionValue / spend
                    : undefined;

                campaigns.push({
                  id: campaign.id,
                  name: campaign.name || 'Unnamed Campaign',
                  status: campaign.status || 'UNKNOWN',
                  spend,
                  impressions,
                  clicks,
                  ctr,
                  cpc,
                  cpm,
                  conversions,
                  conversionValue,
                  roas: campaignRoas,
                });
              }
            }
          } catch (error) {
            console.warn(
              `[Meta Ads] Failed to fetch insights for campaign ${campaign.id}:`,
              error,
            );
            // Continue with other campaigns
          }
        }
      }
    }

    // Fetch adsets with insights
    const adsetsUrl = new URL(
      `https://graph.facebook.com/v21.0/${cleanAdAccountId}/adsets`,
    );
    adsetsUrl.searchParams.set('fields', 'id,name,status,campaign_id');
    adsetsUrl.searchParams.set('limit', '50');
    adsetsUrl.searchParams.set('access_token', validToken);

    const adsetsRes = await fetch(adsetsUrl.toString());
    let adsets: Array<{
      id: string;
      name: string;
      campaignId: string;
      status: string;
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cpc: number;
      cpm: number;
      conversions?: number;
      conversionValue?: number;
      roas?: number;
    }> = [];

    if (adsetsRes.ok) {
      const adsetsData = (await adsetsRes.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          status?: string;
          campaign_id?: string;
        }>;
      };

      if (adsetsData.data) {
        // Fetch insights for each adset (limit to 20 to avoid rate limits)
        for (const adset of adsetsData.data.slice(0, 20)) {
          const adsetInsightsUrl = new URL(
            `https://graph.facebook.com/v21.0/${adset.id}/insights`,
          );
          adsetInsightsUrl.searchParams.set(
            'fields',
            'spend,impressions,clicks,ctr,cpc,cpm,actions,action_values',
          );
          adsetInsightsUrl.searchParams.set(
            'time_range',
            JSON.stringify({
              since: startDate,
              until: endDate,
            }),
          );
          adsetInsightsUrl.searchParams.set('access_token', validToken);

          try {
            const adsetInsightsRes = await fetch(adsetInsightsUrl.toString());
            if (adsetInsightsRes.ok) {
              const adsetInsightsData = (await adsetInsightsRes.json()) as {
                data?: Array<{
                  spend?: string;
                  impressions?: string;
                  clicks?: string;
                  ctr?: string;
                  cpc?: string;
                  cpm?: string;
                  actions?: Array<{ action_type: string; value: string }>;
                  action_values?: Array<{ action_type: string; value: string }>;
                }>;
              };

              if (adsetInsightsData.data && adsetInsightsData.data.length > 0) {
                const insights = adsetInsightsData.data[0];
                const spend = parseFloat(insights.spend || '0');
                const impressions = parseInt(insights.impressions || '0', 10);
                const clicks = parseInt(insights.clicks || '0', 10);
                const ctr = parseFloat(insights.ctr || '0');
                const cpc = parseFloat(insights.cpc || '0');
                const cpm = parseFloat(insights.cpm || '0');

                let conversions = 0;
                let conversionValue = 0;

                if (insights.actions) {
                  const purchaseAction = insights.actions.find(
                    (action) => action.action_type === 'purchase',
                  );
                  if (purchaseAction) {
                    conversions = parseInt(purchaseAction.value || '0', 10);
                  }
                }

                if (insights.action_values) {
                  const purchaseValue = insights.action_values.find(
                    (action) => action.action_type === 'purchase',
                  );
                  if (purchaseValue) {
                    conversionValue = parseFloat(purchaseValue.value || '0');
                  }
                }

                const adsetRoas =
                  spend > 0 && conversionValue > 0
                    ? conversionValue / spend
                    : undefined;

                adsets.push({
                  id: adset.id,
                  name: adset.name || 'Unnamed Ad Set',
                  campaignId: adset.campaign_id || '',
                  status: adset.status || 'UNKNOWN',
                  spend,
                  impressions,
                  clicks,
                  ctr,
                  cpc,
                  cpm,
                  conversions,
                  conversionValue,
                  roas: adsetRoas,
                });
              }
            }
          } catch (error) {
            console.warn(
              `[Meta Ads] Failed to fetch insights for adset ${adset.id}:`,
              error,
            );
            // Continue with other adsets
          }
        }
      }
    }

    // Fetch daily trend data
    const trend: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions?: number;
      conversionValue?: number;
    }> = [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Limit to 30 days for performance
    const maxDays = Math.min(days, 30);
    for (let i = 0; i <= maxDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const dayInsightsUrl = new URL(
          `https://graph.facebook.com/v21.0/${cleanAdAccountId}/insights`,
        );
        dayInsightsUrl.searchParams.set(
          'fields',
          'spend,impressions,clicks,actions,action_values',
        );
        dayInsightsUrl.searchParams.set(
          'time_range',
          JSON.stringify({
            since: dateStr,
            until: dateStr,
          }),
        );
        dayInsightsUrl.searchParams.set('level', 'account');
        dayInsightsUrl.searchParams.set('access_token', validToken);

        const dayRes = await fetch(dayInsightsUrl.toString());

        if (dayRes.ok) {
          const dayData = (await dayRes.json()) as {
            data?: Array<{
              spend?: string;
              impressions?: string;
              clicks?: string;
              actions?: Array<{ action_type: string; value: string }>;
              action_values?: Array<{ action_type: string; value: string }>;
            }>;
          };

          if (dayData.data && dayData.data.length > 0) {
            const dayInsights = dayData.data[0];
            const spend = parseFloat(dayInsights.spend || '0');
            const impressions = parseInt(dayInsights.impressions || '0', 10);
            const clicks = parseInt(dayInsights.clicks || '0', 10);

            let conversions = 0;
            let conversionValue = 0;

            if (dayInsights.actions) {
              const purchaseAction = dayInsights.actions.find(
                (action) => action.action_type === 'purchase',
              );
              if (purchaseAction) {
                conversions = parseInt(purchaseAction.value || '0', 10);
              }
            }

            if (dayInsights.action_values) {
              const purchaseValue = dayInsights.action_values.find(
                (action) => action.action_type === 'purchase',
              );
              if (purchaseValue) {
                conversionValue = parseFloat(purchaseValue.value || '0');
              }
            }

            trend.push({
              date: dateStr,
              spend,
              impressions,
              clicks,
              conversions,
              conversionValue,
            });
          } else {
            trend.push({ date: dateStr, spend: 0, impressions: 0, clicks: 0 });
          }
        }
      } catch (error) {
        console.warn(`[Meta Ads] Failed to fetch trend for ${dateStr}:`, error);
        trend.push({ date: dateStr, spend: 0, impressions: 0, clicks: 0 });
      }
    }

    return {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalCtr,
      cpc: totalCpc,
      cpm: totalCpm,
      currency: currency,
      conversions: totalConversions > 0 ? totalConversions : undefined,
      conversionValue:
        totalConversionValue > 0 ? totalConversionValue : undefined,
      roas,
      cpa,
      reach: totalReach > 0 ? totalReach : undefined,
      frequency: totalFrequency > 0 ? totalFrequency : undefined,
      linkClicks: totalLinkClicks > 0 ? totalLinkClicks : undefined,
      postEngagement: totalPostEngagement > 0 ? totalPostEngagement : undefined,
      videoViews: totalVideoViews > 0 ? totalVideoViews : undefined,
      campaigns: campaigns.sort((a, b) => b.spend - a.spend).slice(0, 10), // Top 10 by spend
      adsets: adsets.sort((a, b) => b.spend - a.spend).slice(0, 10), // Top 10 by spend
      trend,
    };
  } catch (error: any) {
    console.error('[Meta Ads] Error fetching insights:', error);

    // Enhance error message if it's an API error
    if (error?.message?.includes('190')) {
      throw new Error(
        'Access token has expired. Please reconnect your Meta Ads account.',
      );
    }
    if (
      error?.message?.includes('10') ||
      error?.message?.includes('rate limit')
    ) {
      throw new Error(
        'Rate limit exceeded. Please try again in a few minutes.',
      );
    }
    if (
      error?.message?.includes('200') ||
      error?.message?.includes('permission')
    ) {
      throw new Error(
        'Invalid permissions. Please reconnect with proper permissions (ads_read required).',
      );
    }

    throw error;
  }
}

/**
 * Pause or activate a campaign
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: 'PAUSED' | 'ACTIVE',
  accessToken: string,
  exchangeToken: string | null,
): Promise<{ success: boolean }> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${campaignId}`);
    url.searchParams.set('access_token', validToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to update campaign status: ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Keep original error message
      }

      throw new Error(errorMessage);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Meta Ads] Error updating campaign status:', error);
    throw error;
  }
}

/**
 * Pause or activate an ad set
 */
export async function updateAdSetStatus(
  adSetId: string,
  status: 'PAUSED' | 'ACTIVE',
  accessToken: string,
  exchangeToken: string | null,
): Promise<{ success: boolean }> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${adSetId}`);
    url.searchParams.set('access_token', validToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to update ad set status: ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Keep original error message
      }

      throw new Error(errorMessage);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Meta Ads] Error updating ad set status:', error);
    throw error;
  }
}

/**
 * Update campaign budget
 */
export async function updateCampaignBudget(
  campaignId: string,
  dailyBudget: number,
  accessToken: string,
  exchangeToken: string | null,
): Promise<{ success: boolean }> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  try {
    // Update with daily budget (convert to cents)
    const url = new URL(`https://graph.facebook.com/v21.0/${campaignId}`);
    url.searchParams.set('access_token', validToken);

    const budgetInCents = Math.round(dailyBudget * 100);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_budget: budgetInCents,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to update campaign budget: ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Keep original error message
      }

      throw new Error(errorMessage);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Meta Ads] Error updating campaign budget:', error);
    throw error;
  }
}

/**
 * Get ad set details for creating similar ad sets
 */
export async function getAdSetDetails(
  adSetId: string,
  accessToken: string,
  exchangeToken: string | null,
): Promise<{
  id: string;
  name: string;
  campaign_id: string;
  targeting: any;
  daily_budget?: number;
  optimization_goal?: string;
  billing_event?: string;
  bid_amount?: number;
}> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${adSetId}`);
    url.searchParams.set(
      'fields',
      'id,name,campaign_id,targeting,daily_budget,optimization_goal,billing_event,bid_amount',
    );
    url.searchParams.set('access_token', validToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch ad set: ${errorText}`);
    }

    const data = (await response.json()) as {
      id: string;
      name: string;
      campaign_id?: string;
      targeting?: any;
      daily_budget?: string;
      optimization_goal?: string;
      billing_event?: string;
      bid_amount?: string;
    };

    return {
      id: data.id,
      name: data.name,
      campaign_id: data.campaign_id || '',
      targeting: data.targeting || {},
      daily_budget: data.daily_budget
        ? parseFloat(data.daily_budget) / 100
        : undefined,
      optimization_goal: data.optimization_goal,
      billing_event: data.billing_event,
      bid_amount: data.bid_amount ? parseFloat(data.bid_amount) / 100 : undefined,
    };
  } catch (error: any) {
    console.error('[Meta Ads] Error fetching ad set details:', error);
    throw error;
  }
}

/**
 * Create a new ad set based on a top-performing ad set
 */
export async function createOptimizedAdSet(
  adAccountId: string,
  campaignId: string,
  sourceAdSetId: string,
  name: string,
  dailyBudget: number,
  accessToken: string,
  exchangeToken: string | null,
): Promise<{ id: string; success: boolean }> {
  const validToken = await getValidAccessToken(accessToken, exchangeToken);

  try {
    // Get source ad set details
    const sourceAdSet = await getAdSetDetails(
      sourceAdSetId,
      accessToken,
      exchangeToken,
    );

    // Clean adAccountId
    const cleanAdAccountId = adAccountId.startsWith('act_')
      ? adAccountId
      : `act_${adAccountId.replace(/^act_/, '')}`;

    // Create new ad set with similar targeting but optimized budget
    const url = new URL(
      `https://graph.facebook.com/v21.0/${cleanAdAccountId}/adsets`,
    );
    url.searchParams.set('access_token', validToken);

    const budgetInCents = Math.round(dailyBudget * 100);

    const adSetData: any = {
      name: name,
      campaign_id: campaignId,
      daily_budget: budgetInCents,
      optimization_goal: sourceAdSet.optimization_goal || 'OFFSITE_CONVERSIONS',
      billing_event: sourceAdSet.billing_event || 'IMPRESSIONS',
      status: 'PAUSED', // Start paused so user can review
      targeting: sourceAdSet.targeting || {},
    };

    // Add bid amount if available
    if (sourceAdSet.bid_amount) {
      adSetData.bid_amount = Math.round(sourceAdSet.bid_amount * 100);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adSetData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to create ad set: ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Keep original error message
      }

      throw new Error(errorMessage);
    }

    const result = (await response.json()) as { id: string };

    return { id: result.id, success: true };
  } catch (error: any) {
    console.error('[Meta Ads] Error creating optimized ad set:', error);
    throw error;
  }
}
