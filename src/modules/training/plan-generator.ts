'use server';

// Issue 023 — Geração automática de plano de treinamento (Sprint 4)
//
// Deriva o plano a partir da estrutura organizacional:
//   Impactos do projeto → dimensões → catálogo de treinamentos (TRAINING_CATALOG)
//   Funções afetadas → Pessoas ativas nessas funções → PessoaTreinamento
//
// Nota de adaptação: a cadeia completa da issue (ImpactActivity → atividade →
// processo → função) depende de vínculo Impacto↔Processo que ainda não existe
// no schema. Aproximação usada:
//   1. Funções ativas das Pessoas vinculadas ao projeto como stakeholders
//      (ProjectStakeholder → Stakeholder.pessoaId → PessoaFuncao ativa)
//   2. Se houver impacto de dimensão PROCESS: união com Funções que executam
//      processos XPROC (FuncaoProcesso — Issue 021)
// O resultado é um DRAFT editável — o usuário pode adicionar/remover pessoas.

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { TRAINING_CATALOG } from './training-catalog';
import type { ActionResult } from '@/shared/types/action-result';
import type { ImpactDimension } from '@prisma/client';

const generateSchema = z.object({
  projectId: z.string().uuid(),
});

export type GeneratedPlanSummary = {
  planId: string;
  itens: number;
  funcoes: number;
  pessoas: number;
};

export async function generateTrainingPlanAction(
  raw: unknown
): Promise<ActionResult<GeneratedPlanSummary>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' };
  const { projectId } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) return { ok: false, error: 'Projeto não encontrado' };

  // 1. Dimensões dos impactos ativos do projeto
  const impacts = await prisma.changeImpact.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null, status: { not: 'CLOSED' } },
    select: { dimension: true },
  });
  if (impacts.length === 0) {
    return {
      ok: false,
      error: 'Projeto não possui impactos mapeados. Cadastre impactos (M3) antes de gerar o plano.',
    };
  }
  const dimensions = [...new Set(impacts.map((i) => i.dimension))] as ImpactDimension[];

  // 2. Funções afetadas — via pessoas stakeholder do projeto
  const stakeholderLinks = await prisma.projectStakeholder.findMany({
    where: { projectId, deletedAt: null, stakeholder: { pessoaId: { not: null }, deletedAt: null } },
    select: { stakeholder: { select: { pessoaId: true } } },
  });
  const pessoaIdsStakeholder = stakeholderLinks
    .map((l) => l.stakeholder.pessoaId)
    .filter((id): id is string => Boolean(id));

  const funcoesViaStakeholder = await prisma.pessoaFuncao.findMany({
    where: { pessoaId: { in: pessoaIdsStakeholder }, dataFim: null },
    select: { funcaoId: true },
  });

  const funcaoIds = new Set(funcoesViaStakeholder.map((f) => f.funcaoId));

  // 2b. Dimensão PROCESS → funções que executam processos XPROC (Issue 021)
  if (dimensions.includes('PROCESS')) {
    const funcoesViaProcesso = await prisma.funcaoProcesso.findMany({
      where: { deletedAt: null, funcao: { tenantId: session.tenantId, deletedAt: null } },
      select: { funcaoId: true },
    });
    funcoesViaProcesso.forEach((f) => funcaoIds.add(f.funcaoId));
  }

  if (funcaoIds.size === 0) {
    return {
      ok: false,
      error:
        'Nenhuma função afetada identificada. Vincule stakeholders a pessoas (com funções ativas) ou vincule funções a processos do XPROC.',
    };
  }

  // 3. Pessoas ativas nas funções afetadas
  const pessoasFuncoes = await prisma.pessoaFuncao.findMany({
    where: {
      funcaoId: { in: [...funcaoIds] },
      dataFim: null,
      pessoa: { deletedAt: null, tenantId: session.tenantId },
    },
    select: { pessoaId: true },
  });
  const pessoaIds = [...new Set(pessoasFuncoes.map((p) => p.pessoaId))];

  // 4. Itens do catálogo por dimensão (dedup por título)
  const catalogItems = new Map<string, { title: string; durationH: number }>();
  for (const dim of dimensions) {
    for (const entry of TRAINING_CATALOG[dim]) {
      catalogItems.set(entry.title, entry);
    }
  }

  // 5. Criação transacional do plano completo
  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingPlan.create({
      data: {
        tenantId: session.tenantId,
        projectId,
        name: `Plano de Treinamento — ${project.name}`,
        description: `Gerado automaticamente a partir de ${impacts.length} impacto(s) nas dimensões: ${dimensions.join(', ')}.`,
        status: 'DRAFT',
        createdBy: session.userId,
      },
    });

    for (const entry of catalogItems.values()) {
      const item = await tx.trainingItem.create({
        data: {
          planId: created.id,
          title: entry.title,
          duration: entry.durationH * 60,
          modality: 'PRESENCIAL',
        },
      });

      await tx.funcaoTreinamento.createMany({
        data: [...funcaoIds].map((funcaoId) => ({ trainingItemId: item.id, funcaoId })),
      });

      await tx.pessoaTreinamento.createMany({
        data: pessoaIds.map((pessoaId) => ({
          trainingItemId: item.id,
          pessoaId,
          derivedFromFuncao: true,
        })),
      });
    }

    return created;
  });

  revalidatePath(`/projects/${projectId}/training`);
  revalidatePath('/training/plans');

  return {
    ok: true,
    data: {
      planId: plan.id,
      itens: catalogItems.size,
      funcoes: funcaoIds.size,
      pessoas: pessoaIds.length,
    },
  };
}
