import { type NextRequest, NextResponse } from 'next/server';
import { processEvents } from '@/integration/event-bus'; // side-effect registers all handlers

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processEvents();
  return NextResponse.json({ ok: true, ...result });
}
