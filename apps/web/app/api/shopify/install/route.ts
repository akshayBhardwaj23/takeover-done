import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  // TODO(cursor): Implement Shopify OAuth install per PRD.
  const shop = req.nextUrl.searchParams.get('shop');
  if (!shop)
    return NextResponse.json({ error: 'missing shop' }, { status: 400 });
  const apiKey = process.env.SHOPIFY_API_KEY ?? '';
  const scopes = encodeURIComponent(
    process.env.SHOPIFY_SCOPES ?? 'read_orders',
  );
  const redirectUri = encodeURIComponent(
    `${process.env.SHOPIFY_APP_URL ?? 'http://localhost:3000'}/api/shopify/callback`,
  );
  if (!apiKey) {
    return NextResponse.json(
      { error: 'missing SHOPIFY_API_KEY server env' },
      { status: 500 },
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
  const res = NextResponse.redirect(installUrl);
  res.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
