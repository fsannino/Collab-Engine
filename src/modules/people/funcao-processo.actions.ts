'use server';

// Issue 021 — Vinculação Função ↔ Processo (XPROC)

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { isXprocConfigured, listProcessos, type XprocProcesso } from '@/integration/xproc/client';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Schemas ────────────────────────────────────────────────────────────────

const vincularProcessoSchema = z.object({
  funcaoId:        z.string().uuid(),
  xprocProcessoId: z.string().min(1, 'Processo é obrigatório').max(100),
  papel:           z.enum(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED']),
  observacao:      z.string().max(500).optional().or(z.literal('')),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function searchProcessosAction(
  search: string
): Promise<ActionResult<XprocProcesso[]>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  if (!isXprocConfigured()) {
    return { ok: false, error: 'Integração XPROC não configurada' };
  }

  try {
    const processos = await listProcessos(search.trim() || undefined);
    return { ok: true, data: processos };
  } catch {
    return { ok: false, error: 'Falha ao consultar o XPROC. Tente novamente.' };
  }
}

export async function vincularProcessoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = vincularProcessoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { funcaoId, xprocProcessoId, papel, observacao } = parsed.data;

  const funcao = await prisma.funcao.findFirst({
    where: { id: funcaoId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!funcao) return { ok: false, error: 'Função não encontrada' };

  // Reativa vínculo soft-deletado, se existir (unique funcaoId+xprocProcessoId)
  const existing = await prisma.funcaoProcesso.findUnique({
    where: { funcaoId_xprocProcessoId: { funcaoId, xprocProcessoId } },
  });

  if (existing && !existing.deletedAt) {
    return { ok: false, error: 'Este processo já está vinculado a esta função' };
  }

  const vinculo = existing
    ? await prisma.funcaoProcesso.update({
        where: { id: existing.id },
        data: { papel, observacao: observacao || null, deletedAt: null },
      })
    : await prisma.funcaoProcesso.create({
        data: { funcaoId, xprocProcessoId, papel, observacao: observacao || null },
      });

  revalidatePath(`/funcoes/${funcaoId}`);
  return { ok: true, data: { id: vinculo.id } };
}

export async function desvincularProcessoAction(vinculoId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const vinculo = await prisma.funcaoProcesso.findFirst({
    where: { id: vinculoId, deletedAt: null, funcao: { tenantId: session.tenantId } },
  });
  if (!vinculo) return { ok: false, error: 'Vínculo não encontrado' };

  await prisma.funcaoProcesso.update({
    where: { id: vinculoId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/funcoes/${vinculo.funcaoId}`);
  return { ok: true, data: undefined };
}
