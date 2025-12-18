import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_ANALYTICS_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google-analytics/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'missing GOOGLE_ANALYTICS_CLIENT_ID server env' },
      { status: 500 },
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Get return URL from query params (for automatic reconnection flow)
  const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/google-analytics';

  // Google OAuth scopes
  const scopes = 'https://www.googleapis.com/auth/analytics.readonly';

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline'); // Required for refresh token
  authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('ga_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  // Store return URL for redirect after successful reconnection
  res.cookies.set('ga_oauth_return_url', returnUrl, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  return res;
}
