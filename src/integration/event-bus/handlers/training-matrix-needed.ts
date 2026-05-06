import type { ImpactDimension } from '@prisma/client';

// Issue 023 — geração automática de plano de treinamento (Sprint 4)
// Placeholder until auto-generation from impact is implemented.
export async function handleTrainingMatrixNeeded(
  payload: Record<string, unknown>,
): Promise<void> {
  const { score } = payload as { score: number; dimension: ImpactDimension };
  if (score < 10) return;
  // TODO Issue 023: auto-create TrainingPlan from impact dimension + catalog
}
