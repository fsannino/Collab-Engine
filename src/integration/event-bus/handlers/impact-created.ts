import { prisma } from '@/core/prisma/client';

export async function handleImpactCreated(
  payload: Record<string, unknown>,
): Promise<void> {
  const { impactId, projectId, dimension, score } = payload as {
    impactId: string;
    projectId: string;
    dimension: string;
    score: number;
  };

  // Find stakeholders with any missing ADKAR dimension
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

  if (stakeholders.length === 0) return;

  // Emit one review event per stakeholder with incomplete ADKAR
  await prisma.eventoIntegracao.createMany({
    data: stakeholders.map(s => ({
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
