import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * Get the base URL for OAuth redirects, ensuring HTTPS for production domains.
 * Falls back to request origin if NEXTAUTH_URL is not set or invalid.
 */
function getBaseUrl(req: NextRequest): string {
  // Check X-Forwarded-Proto header first (for proxy/load balancer scenarios)
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost =
    req.headers.get('x-forwarded-host') || req.headers.get('host');

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
  const appId = process.env.META_ADS_APP_ID;
  const baseUrl = getBaseUrl(req);

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
