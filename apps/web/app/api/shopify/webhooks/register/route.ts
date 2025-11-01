import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { registerWebhooks, listWebhooks } from '../../../../../lib/shopify';
import { decryptSecure } from '@ai-ecom/api';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop') ?? '';
  if (!shop)
    return NextResponse.json({ error: 'missing shop' }, { status: 400 });

  const conn = await prisma.connection.findFirst({
    where: { type: 'SHOPIFY', shopDomain: shop },
  });
  if (!conn)
    return NextResponse.json(
      { error: 'no connection for shop' },
      { status: 404 },
    );

  // Decrypt the access token before using it
  const accessToken = decryptSecure(conn.accessToken);
  await registerWebhooks(shop, accessToken).catch((err) => {
    console.error('Failed to register webhooks:', err);
  });
  const current = await listWebhooks(shop, accessToken).catch(() => null);

  return NextResponse.json({
    ok: true,
    protectedFlag: process.env.PROTECTED_WEBHOOKS,
    webhooks: current,
  });
}
