import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { registerWebhooks, listWebhooks } from '../../../../../lib/shopify';

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

  await registerWebhooks(shop, conn.accessToken).catch(() => {});
  const current = await listWebhooks(shop, conn.accessToken).catch(() => null);

  return NextResponse.json({
    ok: true,
    protectedFlag: process.env.PROTECTED_WEBHOOKS,
    webhooks: current,
  });
}
