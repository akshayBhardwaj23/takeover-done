import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 401 });

  const shop = req.nextUrl.searchParams.get('shop') || null;

  const events = await prisma.event.findMany({
    where: {
      type: 'predictive_insights.scenario_saved',
      ...(shop ? { entityId: shop } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // We can’t reliably filter by user without adding schema, so include userId in payload and filter here.
  const filtered = events.filter((e) => (e.payload as any)?.userId === user.id);

  return NextResponse.json({
    scenarios: filtered.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      shop: e.entityId,
      name: (e.payload as any)?.name ?? 'Scenario',
      payload: e.payload,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 401 });

  const body = await req.json();
  const shop = String(body?.shop || '');
  const name = String(body?.name || 'Scenario').slice(0, 80);
  const config = body?.config ?? {};
  const outputs = body?.outputs ?? {};

  if (!shop) {
    return NextResponse.json({ error: 'shop is required' }, { status: 400 });
  }

  const created = await prisma.event.create({
    data: {
      type: 'predictive_insights.scenario_saved',
      entity: 'shop',
      entityId: shop,
      payload: {
        userId: user.id,
        name,
        config,
        outputs,
        createdAt: new Date().toISOString(),
      } as any,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}

