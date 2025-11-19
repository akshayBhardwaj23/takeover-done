import { decryptSecure } from './crypto';

export interface GA4Property {
  propertyId: string;
  propertyName: string;
  accountId: string;
}

export interface GA4AnalyticsData {
  sessions: number;
  users: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  revenue?: number;
  transactions?: number;
  conversionRate?: number;
  avgOrderValue?: number;
  trafficSources: Array<{ source: string; medium: string; sessions: number }>;
  topPages: Array<{ page: string; views: number }>;
  trend: Array<{ date: string; sessions: number; users: number; revenue?: number }>;
}

/**
 * Refresh Google OAuth access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google Analytics OAuth credentials');
  }

  const decryptedRefreshToken = decryptSecure(refreshToken);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string | null,
): Promise<string> {
  // Always try to refresh if refresh token exists (tokens expire quickly)
  if (refreshToken) {
    try {
      const tokenData = await refreshAccessToken(refreshToken);
      return tokenData.access_token;
    } catch (error: any) {
      // Fall back to existing token if refresh fails
      try {
        const decryptedToken = decryptSecure(accessToken);
        
        // Try to validate the existing token by making a test call
        const testRes = await fetch(
          'https://analyticsadmin.googleapis.com/v1beta/accounts',
          {
            headers: { Authorization: `Bearer ${decryptedToken}` },
          },
        );
        
        if (testRes.ok) {
          return decryptedToken;
        }
        
        const errorText = await testRes.text();
        console.error('[GA] Token validation failed:', {
          status: testRes.status,
          error: errorText.substring(0, 200),
        });
        throw new Error(`Token validation failed: ${testRes.status} - ${errorText.substring(0, 100)}`);
      } catch (validationError: any) {
        console.error('[GA] Both token refresh and validation failed:', validationError.message);
        throw new Error(`Token refresh and validation failed: ${error.message || 'Unknown error'}`);
      }
    }
  }
  
  // If no refresh token, decrypt and use existing token
  return decryptSecure(accessToken);
}

/**
 * List GA4 properties for authenticated user
 */
export async function listGA4Properties(
  accessToken: string,
  refreshToken: string | null,
): Promise<GA4Property[]> {
  const validToken = await getValidAccessToken(accessToken, refreshToken);

  try {
    // List accounts
    const accountsRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accounts',
      {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      },
    );

    if (!accountsRes.ok) {
      const errorText = await accountsRes.text();
      console.error('[GA] Failed to fetch accounts:', {
        status: accountsRes.status,
        statusText: accountsRes.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch accounts: ${accountsRes.status} ${accountsRes.statusText} - ${errorText}`);
    }

    const accountsData = (await accountsRes.json()) as {
      accounts?: Array<{ name: string; displayName?: string }>;
    };

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      return [];
    }

    const properties: GA4Property[] = [];

    // Fetch properties for each account
    for (const account of accountsData.accounts) {
      const accountId = account.name.replace('accounts/', '');
      
      try {
        // Try the account-specific properties endpoint
        const propertiesRes = await fetch(
          `https://analyticsadmin.googleapis.com/v1beta/${account.name}/properties`,
          {
            headers: {
              Authorization: `Bearer ${validToken}`,
            },
          },
        );

        if (propertiesRes.ok) {
          const propertiesData = (await propertiesRes.json()) as {
            properties?: Array<{ name: string; displayName?: string }>;
          };

          if (propertiesData.properties && propertiesData.properties.length > 0) {
            for (const property of propertiesData.properties) {
              const propertyId = property.name.replace('properties/', '');
              properties.push({
                propertyId,
                propertyName: property.displayName || propertyId,
                accountId,
              });
            }
          }
        } else if (propertiesRes.status === 404) {
          // 404 means this account doesn't have properties accessible via this endpoint
          // Try using the global properties endpoint with a filter
          const globalPropertiesRes = await fetch(
            `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${account.name}`,
            {
              headers: {
                Authorization: `Bearer ${validToken}`,
              },
            },
          );

          if (globalPropertiesRes.ok) {
            const globalPropertiesData = (await globalPropertiesRes.json()) as {
              properties?: Array<{ name: string; displayName?: string; parent?: string }>;
            };

            if (globalPropertiesData.properties && globalPropertiesData.properties.length > 0) {
              for (const property of globalPropertiesData.properties) {
                const propertyId = property.name.replace('properties/', '');
                properties.push({
                  propertyId,
                  propertyName: property.displayName || propertyId,
                  accountId,
                });
              }
            }
          } else {
            const errorText = await globalPropertiesRes.text();
            console.warn(`[GA] Global properties endpoint failed for account ${accountId}:`, {
              status: globalPropertiesRes.status,
              error: errorText.substring(0, 200),
            });
          }
        } else {
          const errorText = await propertiesRes.text();
          console.error(`[GA] Failed to fetch properties for account ${accountId}:`, {
            status: propertiesRes.status,
            statusText: propertiesRes.statusText,
            error: errorText.substring(0, 200),
          });
        }
      } catch (accountError: any) {
        console.error(`[GA] Error processing account ${accountId}:`, accountError.message);
        // Continue with next account
      }
    }

    return properties;
  } catch (error) {
    console.error('[GA] Error listing properties:', error);
    throw error;
  }
}

/**
 * Fetch analytics data from GA4 Data API
 */
