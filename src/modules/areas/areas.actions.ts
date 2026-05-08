'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Schema ─────────────────────────────────────────────────────────────────

const areaSchema = z.object({
  nome:      z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  descricao: z.string().max(1000).optional().or(z.literal('')),
  parentId:  z.string().uuid().optional().or(z.literal('')),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createAreaAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = areaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, parentId } = parsed.data;

  const area = await prisma.area.create({
    data: {
      tenantId:  session.tenantId,
      nome,
      descricao: descricao || null,
      parentId:  parentId || null,
    },
  });

  revalidatePath('/areas');
  return { ok: true, data: { id: area.id } };
}

export async function updateAreaAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = areaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, parentId } = parsed.data;

  // Prevent self-referential parent
  if (parentId === id) return { ok: false, error: 'Uma área não pode ser pai de si mesma' };

  await prisma.area.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: {
      nome,
      descricao: descricao || null,
      parentId:  parentId || null,
    },
  });

  revalidatePath('/areas');
  revalidatePath(`/areas/${id}`);
  return { ok: true, data: { id } };
}

export async function deleteAreaAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.area.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/areas');
  return { ok: true, data: undefined };
}
