import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/core/prisma/client';

const payloadSchema = z.object({
  eventId:         z.string().min(1),
  lmsEnrollmentId: z.string().min(1),
  status:          z.enum(['COMPLETED', 'FAILED', 'IN_PROGRESS']),
  score:           z.coerce.number().int().min(0).max(100).optional(),
  completedAt:     z.string().datetime().optional(),
});

const STATUS_MAP = {
  COMPLETED:   'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  FAILED:      'CANCELLED',
} as const;

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
  const secret = process.env.LMS_WEBHOOK_SECRET ?? '';
  if (!secret) {
    return NextResponse.json({ error: 'LMS webhook não configurado' }, { status: 503 });
  }

  const rawBody  = await req.text();
  const signature = req.headers.get('x-lms-signature') ?? '';
  const expected  = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (!timingSafeCompare(signature, expected)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  let raw: unknown;
  try { raw = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { lmsEnrollmentId, status, score, completedAt } = parsed.data;

  const plan = await prisma.trainingPlan.findUnique({
    where: { lmsEnrollmentId },
    select: { id: true, projectId: true },
  });

  if (!plan) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const trainingStatus = STATUS_MAP[status];

  await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.update({
      where: { id: plan.id },
      data: {
        status:      trainingStatus,
        lmsScore:    score,
        ...(status === 'IN_PROGRESS' && { startedAt: new Date() }),
        ...(status === 'COMPLETED'   && {
          completedAt: completedAt ? new Date(completedAt) : new Date(),
        }),
      },
    });

    if (status === 'COMPLETED') {
      await tx.eventoIntegracao.create({
        data: {
          tipo:    'training.completed',
          payload: { planId: plan.id, projectId: plan.projectId, lmsEnrollmentId, score },
          origem:  'COLLAB',
          status:  'PENDENTE',
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
