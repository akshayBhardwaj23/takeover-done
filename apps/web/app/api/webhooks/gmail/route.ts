import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // TODO(cursor): handle Gmail push notification / historyId updates
  const body = await req.json().catch(() => null);
  console.log('Gmail webhook received', body);
  return NextResponse.json({ ok: true });
}
