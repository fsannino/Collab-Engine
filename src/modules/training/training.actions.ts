'use server';

import { prisma } from '@/core/prisma/client';
import { getSession } from '@/core/auth/session';
import type { ActionResult } from '@/shared/types/action-result';
import type { TrainingMatrix, TrainingPlan } from '@prisma/client';
import {
  createTrainingMatrixSchema,
  assignTrainingPlanSchema,
  updateTrainingStatusSchema,
  generateMatrixFromImpactSchema,
} from './training.schema';
import { TRAINING_CATALOG } from './training-catalog';

async function getTenantGuard(projectId: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true },
  });
}

export async function createTrainingMatrixAction(
  input: unknown,
): Promise<ActionResult<TrainingMatrix>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createTrainingMatrixSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const project = await getTenantGuard(parsed.data.projectId, session.tenantId);
  if (!project) return { ok: false, error: 'Projeto não encontrado' };

  const matrix = await prisma.trainingMatrix.create({
    data: { ...parsed.data, tenantId: session.tenantId, createdBy: session.userId },
  });

  return { ok: true, data: matrix };
}

export async function assignTrainingPlanAction(
  input: unknown,
): Promise<ActionResult<TrainingPlan>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = assignTrainingPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { matrixId, projectId, userId, stakeholderId, dueDate } = parsed.data;

  const matrix = await prisma.trainingMatrix.findFirst({
    where: { id: matrixId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!matrix) return { ok: false, error: 'Trilha não encontrada' };

  const plan = await prisma.trainingPlan.create({
    data: {
      matrixId,
      projectId,
      userId,
      stakeholderId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  return { ok: true, data: plan };
}

export async function updateTrainingStatusAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = updateTrainingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { planId, status, notes } = parsed.data;

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id: planId,
      deletedAt: null,
      matrix: { tenantId: session.tenantId, deletedAt: null },
    },
    select: { id: true, projectId: true },
  });
  if (!plan) return { ok: false, error: 'Plano não encontrado' };

  await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.update({
      where: { id: planId },
      data: {
        status,
        notes,
        ...(status === 'IN_PROGRESS' && { startedAt: new Date() }),
        ...(status === 'COMPLETED'   && { completedAt: new Date() }),
      },
    });

    if (status === 'COMPLETED') {
      await tx.eventoIntegracao.create({
        data: {
          tipo:    'training.completed',
          payload: { planId, projectId: plan.projectId },
          origem:  'COLLAB',
          status:  'PENDENTE',
        },
      });
    }
  });

  return { ok: true, data: { id: planId } };
}

export async function generateMatrixFromImpactAction(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = generateMatrixFromImpactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { projectId, impactId } = parsed.data;

  const impact = await prisma.changeImpact.findFirst({
    where: { id: impactId, projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, dimension: true, title: true },
  });
  if (!impact) return { ok: false, error: 'Impacto não encontrado' };

  const suggestions = TRAINING_CATALOG[impact.dimension] ?? [];
  if (suggestions.length === 0) return { ok: true, data: { count: 0 } };

  await prisma.$transaction(async (tx) => {
    await tx.trainingMatrix.createMany({
      data: suggestions.map((s) => ({
        tenantId:  session.tenantId,
        projectId,
        impactId,
        title:     `${s.title} — ${impact.title}`,
        dimension: impact.dimension,
        durationH: s.durationH,
        mandatory: true,
        createdBy: session.userId,
      })),
    });

    await tx.eventoIntegracao.create({
      data: {
        tipo:    'training.created',
        payload: { impactId, projectId, count: suggestions.length },
        origem:  'COLLAB',
        status:  'PENDENTE',
      },
    });
  });

  return { ok: true, data: { count: suggestions.length } };
}
