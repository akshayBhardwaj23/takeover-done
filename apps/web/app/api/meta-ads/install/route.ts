import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  const appId = process.env.META_ADS_APP_ID;
  const redirectUri =
    process.env.META_ADS_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/meta-ads/callback`;

  if (!appId) {
    return NextResponse.json(
      { error: 'missing META_ADS_APP_ID server env' },
      { status: 500 },
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Meta OAuth scopes
  const scopes = 'ads_read,ads_management';

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('meta_ads_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  return res;
}
