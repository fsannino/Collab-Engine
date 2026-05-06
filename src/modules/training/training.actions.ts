'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Schemas ────────────────────────────────────────────────────────────────

const createPlanSchema = z.object({
  projectId:   z.string().uuid(),
  name:        z.string().min(3).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  startDate:   z.coerce.date().optional(),
  endDate:     z.coerce.date().optional(),
});

const createTurmaSchema = z.object({
  trainingItemId: z.string().uuid(),
  nome:           z.string().min(2).max(200),
  dataInicio:     z.coerce.date(),
  dataFim:        z.coerce.date(),
  modality:       z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO', 'AUTOESTUDO']),
  local:          z.string().max(300).optional().or(z.literal('')),
  instrutorId:    z.string().uuid().optional().or(z.literal('')),
  capacidade:     z.coerce.number().int().min(1).optional(),
});

const savePresencaSchema = z.object({
  turmaId: z.string().uuid(),
  inscricoes: z.array(z.object({
    id:            z.string().uuid(),
    presente:      z.boolean().nullable(),
    notaAvaliacao: z.coerce.number().int().min(1).max(5).nullable().optional(),
    observacao:    z.string().max(500).optional().or(z.literal('')),
  })),
});

const encerrarTurmaSchema = z.object({
  turmaId: z.string().uuid(),
});

// ─── Plan ────────────────────────────────────────────────────────────────────

export async function createTrainingPlanAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createPlanSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { projectId, name, description, startDate, endDate } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!project) return { ok: false, error: 'Projeto não encontrado' };

  const plan = await prisma.trainingPlan.create({
    data: {
      tenantId: session.tenantId,
      projectId,
      name,
      description: description || null,
      startDate:   startDate ?? null,
      endDate:     endDate   ?? null,
      createdBy:   session.userId,
    },
  });

  revalidatePath(`/projects/${projectId}/training`);
  return { ok: true, data: { id: plan.id } };
}

// ─── Turma ───────────────────────────────────────────────────────────────────

export async function createTurmaAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createTurmaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { trainingItemId, nome, dataInicio, dataFim, modality, local, instrutorId, capacidade } = parsed.data;

  const turma = await prisma.turma.create({
    data: {
      trainingItemId,
      nome,
      dataInicio,
      dataFim,
      modality,
      local:       local       || null,
      instrutorId: instrutorId || null,
      capacidade:  capacidade  ?? null,
    },
  });

  revalidatePath(`/training/turmas/${turma.id}`);
  return { ok: true, data: { id: turma.id } };
}

// ─── Presença ────────────────────────────────────────────────────────────────

export async function savePresencaAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = savePresencaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { turmaId, inscricoes } = parsed.data;

  await prisma.$transaction(
    inscricoes.map((i) =>
      prisma.inscricaoTurma.update({
        where: { id: i.id },
        data: {
          presente:      i.presente,
          notaAvaliacao: i.notaAvaliacao ?? null,
          observacao:    i.observacao    || null,
        },
      })
    )
  );

  revalidatePath(`/training/turmas/${turmaId}`);
  return { ok: true, data: undefined };
}

export async function encerrarTurmaAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = encerrarTurmaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { turmaId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Mark turma as CONCLUIDA
    await tx.turma.update({ where: { id: turmaId }, data: { status: 'CONCLUIDA' } });

    // Update PessoaTreinamento status based on attendance
    const inscricoes = await tx.inscricaoTurma.findMany({
      where: { turmaId },
      select: { pessoaTreinamentoId: true, presente: true },
    });

    for (const i of inscricoes) {
      if (i.presente === true) {
        await tx.pessoaTreinamento.update({
          where: { id: i.pessoaTreinamentoId },
          data: { status: 'CONCLUIDO' },
        });
      } else if (i.presente === false) {
        await tx.pessoaTreinamento.update({
          where: { id: i.pessoaTreinamentoId },
          data: { status: 'AUSENTE' },
        });
      }
    }
  });

  revalidatePath(`/training/turmas/${turmaId}`);
  return { ok: true, data: undefined };
}

// ─── Inscrever pessoa em turma ────────────────────────────────────────────────

export async function inscreverPessoaAction(
  turmaId: string,
  pessoaTreinamentoId: string
): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.inscricaoTurma.create({
    data: { turmaId, pessoaTreinamentoId },
  });

  await prisma.pessoaTreinamento.update({
    where: { id: pessoaTreinamentoId },
    data: { status: 'INSCRITO' },
  });

  revalidatePath(`/training/turmas/${turmaId}`);
  return { ok: true, data: undefined };
}
