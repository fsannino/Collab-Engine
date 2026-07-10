import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lmsCompletionWebhookSchema } from '@/modules/lms/lms.schema';

/**
 * POST /api/lms/completion
 * Webhook endpoint que o LMS externo chama para reportar conclusão de treinamento.
 * Autenticado via header x-api-key que deve bater com LMS_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.LMS_WEBHOOK_SECRET;
  if (secret) {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = lmsCompletionWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { pessoaTreinamentoId, status, score, completedAt } = parsed.data;

  const pt = await prisma.pessoaTreinamento.findUnique({
    where: { id: pessoaTreinamentoId },
  });

  if (!pt) {
    return NextResponse.json({ error: 'PessoaTreinamento not found' }, { status: 404 });
  }

  const statusMap: Record<string, string> = {
    COMPLETED: 'CONCLUIDO',
    FAILED: 'AUSENTE',
    IN_PROGRESS: 'EM_ANDAMENTO',
  };

  await prisma.pessoaTreinamento.update({
    where: { id: pessoaTreinamentoId },
    data: { status: statusMap[status] as never },
  });

  // Se há uma inscrição em turma, atualizar nota
  if (score !== undefined) {
    const inscricao = await prisma.inscricaoTurma.findFirst({
      where: { pessoaTreinamentoId },
      orderBy: { createdAt: 'desc' },
    });
    if (inscricao) {
      await prisma.inscricaoTurma.update({
        where: { id: inscricao.id },
        data: {
          notaExame: score,
          presente: status === 'COMPLETED',
          aprovado: status === 'COMPLETED',
        },
      });
    }
  }

  // Dispara evento para o event bus
  await prisma.eventoIntegracao.create({
    data: {
      tipo: 'training.completed',
      payload: { pessoaTreinamentoId, status, score, completedAt },
      origem: 'COLLAB',
    },
  });

  return NextResponse.json({ ok: true });
}
