'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import type { ActionResult } from '@/shared/types/action-result';
import {
  createStakeholderSchema,
  updateStakeholderPositionSchema,
  recordContactSchema,
  updateAdkarSchema,
  linkPersonSchema,
} from './stakeholder.schema';

async function getPSForTenant(projectStakeholderId: string, tenantId: string) {
  return prisma.projectStakeholder.findFirst({
    where: { id: projectStakeholderId, deletedAt: null, project: { tenantId } },
  });
}

export async function createStakeholderAction(
  input: unknown,
): Promise<ActionResult<{ projectStakeholderId: string; stakeholderId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createStakeholderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { projectId, name, email, organizationLevel, position, influence, interest, notes, pessoaId } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return { ok: false, error: 'Projeto não encontrado' };

  const result = await prisma.$transaction(async (tx) => {
    const stakeholder = await tx.stakeholder.create({
      data: { tenantId: session.tenantId, name, email: email || undefined, organizationLevel, pessoaId },
      select: { id: true },
    });
    const ps = await tx.projectStakeholder.create({
      data: { projectId, stakeholderId: stakeholder.id, position, influence, interest, notes },
      select: { id: true },
    });
    return { stakeholderId: stakeholder.id, projectStakeholderId: ps.id };
  });

  return { ok: true, data: result };
}

export async function updateStakeholderPositionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = updateStakeholderPositionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { projectStakeholderId, ...data } = parsed.data;
  const ps = await getPSForTenant(projectStakeholderId, session.tenantId);
  if (!ps) return { ok: false, error: 'Stakeholder não encontrado neste projeto' };

  await prisma.projectStakeholder.update({ where: { id: projectStakeholderId }, data });
  return { ok: true, data: { id: projectStakeholderId } };
}

export async function recordContactAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = recordContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { projectStakeholderId, contactDate, notes } = parsed.data;
  const ps = await getPSForTenant(projectStakeholderId, session.tenantId);
  if (!ps) return { ok: false, error: 'Stakeholder não encontrado neste projeto' };

  await prisma.projectStakeholder.update({
    where: { id: projectStakeholderId },
    data: { lastContactDate: contactDate, notes: notes ?? ps.notes },
  });
  return { ok: true, data: { id: projectStakeholderId } };
}

export async function updateAdkarAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = updateAdkarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { projectStakeholderId, ...adkarData } = parsed.data;
  const ps = await getPSForTenant(projectStakeholderId, session.tenantId);
  if (!ps) return { ok: false, error: 'Stakeholder não encontrado neste projeto' };

  await prisma.projectStakeholder.update({ where: { id: projectStakeholderId }, data: adkarData });
  return { ok: true, data: { id: projectStakeholderId } };
}

export async function linkPersonAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = linkPersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }

  const { stakeholderId, pessoaId } = parsed.data;
  const stakeholder = await prisma.stakeholder.findFirst({
    where: { id: stakeholderId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!stakeholder) return { ok: false, error: 'Stakeholder não encontrado' };

  await prisma.stakeholder.update({ where: { id: stakeholderId }, data: { pessoaId } });
  return { ok: true, data: { id: stakeholderId } };
}
