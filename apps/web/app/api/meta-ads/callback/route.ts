import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { encryptSecure } from '@ai-ecom/api';
import * as Sentry from '@sentry/nextjs';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

/**
 * Get the base URL for OAuth redirects, ensuring HTTPS for production domains.
 * Falls back to request origin if NEXTAUTH_URL is not set or invalid.
 */
function getBaseUrl(req: NextRequest): string {
  // Check X-Forwarded-Proto header first (for proxy/load balancer scenarios)
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  
  // Try NEXTAUTH_URL first
  let baseUrl = process.env.NEXTAUTH_URL;
  
  // If not set, construct from request
  if (!baseUrl) {
    // Use forwarded host if available, otherwise use request URL
    if (forwardedHost) {
      const protocol = forwardedProto === 'https' ? 'https' : 'https'; // Always use HTTPS for production
      baseUrl = `${protocol}://${forwardedHost}`;
    } else {
      baseUrl = new URL(req.url).origin;
    }
  }

  // Parse the URL to check protocol and hostname
  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname;
    
    // Force HTTPS for non-localhost domains (always, regardless of what we found)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      url.protocol = 'https:';
      return url.origin;
    }
    
    return url.origin;
  } catch {
    // If URL parsing fails, fall back to request origin
    const fallback = new URL(req.url).origin;
    // Force HTTPS for non-localhost
    if (!fallback.includes('localhost') && !fallback.includes('127.0.0.1')) {
      return fallback.replace('http://', 'https://');
    }
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { code, state, error, error_reason, error_description } = params;

  // Get base URL for redirects
  const baseUrl = getBaseUrl(req);

  // Handle OAuth errors
  if (error || error_reason) {
    console.error('[Meta Ads Callback] OAuth error:', {
      error,
      error_reason,
      error_description,
    });
    const url = new URL('/integrations', baseUrl);
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
  
  // If META_ADS_REDIRECT_URI is explicitly set, use it but ensure HTTPS for production
  let redirectUri = process.env.META_ADS_REDIRECT_URI;
  if (redirectUri) {
    try {
      const uri = new URL(redirectUri);
      const hostname = uri.hostname;
      // Force HTTPS for non-localhost domains
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        uri.protocol = 'https:';
        redirectUri = uri.toString();
      }
    } catch {
      // If parsing fails, fall back to constructed URI
      redirectUri = `${baseUrl}/api/meta-ads/callback`;
    }
  } else {
    redirectUri = `${baseUrl}/api/meta-ads/callback`;
  }

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
      const url = new URL('/integrations', baseUrl);
      url.searchParams.set('meta_ads_connected', '1');
      url.searchParams.set('meta_ads_warning', 'database_unavailable');
      const res = NextResponse.redirect(url);
      res.cookies.set('meta_ads_oauth_state', '', { maxAge: -1, path: '/' });
      return res;
    }

    // Store temporary tokens in cookies for ad account selection
    // User will select their ad account on the next page
    const res = NextResponse.redirect(new URL('/meta-ads/select-account', baseUrl));
    
    // Store tokens temporarily in cookies (expire in 10 minutes)
    res.cookies.set('meta_ads_temp_access_token', encryptSecure(longLivedToken), {
      maxAge: 10 * 60, // 10 minutes
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    if (exchangeToken) {
      res.cookies.set('meta_ads_temp_refresh_token', encryptSecure(exchangeToken), {
        maxAge: 10 * 60, // 10 minutes
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    
    res.cookies.set('meta_ads_temp_user_id', owner.id, {
      maxAge: 10 * 60, // 10 minutes
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    if (expiresIn) {
      res.cookies.set('meta_ads_temp_expires_in', expiresIn.toString(), {
        maxAge: 10 * 60, // 10 minutes
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    
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
    const url = new URL('/integrations', baseUrl);
    url.searchParams.set('meta_ads_error', 'connection_failed');
    return NextResponse.redirect(url);
  }
}
