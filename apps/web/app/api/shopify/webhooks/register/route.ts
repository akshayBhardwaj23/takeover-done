import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { registerWebhooks, listWebhooks } from '../../../../../lib/shopify';
import { decryptSecure } from '@ai-ecom/api';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

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
  const appUrl = process.env.SHOPIFY_APP_URL ?? 'http://localhost:3000';
  const expectedWebhookUrl = `${appUrl}/api/webhooks/shopify`;

  console.log('[Webhook Registration]', {
    shop,
    appUrl,
    expectedWebhookUrl,
    protectedFlag: process.env.PROTECTED_WEBHOOKS,
  });

  const registrationResults = await registerWebhooks(shop, accessToken).catch(
    (err) => {
      console.error(
        '[Webhook Registration] ❌ Failed to register webhooks:',
        err,
      );
      return null;
    },
  );
  const current = await listWebhooks(shop, accessToken).catch(() => null);

  // Log registered webhooks for debugging
  if (current?.json?.webhooks) {
    console.log('[Webhook Registration] ✅ Registered webhooks:', {
      count: current.json.webhooks.length,
      webhooks: current.json.webhooks.map((w: any) => ({
        topic: w.topic,
        address: w.address,
        format: w.format,
        created_at: w.created_at,
      })),
    });
  }

  return NextResponse.json({
    ok: true,
    protectedFlag: process.env.PROTECTED_WEBHOOKS,
    expectedWebhookUrl,
    registrationResults,
    webhooks: current,
  });
}
