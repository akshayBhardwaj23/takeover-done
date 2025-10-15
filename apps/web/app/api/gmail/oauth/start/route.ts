import { NextResponse } from 'next/server';

export async function GET() {
  // TODO(cursor): Initiate Gmail OAuth with required scopes for inbox read.
  return NextResponse.json({ ok: true, note: 'Gmail OAuth start placeholder' });
}