export async function fetchGA4Analytics(
  propertyId: string,
  accessToken: string,
  refreshToken: string | null,
  startDate: string,
  endDate: string,
): Promise<GA4AnalyticsData> {
  const validToken = await getValidAccessToken(accessToken, refreshToken);

  // Clean propertyId (remove 'properties/' prefix if present)
  const cleanPropertyId = propertyId.replace(/^properties\//, '');

  try {
    // Fetch overview metrics
    const overviewRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
        }),
      },
    );

    if (!overviewRes.ok) {
      const errorText = await overviewRes.text();
      throw new Error(`GA4 API error: ${errorText}`);
    }

    const overviewData = (await overviewRes.json()) as {
      rows?: Array<{
        metricValues: Array<{ value: string }>;
      }>;
    };

    const row = overviewData.rows?.[0];
    const metrics = row?.metricValues || [];

    const sessions = parseInt(metrics[0]?.value || '0', 10);
    const users = parseInt(metrics[1]?.value || '0', 10);
    const pageViews = parseInt(metrics[2]?.value || '0', 10);
    const bounceRate = parseFloat(metrics[3]?.value || '0');
    const avgSessionDuration = parseFloat(metrics[4]?.value || '0');

    // Fetch e-commerce metrics (if available)
    let revenue = 0;
    let transactions = 0;
    let conversionRate = 0;
    let avgOrderValue = 0;

    try {
      const ecommerceRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'totalRevenue' },
              { name: 'transactions' },
              { name: 'ecommercePurchases' },
            ],
          }),
        },
      );

      if (ecommerceRes.ok) {
        const ecommerceData = (await ecommerceRes.json()) as {
          rows?: Array<{
            metricValues: Array<{ value: string }>;
          }>;
        };
        const ecommerceRow = ecommerceData.rows?.[0];
        const ecommerceMetrics = ecommerceRow?.metricValues || [];
        
        revenue = parseFloat(ecommerceMetrics[0]?.value || '0');
        transactions = parseInt(ecommerceMetrics[1]?.value || '0', 10);
        const purchases = parseInt(ecommerceMetrics[2]?.value || '0', 10);
        conversionRate = sessions > 0 ? (purchases / sessions) * 100 : 0;
        avgOrderValue = transactions > 0 ? revenue / transactions : 0;
      }
    } catch (error) {
      console.warn('[GA] E-commerce metrics not available:', error);
    }

    // Fetch traffic sources
    const trafficRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
          metrics: [{ name: 'sessions' }],
          limit: 10,
        }),
      },
    );

    const trafficSources: Array<{ source: string; medium: string; sessions: number }> = [];
    if (trafficRes.ok) {
      const trafficData = (await trafficRes.json()) as {
        rows?: Array<{
          dimensionValues: Array<{ value: string }>;
          metricValues: Array<{ value: string }>;
        }>;
      };
      
      if (trafficData.rows) {
        for (const row of trafficData.rows) {
          trafficSources.push({
            source: row.dimensionValues[0]?.value || 'direct',
            medium: row.dimensionValues[1]?.value || 'none',
            sessions: parseInt(row.metricValues[0]?.value || '0', 10),
          });
        }
      }
    }

    // Fetch top pages
    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          limit: 10,
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        }),
      },
    );

    const topPages: Array<{ page: string; views: number }> = [];
    if (pagesRes.ok) {
      const pagesData = (await pagesRes.json()) as {
        rows?: Array<{
          dimensionValues: Array<{ value: string }>;
          metricValues: Array<{ value: string }>;
        }>;
      };
      
      if (pagesData.rows) {
        for (const row of pagesData.rows) {
          topPages.push({
            page: row.dimensionValues[0]?.value || '',
            views: parseInt(row.metricValues[0]?.value || '0', 10),
          });
        }
      }
    }

    // Fetch daily trend data
    const trend: Array<{ date: string; sessions: number; users: number; revenue?: number }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Limit to 30 days for performance
    const maxDays = Math.min(days, 30);
    for (let i = 0; i <= maxDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const dayRes = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${validToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dateRanges: [{ startDate: dateStr, endDate: dateStr }],
              metrics: [
                { name: 'sessions' },
                { name: 'activeUsers' },
                { name: 'totalRevenue' },
              ],
            }),
          },
        );

        if (dayRes.ok) {
          const dayData = (await dayRes.json()) as {
            rows?: Array<{
              metricValues: Array<{ value: string }>;
            }>;
          };
          const dayRow = dayData.rows?.[0];
          const dayMetrics = dayRow?.metricValues || [];
          
          trend.push({
            date: dateStr,
            sessions: parseInt(dayMetrics[0]?.value || '0', 10),
            users: parseInt(dayMetrics[1]?.value || '0', 10),
            revenue: parseFloat(dayMetrics[2]?.value || '0'),
          });
        }
      } catch (error) {
        console.warn(`[GA] Failed to fetch trend for ${dateStr}:`, error);
        trend.push({ date: dateStr, sessions: 0, users: 0 });
      }
    }

    return {
      sessions,
      users,
      pageViews,
      bounceRate,
      avgSessionDuration,
      revenue,
      transactions,
      conversionRate,
      avgOrderValue,
      trafficSources,
      topPages,
      trend,
    };
  } catch (error) {
    console.error('[GA] Error fetching analytics:', error);
    throw error;
  }
}
