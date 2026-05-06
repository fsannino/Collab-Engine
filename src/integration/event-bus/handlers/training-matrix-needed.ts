import { prisma } from '@/core/prisma/client';
import { TRAINING_CATALOG } from '@/modules/training/training-catalog';
import type { ImpactDimension } from '@prisma/client';

export async function handleTrainingMatrixNeeded(
  payload: Record<string, unknown>,
): Promise<void> {
  const { impactId, projectId, tenantId, dimension, score, title } = payload as {
    impactId: string;
    projectId: string;
    tenantId: string;
    dimension: ImpactDimension;
    score: number;
    title: string;
  };

  // Only auto-generate for ORANGE (10-15) and RED (16-25) impacts
  if (score < 10) return;

  const suggestions = TRAINING_CATALOG[dimension] ?? [];
  if (suggestions.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.trainingMatrix.createMany({
      data: suggestions.map((s) => ({
        tenantId,
        projectId,
        impactId,
        title:     `${s.title} — ${title}`,
        dimension,
        durationH: s.durationH,
        mandatory: true,
        createdBy: 'system',
      })),
    });

    await tx.eventoIntegracao.create({
      data: {
        tipo:    'training.created',
        payload: { impactId, projectId, count: suggestions.length, auto: true },
        origem:  'COLLAB',
        status:  'PENDENTE',
      },
    });
  });
}
