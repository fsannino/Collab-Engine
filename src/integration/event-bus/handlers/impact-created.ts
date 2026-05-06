import { prisma } from '@/core/prisma/client';

export async function handleImpactCreated(
  payload: Record<string, unknown>,
): Promise<void> {
  const { impactId, projectId, tenantId, dimension, score, title } = payload as {
    impactId: string;
    projectId: string;
    tenantId: string;
    dimension: string;
    score: number;
    title: string;
  };

  // 1. ADKAR review for stakeholders with incomplete assessments
  const stakeholders = await prisma.projectStakeholder.findMany({
    where: {
      projectId,
      deletedAt: null,
      OR: [
        { adkarA: null },
        { adkarD: null },
        { adkarK: null },
        { adkarAb: null },
        { adkarR: null },
      ],
    },
    select: { id: true },
  });

  if (stakeholders.length > 0) {
    await prisma.eventoIntegracao.createMany({
      data: stakeholders.map((s) => ({
        tipo: 'stakeholder.adkar-review-needed',
        payload: {
          projectStakeholderId: s.id,
          impactId,
          projectId,
          dimension,
          score,
          reason: `Novo impacto criado (score: ${score}, dimensão: ${dimension})`,
        },
        origem: 'COLLAB' as const,
        destino: 'COLLAB' as const,
        status: 'PENDENTE',
      })),
      skipDuplicates: true,
    });
  }

  // 2. Training matrix generation for medium/high/critical impacts
  await prisma.eventoIntegracao.create({
    data: {
      tipo:   'training.matrix-generation-needed',
      payload: { impactId, projectId, tenantId, dimension, score, title },
      origem: 'COLLAB',
      destino: 'COLLAB',
      status: 'PENDENTE',
    },
  });
}
