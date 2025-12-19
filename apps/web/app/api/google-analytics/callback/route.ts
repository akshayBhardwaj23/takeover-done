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

    // Store tokens temporarily in encrypted cookies for property selection
    // Tokens will be saved to database after user selects a property
    const encryptedAccessToken = encryptSecure(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptSecure(tokenData.refresh_token)
      : '';

    // Check if this is a reconnection (has existing connection)
    const existingConnection = await prisma.connection.findFirst({
      where: {
        userId: owner.id,
        type: 'GOOGLE_ANALYTICS',
      } as any,
    });

    // If reconnecting, update existing connection directly
    if (existingConnection) {
      try {
        await prisma.connection.update({
          where: { id: existingConnection.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || existingConnection.refreshToken,
            updatedAt: new Date(),
          },
        });

        // Get return URL from cookie (for automatic reconnection flow)
        const returnUrl = req.cookies.get('ga_oauth_return_url')?.value || '/google-analytics';
        const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
        const url = new URL(returnUrl, base);
        
        const res = NextResponse.redirect(url);
        // Clear OAuth state and return URL cookies
        res.cookies.set('ga_oauth_state', '', { maxAge: -1, path: '/' });
        res.cookies.set('ga_oauth_return_url', '', { maxAge: -1, path: '/' });
        return res;
      } catch (updateError) {
        console.error('[GA Callback] Error updating existing connection:', updateError);
        // Fall through to property selection flow
      }
    }

    // New connection - always redirect to property selection page first
    // Don't use returnUrl for new connections - user must select property first
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = new URL('/google-analytics/select-property', base);
    
    const res = NextResponse.redirect(url);
    // Clear OAuth state and return URL cookies
    res.cookies.set('ga_oauth_state', '', { maxAge: -1, path: '/' });
    res.cookies.set('ga_oauth_return_url', '', { maxAge: -1, path: '/' });
    // Store encrypted tokens temporarily (10 minutes expiry)
    res.cookies.set('ga_temp_access_token', encryptedAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    if (encryptedRefreshToken) {
      res.cookies.set('ga_temp_refresh_token', encryptedRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
    }
    // Store userId for verification
    res.cookies.set('ga_temp_user_id', owner.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    
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

