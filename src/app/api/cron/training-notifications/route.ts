import { type NextRequest, NextResponse } from 'next/server';
import { runTrainingNotifications } from '@/modules/training/notifications';

// Issue 027 — cron diário de notificações de treinamento.
// Mesmo padrão de autenticação do /api/cron/process-events (Bearer CRON_SECRET).

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await runTrainingNotifications();
  return NextResponse.json({ ok: true, ...summary });
}
