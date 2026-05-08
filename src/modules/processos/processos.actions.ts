'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Schemas ────────────────────────────────────────────────────────────────

const macroprocessoSchema = z.object({
  nome:     z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  descricao: z.string().max(1000).optional().or(z.literal('')),
  xprocMacroprocessoId: z.string().max(100).optional().or(z.literal('')),
});

const processoSchema = z.object({
  nome:            z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  descricao:       z.string().max(1000).optional().or(z.literal('')),
  macroprocessoId: z.string().uuid('Macroprocesso inválido').optional().or(z.literal('')),
  xprocProcessoId: z.string().max(100).optional().or(z.literal('')),
});

// ─── Macroprocesso ──────────────────────────────────────────────────────────

export async function createMacroprocessoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = macroprocessoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, xprocMacroprocessoId } = parsed.data;

  const existing = await prisma.macroprocesso.findFirst({
    where: { tenantId: session.tenantId, nome, deletedAt: null },
  });
  if (existing) return { ok: false, error: 'Já existe um macroprocesso com esse nome' };

  const mp = await prisma.macroprocesso.create({
    data: {
      tenantId: session.tenantId,
      nome,
      descricao: descricao || null,
      xprocMacroprocessoId: xprocMacroprocessoId || null,
    },
  });

  revalidatePath('/macroprocessos');
  return { ok: true, data: { id: mp.id } };
}

export async function updateMacroprocessoAction(id: string, raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = macroprocessoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, xprocMacroprocessoId } = parsed.data;

  await prisma.macroprocesso.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: { nome, descricao: descricao || null, xprocMacroprocessoId: xprocMacroprocessoId || null },
  });

  revalidatePath('/macroprocessos');
  revalidatePath(`/macroprocessos/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteMacroprocessoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.macroprocesso.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/macroprocessos');
  return { ok: true, data: undefined };
}

// ─── Processo ────────────────────────────────────────────────────────────────

export async function createProcessoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = processoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, macroprocessoId, xprocProcessoId } = parsed.data;

  const p = await prisma.processo.create({
    data: {
      tenantId:        session.tenantId,
      nome,
      descricao:       descricao       || null,
      macroprocessoId: macroprocessoId || null,
      xprocProcessoId: xprocProcessoId || null,
    },
  });

  revalidatePath('/processos');
  if (macroprocessoId) revalidatePath(`/macroprocessos/${macroprocessoId}`);
  return { ok: true, data: { id: p.id } };
}

export async function updateProcessoAction(id: string, raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = processoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, macroprocessoId, xprocProcessoId } = parsed.data;

  await prisma.processo.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: {
      nome,
      descricao:       descricao       || null,
      macroprocessoId: macroprocessoId || null,
      xprocProcessoId: xprocProcessoId || null,
    },
  });

  revalidatePath('/processos');
  revalidatePath(`/processos/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteProcessoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.processo.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/processos');
  return { ok: true, data: undefined };
}
