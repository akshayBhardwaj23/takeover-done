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
  const { code, state, error, error_reason, error_description } = params;

  // Handle OAuth errors
  if (error || error_reason) {
    console.error('[Meta Ads Callback] OAuth error:', {
      error,
      error_reason,
      error_description,
    });
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/integrations', base);
    url.searchParams.set(
      'meta_ads_error',
      error || error_reason || 'oauth_error',
    );
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'missing code or state' },
      { status: 400 },
    );
  }

  // Verify state
  const stateCookie = req.cookies.get('meta_ads_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.json({ error: 'invalid state' }, { status: 400 });
  }

  const appId = process.env.META_ADS_APP_ID;
  const appSecret = process.env.META_ADS_APP_SECRET;
  const redirectUri =
    process.env.META_ADS_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/meta-ads/callback`;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'missing Meta Ads OAuth credentials' },
      { status: 500 },
    );
  }

  try {
    // Step 1: Exchange authorization code for short-lived access token (1-2 hours)
    const tokenUrl = new URL(
      'https://graph.facebook.com/v21.0/oauth/access_token',
    );
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code as string);

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Meta Ads Callback] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const shortLivedTokenData = (await tokenResponse.json()) as {
      access_token: string;
      token_type?: string;
      expires_in?: number;
    };

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenUrl = new URL(
      'https://graph.facebook.com/v21.0/oauth/access_token',
    );
    longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.set('client_id', appId);
    longLivedTokenUrl.searchParams.set('client_secret', appSecret);
    longLivedTokenUrl.searchParams.set(
      'fb_exchange_token',
      shortLivedTokenData.access_token,
    );

    const longLivedTokenResponse = await fetch(longLivedTokenUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let longLivedToken: string;
    let expiresIn: number | undefined;
    let exchangeToken: string | undefined;

    if (longLivedTokenResponse.ok) {
      const longLivedData = (await longLivedTokenResponse.json()) as {
        access_token: string;
        token_type?: string;
        expires_in?: number;
      };
      longLivedToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in;
      // Store the exchange token for refresh (it's the short-lived token)
      exchangeToken = shortLivedTokenData.access_token;
    } else {
      // Fallback to short-lived token if exchange fails
      console.warn(
        '[Meta Ads Callback] Long-lived token exchange failed, using short-lived token',
      );
      longLivedToken = shortLivedTokenData.access_token;
      expiresIn = shortLivedTokenData.expires_in;
    }

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
      const errorMessage =
        dbError instanceof Error ? dbError.message : 'Database error';
      console.error(
        '[Meta Ads Callback] Database error while upserting user:',
        errorMessage,
      );
      console.error('[Meta Ads Callback] Full error:', dbError);

      // Log to Sentry in production/staging
      if (
        process.env.NODE_ENV === 'production' ||
        process.env.ENVIRONMENT === 'staging'
      ) {
        Sentry.captureException(dbError, {
          tags: { component: 'meta-ads-callback', operation: 'user-upsert' },
          extra: { email: session.user.email },
        });
      }

      // Still redirect to success - OAuth worked, just database issue
      const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const url = new URL('/integrations', base);
      url.searchParams.set('meta_ads_connected', '1');
      url.searchParams.set('meta_ads_warning', 'database_unavailable');
      const res = NextResponse.redirect(url);
      res.cookies.set('meta_ads_oauth_state', '', { maxAge: -1, path: '/' });
      return res;
    }

    // Step 3: Fetch user's ad accounts
    let adAccountId: string | null = null;
    let adAccountName: string | null = null;

    try {
      // Get user's ID first (needed for ad accounts endpoint)
      const meResponse = await fetch(
        `https://graph.facebook.com/v21.0/me?access_token=${longLivedToken}`,
      );

      if (meResponse.ok) {
        const meData = (await meResponse.json()) as {
          id: string;
          name?: string;
        };

        // Get ad accounts for the user
        const adAccountsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${meData.id}/adaccounts?fields=id,name,account_id,account_status&limit=50&access_token=${longLivedToken}`,
        );

        if (adAccountsResponse.ok) {
          const adAccountsData = (await adAccountsResponse.json()) as {
            data?: Array<{
              id: string;
              name?: string;
              account_id?: string;
              account_status?: number;
            }>;
          };

          if (adAccountsData.data && adAccountsData.data.length > 0) {
            // Find first active account or just use first one
            const activeAccount =
              adAccountsData.data.find(
                (acc) => acc.account_status === 1, // 1 = ACTIVE
              ) || adAccountsData.data[0];

            adAccountId = activeAccount.id; // This is in format 'act_123456789'
            adAccountName =
              activeAccount.name || activeAccount.account_id || adAccountId;
          }
        } else {
          const errorText = await adAccountsResponse.text();
          console.warn(
            '[Meta Ads Callback] Failed to fetch ad accounts:',
            errorText,
          );
        }
      } else {
        const errorText = await meResponse.text();
        console.warn(
          '[Meta Ads Callback] Failed to fetch user info:',
          errorText,
        );
      }
    } catch (error) {
      console.warn('[Meta Ads Callback] Failed to fetch ad accounts', error);
      // Continue without ad account info - user can select later
    }

    // Try to save connection - handle database errors gracefully
    try {
      // Check if connection already exists for this user
      const existing = await prisma.connection.findFirst({
        where: {
          userId: owner.id,
          type: 'META_ADS' as any,
        },
      });

      const metadata: Record<string, unknown> = {};
      if (adAccountId) {
        metadata.adAccountId = adAccountId;
      }
      if (adAccountName) {
        metadata.adAccountName = adAccountName;
      }
      if (exchangeToken) {
        metadata.exchangeToken = exchangeToken;
      }
      if (expiresIn) {
        metadata.tokenExpiresAt = new Date(
          Date.now() + expiresIn * 1000,
        ).toISOString();
      }

      if (existing) {
        // Update existing connection
        await prisma.connection.update({
          where: { id: existing.id },
          data: {
            accessToken: encryptSecure(longLivedToken),
            refreshToken: exchangeToken
              ? encryptSecure(exchangeToken)
              : existing.refreshToken,
            metadata: metadata as any,
          },
        });
      } else {
        // Create new connection
        await prisma.connection.create({
          data: {
            type: 'META_ADS' as any,
            accessToken: encryptSecure(longLivedToken),
            refreshToken: exchangeToken ? encryptSecure(exchangeToken) : null,
            userId: owner.id,
            metadata: metadata as any,
          },
        });
      }

      // Try to log event (non-critical, continue if it fails)
      try {
        await logEvent(
          'meta_ads.connected',
          { userId: owner.id, adAccountId },
          'connection',
          existing?.id || 'new',
        );
      } catch (logError) {
        console.warn('[Meta Ads Callback] Failed to log event:', logError);
      }
    } catch (dbError) {
      const errorMessage =
        dbError instanceof Error ? dbError.message : 'Database error';
      console.error(
        '[Meta Ads Callback] Database error while saving connection:',
        errorMessage,
      );
      console.error('[Meta Ads Callback] Full error:', dbError);

      // Log to Sentry in production/staging
      if (
        process.env.NODE_ENV === 'production' ||
        process.env.ENVIRONMENT === 'staging'
      ) {
        Sentry.captureException(dbError, {
          tags: {
            component: 'meta-ads-callback',
            operation: 'connection-save',
          },
          extra: { userId: owner.id, hasTokens: !!longLivedToken },
        });
      }

      // Still redirect to success - OAuth worked, just database issue
      const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const url = new URL('/integrations', base);
      url.searchParams.set('meta_ads_connected', '1');
      url.searchParams.set('meta_ads_warning', 'database_unavailable');
      if (adAccountName) {
        url.searchParams.set('account', adAccountName);
      }
      const res = NextResponse.redirect(url);
      res.cookies.set('meta_ads_oauth_state', '', { maxAge: -1, path: '/' });
      return res;
    }

    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/integrations', base);
    url.searchParams.set('meta_ads_connected', '1');
    if (adAccountName) {
      url.searchParams.set('account', adAccountName);
    }

    const res = NextResponse.redirect(url);
    res.cookies.set('meta_ads_oauth_state', '', { maxAge: -1, path: '/' });
    return res;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[Meta Ads Callback] Unexpected error:', errorMessage);
    console.error('[Meta Ads Callback] Full error:', error);

    // Log to Sentry in production/staging
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ENVIRONMENT === 'staging'
    ) {
      Sentry.captureException(error, {
        tags: { component: 'meta-ads-callback', operation: 'oauth-flow' },
      });
    }

    // Show generic error to user, details only in logs
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/integrations', base);
    url.searchParams.set('meta_ads_error', 'connection_failed');
    return NextResponse.redirect(url);
  }
}
