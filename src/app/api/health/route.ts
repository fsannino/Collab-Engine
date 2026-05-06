import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
