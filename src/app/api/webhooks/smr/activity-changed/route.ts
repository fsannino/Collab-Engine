import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { smrWebhookPayloadSchema } from '@/modules/impact/smr-webhook.schema';

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.SMR_WEBHOOK_SECRET ?? '';
  if (!secret) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 });
  }

  // Read raw body before any parsing so HMAC covers the exact bytes received
  const rawBody = await req.text();
  const signature = req.headers.get('x-smr-signature') ?? '';

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (!timingSafeCompare(signature, expected)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  // Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = smrWebhookPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { eventId, smrActivityId, status } = parsed.data;

  // Idempotency: skip if already successfully processed
  const existingLog = await prisma.smrWebhookLog.findUnique({
    where: { eventId },
    select: { id: true, status: true },
  });

  if (existingLog?.status === 'PROCESSED') {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Upsert log entry (handles retries from SMR)
  const log = await prisma.smrWebhookLog.upsert({
    where: { eventId },
    create: { eventId, payload: parsed.data as object, status: 'PROCESSING' },
    update: { payload: parsed.data as object, status: 'PROCESSING', error: null },
  });

  try {
    const activity = await prisma.impactActivity.findUnique({
      where: { smrActivityId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!activity || activity.deletedAt) {
      // Not linked — acknowledge so SMR doesn't retry endlessly
      await prisma.smrWebhookLog.update({
        where: { id: log.id },
        data: { status: 'IGNORED', error: `Atividade não vinculada: ${smrActivityId}` },
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (activity.status !== status) {
      await prisma.impactActivity.update({
        where: { id: activity.id },
        data: { status },
      });
    }

    await prisma.smrWebhookLog.update({
      where: { id: log.id },
      data: { status: 'PROCESSED', activityId: activity.id, processedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    // Fire-and-forget — don't throw if log update fails
    prisma.smrWebhookLog
      .update({ where: { id: log.id }, data: { status: 'FAILED', error: message } })
      .catch(() => {});

    // 500 signals SMR to retry with exponential backoff
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
