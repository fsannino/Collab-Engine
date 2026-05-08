import { NextResponse } from 'next/server';
import { runTrainingNotificationCron } from '@/modules/training/notification-cron';

// Vercel Cron: runs daily at 08:00 UTC (see vercel.json)
// Protected by CRON_SECRET header — set same value in Vercel env and vercel.json
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const results = await runTrainingNotificationCron();
    const totals = results.reduce(
      (acc, r) => ({ sent: acc.sent + r.sent, skipped: acc.skipped + r.skipped, errors: acc.errors + r.errors }),
      { sent: 0, skipped: 0, errors: 0 }
    );
    return NextResponse.json({ ok: true, results, totals });
  } catch (err) {
    console.error('[cron/training-notifications]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
