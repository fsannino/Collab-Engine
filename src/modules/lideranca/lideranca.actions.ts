'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

const avaliacaoSchema = z.object({
  liderancaId: z.string().uuid(),
  dimensao:    z.string().min(1),
  pontuacao:   z.coerce.number().min(0).max(10),
  observacao:  z.string().max(1000).optional().or(z.literal('')),
});

const criarLiderancaSchema = z.object({
  pessoaId:  z.string().uuid(),
  projectId: z.string().uuid().optional().or(z.literal('')),
  areaId:    z.string().uuid().optional().or(z.literal('')),
  papel:     z.string().min(2).max(200),
});

export async function criarLiderancaAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = criarLiderancaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { pessoaId, projectId, areaId, papel } = parsed.data;

  const lideranca = await prisma.lideranca.create({
    data: {
      tenantId:  session.tenantId,
      pessoaId,
      projectId: projectId || null,
      areaId:    areaId    || null,
      papel,
      createdBy: session.userId,
    },
  });

  revalidatePath('/lideranca');
  return { ok: true, data: { id: lideranca.id } };
}

export async function registrarAvaliacaoLiderancaAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = avaliacaoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { liderancaId, dimensao, pontuacao, observacao } = parsed.data;

  const lideranca = await prisma.lideranca.findFirst({
    where: { id: liderancaId, tenantId: session.tenantId },
  });
  if (!lideranca) return { ok: false, error: 'Não encontrado' };

  await prisma.avaliacaoLideranca.upsert({
    where:  { liderancaId_dimensao: { liderancaId, dimensao } },
    create: { liderancaId, dimensao, pontuacao, observacao: observacao || null, avaliadoPor: session.userId },
    update: { pontuacao, observacao: observacao || null, avaliadoPor: session.userId },
  });

  revalidatePath(`/lideranca/${liderancaId}`);
  return { ok: true, data: undefined };
}

export async function excluirLiderancaAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.lideranca.updateMany({
    where: { id, tenantId: session.tenantId },
    data:  { deletedAt: new Date() },
  });

  revalidatePath('/lideranca');
  return { ok: true, data: undefined };
}
