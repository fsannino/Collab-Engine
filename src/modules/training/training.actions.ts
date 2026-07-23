'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/core/email/send';
import { renderTrainingInvite } from '@/emails/training-invite';
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

// ─── Convites por e-mail (Issue 024) ─────────────────────────────────────────

export type SendInvitationsSummary = {
  enviados: number;
  semEmail: number;
  jaEnviados: number;
  falhas: number;
};

export async function sendInvitationsAction(
  turmaId: string
): Promise<ActionResult<SendInvitationsSummary>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, deletedAt: null },
    include: {
      trainingItem: {
        select: {
          title: true,
          description: true,
          plan: { select: { tenantId: true } },
        },
      },
      inscricoes: {
        include: {
          pessoaTreinamento: {
            include: { pessoa: { select: { nome: true, email: true } } },
          },
        },
      },
    },
  });
  if (!turma || turma.trainingItem.plan.tenantId !== session.tenantId) {
    return { ok: false, error: 'Turma não encontrada' };
  }
  if (turma.status === 'CANCELADA' || turma.status === 'CONCLUIDA') {
    return { ok: false, error: 'Turma encerrada ou cancelada — convites não podem ser enviados' };
  }

  const instrutor = turma.instrutorId
    ? await prisma.user.findFirst({
        where: { id: turma.instrutorId, tenantId: session.tenantId },
        select: { name: true },
      })
    : null;

  const summary: SendInvitationsSummary = { enviados: 0, semEmail: 0, jaEnviados: 0, falhas: 0 };

  for (const inscricao of turma.inscricoes) {
    if (inscricao.conviteEnviadoEm) {
      summary.jaEnviados++;
      continue;
    }

    const pessoa = inscricao.pessoaTreinamento.pessoa;
    if (!pessoa.email) {
      summary.semEmail++;
      continue;
    }

    const { subject, html } = renderTrainingInvite({
      pessoaNome: pessoa.nome,
      treinamentoTitulo: turma.trainingItem.title,
      turmaNome: turma.nome,
      dataInicio: turma.dataInicio,
      dataFim: turma.dataFim,
      modality: turma.modality,
      local: turma.local,
      instrutorNome: instrutor?.name ?? null,
      descricao: turma.trainingItem.description,
    });

    const result = await sendEmail({ to: pessoa.email, subject, html });
    if (!result.ok) {
      summary.falhas++;
      continue;
    }

    await prisma.inscricaoTurma.update({
      where: { id: inscricao.id },
      data: { conviteEnviadoEm: new Date() },
    });
    summary.enviados++;
  }

  revalidatePath(`/training/turmas/${turmaId}`);
  return { ok: true, data: summary };
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
