import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma, logEvent } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { registerWebhooks, listWebhooks } from '../../../../lib/shopify';
import { encryptSecure } from '@ai-ecom/api';

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const secret = process.env.SHOPIFY_API_SECRET ?? '';
  const { hmac, shop, code, state } = params as Record<string, string>;
  if (!hmac || !shop || !code)
    return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const sorted = Object.keys(params)
    .filter((k) => k !== 'hmac')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const digest = crypto
    .createHmac('sha256', secret)
    .update(sorted)
    .digest('hex');
  if (digest !== hmac)
    return NextResponse.json({ error: 'invalid hmac' }, { status: 401 });

  const stateCookie = req.cookies.get('shopify_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.json({ error: 'invalid state' }, { status: 400 });
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: secret,
      code,
    }),
  });
  if (!tokenRes.ok)
    return NextResponse.json(
      { error: 'token exchange failed' },
      { status: 400 },
    );
  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    scope?: string;
  };

  // Attach connection to signed-in user if available (fallback to default)
  const session = await getServerSession(authOptions);
  const owner = session?.user?.email
    ? await prisma.user.upsert({
        where: { email: session.user.email },
        create: { email: session.user.email, name: session.user.name ?? null },
        update: {},
      })
    : await ensureDefaultUser();

  await prisma.connection.create({
    data: {
      type: 'SHOPIFY',
      accessToken: encryptSecure(tokenJson.access_token),
      shopDomain: shop,
      userId: owner.id,
    },
  });

  // Best-effort register webhooks for this shop
  await registerWebhooks(shop, tokenJson.access_token).catch(() => {});
  const current = await listWebhooks(shop, tokenJson.access_token).catch(
    () => null,
  );
  if (current)
    console.log('shopify webhooks now', current.status, current.json);

  // Seed mock events if enabled and no real webhooks present
  if (process.env.MOCK_WEBHOOKS === 'true') {
    await logEvent(
      'mock.shopify.orders/create',
      { shop, total_price: '199.00', email: 'customer@example.com' },
      'order',
      'mock-1001',
    );
    await logEvent(
      'mock.shopify.refunds/create',
      { shop, order_id: 'mock-1001', amount: '50.00' },
      'refund',
      'mock-r-1',
    );
  }

  const base = process.env.SHOPIFY_APP_URL || new URL(req.url).origin;
  const url = new URL('/integrations', base);
  // if store already existed, surface a toast via query param
  try {
    const existing = await prisma.connection.findFirst({
      where: { shopDomain: shop },
    });
    if (existing) url.searchParams.set('already', '1');
  } catch {}
  url.searchParams.set('connected', '1');
  url.searchParams.set('shop', shop);
  const res = NextResponse.redirect(url);
  res.cookies.set('shopify_oauth_state', '', { maxAge: -1, path: '/' });
  return res;
}

async function ensureDefaultUser() {
  return prisma.user.upsert({
    where: { email: 'founder@example.com' },
    create: { email: 'founder@example.com', name: 'Founder' },
    update: {},
  });
}
