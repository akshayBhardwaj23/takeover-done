import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '@ai-ecom/db';
import { decryptSecure } from '@ai-ecom/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get GA connection
    const connection = await prisma.connection.findFirst({
      where: {
        userId: user.id,
        type: 'GOOGLE_ANALYTICS' as any,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No GA connection found' }, { status: 404 });
    }

    // Refresh token first to get a valid access token
    let accessToken = decryptSecure(connection.accessToken);
    const refreshToken = connection.refreshToken
      ? decryptSecure(connection.refreshToken)
      : null;

    const results: Record<string, any> = {
      connection: {
        id: connection.id,
        hasAccessToken: !!connection.accessToken,
        hasRefreshToken: !!connection.refreshToken,
        metadata: connection.metadata,
      },
      tests: {},
    };

    // Try to refresh token if we have refresh token
    if (refreshToken) {
      try {
        const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;

        if (clientId && clientSecret) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            accessToken = refreshData.access_token;
            results.tokenRefresh = {
              success: true,
              message: 'Token refreshed before API calls',
            };
          } else {
            const errorText = await refreshRes.text();
            results.tokenRefresh = {
              success: false,
              error: errorText,
            };
          }
        }
      } catch (error: any) {
        results.tokenRefresh = {
          success: false,
          error: error.message,
        };
      }
    }

    // Test 1: List accounts
    try {
      const accountsRes = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accounts',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      results.tests.listAccounts = {
        status: accountsRes.status,
        statusText: accountsRes.statusText,
        ok: accountsRes.ok,
      };

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        results.tests.listAccounts.data = accountsData;
        results.tests.listAccounts.success = true;

        // Test 2: List properties if we have accounts
        if (accountsData.accounts && accountsData.accounts.length > 0) {
          const firstAccount = accountsData.accounts[0];
          const accountName = firstAccount.name;

          const propertiesRes = await fetch(
            `https://analyticsadmin.googleapis.com/v1beta/${accountName}/properties`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          results.tests.listProperties = {
            status: propertiesRes.status,
            statusText: propertiesRes.statusText,
            ok: propertiesRes.ok,
          };

          if (propertiesRes.ok) {
            const propertiesData = await propertiesRes.json();
            results.tests.listProperties.data = propertiesData;
            results.tests.listProperties.success = true;

            // Test 3: Fetch analytics data if we have properties
            if (propertiesData.properties && propertiesData.properties.length > 0) {
              const firstProperty = propertiesData.properties[0];
              const propertyId = firstProperty.name.replace('properties/', '');

              const endDate = new Date().toISOString().split('T')[0];
              const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

              const analyticsRes = await fetch(
                `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    dateRanges: [{ startDate, endDate }],
                    metrics: [
                      { name: 'sessions' },
                      { name: 'activeUsers' },
                      { name: 'screenPageViews' },
                    ],
                  }),
                },
              );

              results.tests.fetchAnalytics = {
                status: analyticsRes.status,
                statusText: analyticsRes.statusText,
                ok: analyticsRes.ok,
                propertyId,
                dateRange: { startDate, endDate },
              };

              if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                results.tests.fetchAnalytics.data = analyticsData;
                results.tests.fetchAnalytics.success = true;
              } else {
                const errorText = await analyticsRes.text();
                results.tests.fetchAnalytics.error = errorText;
              }
            }
          } else {
            const errorText = await propertiesRes.text();
            results.tests.listProperties.error = errorText;
            
            // If 404, try global properties endpoint
            if (propertiesRes.status === 404) {
              console.log('Trying global properties endpoint...');
              try {
                const globalPropertiesRes = await fetch(
                  'https://analyticsadmin.googleapis.com/v1beta/properties',
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  },
                );

                results.tests.listPropertiesGlobal = {
                  status: globalPropertiesRes.status,
                  statusText: globalPropertiesRes.statusText,
                  ok: globalPropertiesRes.ok,
                };

                if (globalPropertiesRes.ok) {
                  const globalPropertiesData = await globalPropertiesRes.json();
                  results.tests.listPropertiesGlobal.data = globalPropertiesData;
                  results.tests.listPropertiesGlobal.success = true;
                  
                  // Filter by account if we have properties
                  if (globalPropertiesData.properties) {
                    const accountProperties = globalPropertiesData.properties.filter(
                      (prop: any) => prop.parent === accountName
                    );
                    results.tests.listPropertiesGlobal.filteredForAccount = {
                      accountName,
                      totalProperties: globalPropertiesData.properties.length,
                      accountProperties: accountProperties.length,
                      properties: accountProperties.map((p: any) => ({
                        id: p.name.replace('properties/', ''),
                        name: p.displayName,
                        parent: p.parent,
                      })),
                    };
                  }
                } else {
                  const errorText = await globalPropertiesRes.text();
                  results.tests.listPropertiesGlobal.error = errorText.substring(0, 500);
                }
              } catch (globalError: any) {
                results.tests.listPropertiesGlobal = {
                  error: globalError.message,
                };
              }
            }
          }
        }
      } else {
        const errorText = await accountsRes.text();
        results.tests.listAccounts.error = errorText;
      }
    } catch (error: any) {
      results.tests.listAccounts = {
        error: error.message,
        stack: error.stack,
      };
    }

    // Test 4: Token refresh
    if (refreshToken) {
      try {
        const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;

        if (clientId && clientSecret) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }),
          });

          results.tests.refreshToken = {
            status: refreshRes.status,
            statusText: refreshRes.statusText,
            ok: refreshRes.ok,
          };

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            results.tests.refreshToken.success = true;
            results.tests.refreshToken.hasNewToken = !!refreshData.access_token;
          } else {
            const errorText = await refreshRes.text();
            results.tests.refreshToken.error = errorText;
          }
        } else {
          results.tests.refreshToken = {
            error: 'Missing GOOGLE_ANALYTICS_CLIENT_ID or GOOGLE_ANALYTICS_CLIENT_SECRET',
          };
        }
      } catch (error: any) {
        results.tests.refreshToken = {
          error: error.message,
        };
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('[Test GA API] Error:', error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

