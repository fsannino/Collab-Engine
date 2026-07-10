import { prisma } from '@/core/prisma/client';

/**
 * Handler para evento training.completed.
 * Atualiza readiness do projeto quando um treinamento é concluído via LMS.
 */
export async function handleTrainingCompleted(
  payload: Record<string, unknown>,
): Promise<void> {
  const { pessoaTreinamentoId } = payload as { pessoaTreinamentoId: string };
  if (!pessoaTreinamentoId) return;

  // Buscar o projeto associado para log
  const pt = await prisma.pessoaTreinamento.findUnique({
    where: { id: pessoaTreinamentoId },
    include: {
      trainingItem: {
        include: { plan: { select: { projectId: true } } },
      },
    },
  });

  if (!pt) return;

  // Verificar se todos os treinamentos do projeto estão concluídos
  const projectId = pt.trainingItem.plan.projectId;
  const stats = await prisma.pessoaTreinamento.groupBy({
    by: ['status'],
    where: {
      deletedAt: null,
      trainingItem: {
        deletedAt: null,
        plan: { projectId, deletedAt: null },
      },
    },
    _count: true,
  });

  const total = stats.reduce((sum, s) => sum + s._count, 0);
  const concluidos = stats.find((s) => s.status === 'CONCLUIDO')?._count ?? 0;
  const pctReadiness = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  // Se readiness atingiu 100%, disparar evento
  if (pctReadiness === 100) {
    await prisma.eventoIntegracao.create({
      data: {
        tipo: 'readiness.complete',
        payload: { projectId, pctReadiness },
        origem: 'COLLAB',
      },
    });
  }
}
