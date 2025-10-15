import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO(cursor): Exchange code for tokens and store Connection.
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  console.log('Gmail OAuth callback', params);
  return NextResponse.json({ ok: true });
}
