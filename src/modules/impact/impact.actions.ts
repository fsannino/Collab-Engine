'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { calculateScore } from '@/shared/governance/scoring';
import type { ActionResult } from '@/shared/types/action-result';
import type { ChangeImpact } from '@prisma/client';
import {
  createImpactSchema,
  updateImpactSchema,
  linkActivitySchema,
  updateActivityStatusSchema,
  linkAreaSchema,
  addAcompanhamentoSchema,
  closeImpactSchema,
} from './impact.schema';
import { linkSmrActivitySchema } from './smr-webhook.schema';

async function getImpactForTenant(impactId: string, tenantId: string) {
  return prisma.changeImpact.findFirst({
    where: { id: impactId, tenantId, deletedAt: null },
  });
}

export async function createImpactAction(
  input: unknown,
): Promise<ActionResult<ChangeImpact>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createImpactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { projectId, title, description, dimension, severityScore, extentScore, mitigation, activities, areaIds } = parsed.data;
  const score = calculateScore(severityScore, extentScore);

  const impact = await prisma.changeImpact.create({
    data: {
      tenantId: session.tenantId,
      projectId,
      title,
      description,
      dimension,
      status: 'DRAFT',
      severityScore,
      extentScore,
      score,
      mitigation,
      createdBy: session.userId,
      activities: activities.length > 0 ? { create: activities } : undefined,
      areas:      areaIds.length > 0    ? { create: areaIds.map((areaId) => ({ areaId })) } : undefined,
      acompanhamentos: {
        create: {
          newStatus:  'DRAFT',
          newScore:   score,
          note:       'Impacto criado',
          changedBy:  session.userId,
        },
      },
    },
  });

  return { ok: true, data: impact };
}

export async function updateImpactAction(
  input: unknown,
): Promise<ActionResult<ChangeImpact>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = updateImpactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { id, severityScore, extentScore, status: newStatus, ...rest } = parsed.data;

  const existing = await getImpactForTenant(id, session.tenantId);
  if (!existing) return { ok: false, error: 'Impacto não encontrado' };

  const finalSeverity = severityScore ?? existing.severityScore;
  const finalExtent   = extentScore   ?? existing.extentScore;
  const score         = calculateScore(finalSeverity, finalExtent);
  const scoreChanged  = score !== existing.score;
  const statusChanged = newStatus !== undefined && newStatus !== existing.status;

  const impact = await prisma.$transaction(async (tx) => {
    const updated = await tx.changeImpact.update({
      where: { id },
      data: {
        ...rest,
        severityScore: finalSeverity,
        extentScore:   finalExtent,
        score,
        status:    newStatus,
        updatedBy: session.userId,
      },
    });

    if (statusChanged || scoreChanged) {
      await tx.impactAcompanhamento.create({
        data: {
          impactId:       id,
          previousStatus: existing.status,
          newStatus:      newStatus ?? existing.status,
          previousScore:  existing.score,
          newScore:       score,
          changedBy:      session.userId,
        },
      });
    }

    return updated;
  });

  return { ok: true, data: impact };
}

export async function linkActivityToImpactAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = linkActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { impactId, ...activityData } = parsed.data;
  const impact = await getImpactForTenant(impactId, session.tenantId);
  if (!impact) return { ok: false, error: 'Impacto não encontrado' };

  const activity = await prisma.impactActivity.create({
    data: { impactId, ...activityData },
    select: { id: true },
  });

  return { ok: true, data: activity };
}

export async function updateActivityStatusAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = updateActivityStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { activityId, status } = parsed.data;

  const activity = await prisma.impactActivity.findFirst({
    where: {
      id: activityId,
      deletedAt: null,
      impact: { tenantId: session.tenantId, deletedAt: null },
    },
    select: { id: true },
  });
  if (!activity) return { ok: false, error: 'Atividade não encontrada' };

  await prisma.impactActivity.update({ where: { id: activityId }, data: { status } });

  return { ok: true, data: { id: activityId } };
}

export async function linkSmrActivityAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = linkSmrActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { activityId, smrActivityId } = parsed.data;

  const activity = await prisma.impactActivity.findFirst({
    where: {
      id: activityId,
      deletedAt: null,
      impact: { tenantId: session.tenantId, deletedAt: null },
    },
    select: { id: true },
  });
  if (!activity) return { ok: false, error: 'Atividade não encontrada' };

  await prisma.impactActivity.update({
    where: { id: activityId },
    data: { smrActivityId },
  });

  return { ok: true, data: { id: activityId } };
}

export async function linkAreaToImpactAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = linkAreaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { impactId, areaId, note } = parsed.data;
  const impact = await getImpactForTenant(impactId, session.tenantId);
  if (!impact) return { ok: false, error: 'Impacto não encontrado' };

  const existing = await prisma.impactArea.findUnique({
    where: { impactId_areaId: { impactId, areaId } },
  });

  let id: string;
  if (existing) {
    await prisma.impactArea.update({
      where: { impactId_areaId: { impactId, areaId } },
      data: { note, deletedAt: null },
    });
    id = existing.id;
  } else {
    ({ id } = await prisma.impactArea.create({
      data: { impactId, areaId, note },
      select: { id: true },
    }));
  }

  return { ok: true, data: { id } };
}

export async function addAcompanhamentoAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = addAcompanhamentoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { impactId, newStatus, severityScore, extentScore, note } = parsed.data;
  const impact = await getImpactForTenant(impactId, session.tenantId);
  if (!impact) return { ok: false, error: 'Impacto não encontrado' };

  const finalSeverity = severityScore ?? impact.severityScore;
  const finalExtent   = extentScore   ?? impact.extentScore;
  const newScore      = calculateScore(finalSeverity, finalExtent);

  const { id } = await prisma.$transaction(async (tx) => {
    const entry = await tx.impactAcompanhamento.create({
      data: {
        impactId,
        previousStatus: impact.status,
        newStatus,
        previousScore:  impact.score,
        newScore,
        note,
        changedBy: session.userId,
      },
      select: { id: true },
    });

    await tx.changeImpact.update({
      where: { id: impactId },
      data: {
        status:        newStatus,
        severityScore: finalSeverity,
        extentScore:   finalExtent,
        score:         newScore,
        updatedBy:     session.userId,
      },
    });

    return entry;
  });

  return { ok: true, data: { id } };
}

export async function closeImpactAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = closeImpactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { impactId, note } = parsed.data;
  const impact = await getImpactForTenant(impactId, session.tenantId);
  if (!impact) return { ok: false, error: 'Impacto não encontrado' };

  if (impact.status === 'CLOSED') {
    return { ok: false, error: 'Impacto já está encerrado' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.changeImpact.update({
      where: { id: impactId },
      data: { status: 'CLOSED', updatedBy: session.userId },
    });

    await tx.impactAcompanhamento.create({
      data: {
        impactId,
        previousStatus: impact.status,
        newStatus:      'CLOSED',
        previousScore:  impact.score,
        newScore:       impact.score,
        note,
        changedBy:      session.userId,
      },
    });
  });

  return { ok: true, data: { id: impactId } };
}
