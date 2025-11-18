import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { encryptSecure } from '@ai-ecom/api';
import * as Sentry from '@sentry/nextjs';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { code, state, error } = params;

  // Handle OAuth errors
  if (error) {
    console.error('[GA Callback] OAuth error:', error);
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/integrations', base);
    url.searchParams.set('ga_error', error);
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }

  // Verify state
  const stateCookie = req.cookies.get('ga_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.json({ error: 'invalid state' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_ANALYTICS_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google-analytics/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'missing Google Analytics OAuth credentials' },
      { status: 500 },
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('[GA Callback] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
    }

    // Try to get or create user - handle database errors gracefully
    let owner;
    try {
      owner = await prisma.user.upsert({
        where: { email: session.user.email },
        create: { email: session.user.email, name: session.user.name ?? null },
        update: {},
      });
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Database error';
      console.error('[GA Callback] Database error while upserting user:', errorMessage);
      console.error('[GA Callback] Full error:', dbError);
      
      // Log to Sentry in production/staging
      if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'staging') {
        Sentry.captureException(dbError, {
          tags: { component: 'google-analytics-callback', operation: 'user-upsert' },
          extra: { email: session.user.email },
        });
      }
      
      // Still redirect to success - OAuth worked, just database issue
      const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const url = new URL('/integrations', base);
      url.searchParams.set('ga_connected', '1');
      url.searchParams.set('ga_warning', 'database_unavailable');
      const res = NextResponse.redirect(url);
      res.cookies.set('ga_oauth_state', '', { maxAge: -1, path: '/' });
      return res;
    }

    // Fetch GA4 properties using Admin API
    // First, we need to list accounts, then properties
    let propertyId: string | null = null;
    let propertyName: string | null = null;
    let accountId: string | null = null;

    try {
      // Use Analytics Admin API to list accounts
      const accountsRes = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accounts',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );

      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as {
          accounts?: Array<{ name: string; displayName?: string }>;
        };
        
        if (accountsData.accounts && accountsData.accounts.length > 0) {
          accountId = accountsData.accounts[0].name.replace('accounts/', '');
          
          // List properties for the first account
          const propertiesRes = await fetch(
            `https://analyticsadmin.googleapis.com/v1beta/${accountsData.accounts[0].name}/properties`,
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            },
          );

          if (propertiesRes.ok) {
            const propertiesData = (await propertiesRes.json()) as {
              properties?: Array<{ name: string; displayName?: string }>;
            };
            
            if (propertiesData.properties && propertiesData.properties.length > 0) {
              propertyId = propertiesData.properties[0].name.replace('properties/', '');
              propertyName = propertiesData.properties[0].displayName || propertyId;
            }
          } else {
            const errorText = await propertiesRes.text();
            console.warn('[GA Callback] Failed to fetch properties:', errorText);
          }
        }
      } else {
        const errorText = await accountsRes.text();
        console.warn('[GA Callback] Failed to fetch accounts:', errorText);
      }
    } catch (error) {
      console.warn('[GA Callback] Failed to fetch GA4 properties', error);
      // Continue without property info - user can select later
    }

    // Try to save connection - handle database errors gracefully
    try {
      // Check if connection already exists for this user
      const existing = await prisma.connection.findFirst({
        where: {
          userId: owner.id,
          type: 'GOOGLE_ANALYTICS' as any,
        },
      });

      const metadata: Record<string, unknown> = {};
      if (propertyId) {
        metadata.propertyId = propertyId;
      }
      if (propertyName) {
        metadata.propertyName = propertyName;
      }
      if (accountId) {
        metadata.accountId = accountId;
      }

      if (existing) {
        // Update existing connection
        await prisma.connection.update({
          where: { id: existing.id },
          data: {
            accessToken: encryptSecure(tokenData.access_token),
            refreshToken: tokenData.refresh_token
              ? encryptSecure(tokenData.refresh_token)
              : existing.refreshToken,
            metadata: metadata,
          },
        });
      } else {
        // Create new connection
        await prisma.connection.create({
          data: {
            type: 'GOOGLE_ANALYTICS' as any,
            accessToken: encryptSecure(tokenData.access_token),
            refreshToken: tokenData.refresh_token
              ? encryptSecure(tokenData.refresh_token)
              : null,
            userId: owner.id,
            metadata: metadata,
          },
        });
      }

      // Try to log event (non-critical, continue if it fails)
      try {
        await logEvent(
          'google_analytics.connected',
          { userId: owner.id, propertyId },
          'connection',
          existing?.id || 'new',
        );
      } catch (logError) {
        console.warn('[GA Callback] Failed to log event:', logError);
      }
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Database error';
      console.error('[GA Callback] Database error while saving connection:', errorMessage);
      console.error('[GA Callback] Full error:', dbError);
      
      // Log to Sentry in production/staging
      if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'staging') {
        Sentry.captureException(dbError, {
          tags: { component: 'google-analytics-callback', operation: 'connection-save' },
          extra: { userId: owner.id, hasTokens: !!tokenData.access_token },
        });
      }
      
      // Still redirect to success - OAuth worked, just database issue
      const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const url = new URL('/integrations', base);
      url.searchParams.set('ga_connected', '1');
      url.searchParams.set('ga_warning', 'database_unavailable');
      if (propertyName) {
        url.searchParams.set('property', propertyName);
      }
      const res = NextResponse.redirect(url);
      res.cookies.set('ga_oauth_state', '', { maxAge: -1, path: '/' });
      return res;
    }

    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/integrations', base);
    url.searchParams.set('ga_connected', '1');
    if (propertyName) {
      url.searchParams.set('property', propertyName);
    }
    
    const res = NextResponse.redirect(url);
    res.cookies.set('ga_oauth_state', '', { maxAge: -1, path: '/' });
    return res;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GA Callback] Unexpected error:', errorMessage);
    console.error('[GA Callback] Full error:', error);
    
    // Log to Sentry in production/staging
    if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'staging') {
      Sentry.captureException(error, {
        tags: { component: 'google-analytics-callback', operation: 'oauth-flow' },
      });
    }
    
    // Show generic error to user, details only in logs
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/integrations', base);
    url.searchParams.set('ga_error', 'connection_failed');
    return NextResponse.redirect(url);
  }
}

