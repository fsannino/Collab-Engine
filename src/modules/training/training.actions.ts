'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';
import { buildTrainingInviteEmail } from '@/emails/training-invite';
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

// ─── Geração automática de plano (Issue 023) ─────────────────────────────────

const generatePlanSchema = z.object({
  projectId: z.string().uuid(),
  name:      z.string().min(3).max(200),
});

export async function generateTrainingPlanAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = generatePlanSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { projectId, name } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!project) return { ok: false, error: 'Projeto não encontrado' };

  // Funções ativas no tenant com pelo menos 1 pessoa ativa
  const funcoes = await prisma.funcao.findMany({
    where: {
      tenantId: session.tenantId,
      deletedAt: null,
      pessoas: { some: { dataFim: null } },
    },
    include: {
      pessoas: {
        where: { dataFim: null },
        include: { pessoa: { select: { id: true, deletedAt: true } } },
      },
    },
  });

  if (funcoes.length === 0) {
    return { ok: false, error: 'Nenhuma função com pessoas ativas encontrada. Cadastre Funções e vincule Pessoas antes de gerar o plano.' };
  }

  const plan = await prisma.$transaction(async (tx) => {
    const newPlan = await tx.trainingPlan.create({
      data: {
        tenantId:  session.tenantId,
        projectId,
        name,
        createdBy: session.userId,
      },
    });

    for (const funcao of funcoes) {
      const pessoasAtivas = funcao.pessoas.filter((pf) => !pf.pessoa.deletedAt);
      if (pessoasAtivas.length === 0) continue;

      const item = await tx.trainingItem.create({
        data: {
          planId:   newPlan.id,
          title:    `Treinamento — ${funcao.nome}`,
          modality: 'PRESENCIAL',
        },
      });

      await tx.funcaoTreinamento.create({
        data: { trainingItemId: item.id, funcaoId: funcao.id },
      });

      await tx.pessoaTreinamento.createMany({
        data: pessoasAtivas.map((pf) => ({
          trainingItemId:    item.id,
          pessoaId:          pf.pessoa.id,
          derivedFromFuncao: true,
        })),
        skipDuplicates: true,
      });
    }

    return newPlan;
  });

  revalidatePath(`/projects/${projectId}/training`);
  revalidatePath('/training/plans');
  return { ok: true, data: { id: plan.id } };
}

// ─── Remover/adicionar PessoaTreinamento manualmente ─────────────────────────

const togglePessoaSchema = z.object({
  trainingItemId: z.string().uuid(),
  pessoaId:       z.string().uuid(),
});

export async function addPessoaTreinamentoAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = togglePessoaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { trainingItemId, pessoaId } = parsed.data;

  // Verify tenant ownership
  const item = await prisma.trainingItem.findFirst({
    where: { id: trainingItemId, deletedAt: null },
    include: { plan: { select: { tenantId: true, id: true } } },
  });
  if (!item || item.plan.tenantId !== session.tenantId) return { ok: false, error: 'Não encontrado' };

  await prisma.pessoaTreinamento.upsert({
    where:  { trainingItemId_pessoaId: { trainingItemId, pessoaId } },
    update: { deletedAt: null },
    create: { trainingItemId, pessoaId, derivedFromFuncao: false },
  });

  revalidatePath(`/training/plans/${item.plan.id}`);
  return { ok: true, data: undefined };
}

export async function removePessoaTreinamentoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const pt = await prisma.pessoaTreinamento.findFirst({
    where: { id },
    include: { trainingItem: { include: { plan: { select: { tenantId: true, id: true } } } } },
  });
  if (!pt || pt.trainingItem.plan.tenantId !== session.tenantId) return { ok: false, error: 'Não encontrado' };

  await prisma.pessoaTreinamento.update({
    where: { id },
    data:  { deletedAt: new Date() },
  });

  revalidatePath(`/training/plans/${pt.trainingItem.plan.id}`);
  return { ok: true, data: undefined };
}

// ─── Convites por e-mail (Issue 024) ─────────────────────────────────────────

export async function sendInvitationsAction(turmaId: string): Promise<ActionResult<{ sent: number; skipped: number }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY não configurada. Adicione a chave nas variáveis de ambiente.' };
  }

  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, deletedAt: null },
    include: {
      trainingItem: {
        select: {
          title: true,
          plan: { select: { id: true, tenantId: true, name: true } },
        },
      },
      inscricoes: {
        where: { conviteEnviadoEm: null },
        include: {
          pessoaTreinamento: {
            include: { pessoa: { select: { nome: true, email: true } } },
          },
        },
      },
    },
  });

  if (!turma) return { ok: false, error: 'Turma não encontrada' };
  if (turma.trainingItem.plan.tenantId !== session.tenantId) return { ok: false, error: 'Acesso negado' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://engine.collabz.com.br';
  const planUrl = `${appUrl}/training/plans/${turma.trainingItem.plan.id}`;

  const pending = turma.inscricoes.filter((i) => i.pessoaTreinamento.pessoa.email);
  const skipped = turma.inscricoes.length - pending.length;

  let sent = 0;
  for (const inscricao of pending) {
    const pessoa = inscricao.pessoaTreinamento.pessoa;
    if (!pessoa.email) continue;

    const { subject, html } = buildTrainingInviteEmail({
      pessoaNome:         pessoa.nome,
      treinamentoTitulo:  turma.trainingItem.title,
      turmaNome:          turma.nome,
      dataInicio:         turma.dataInicio,
      dataFim:            turma.dataFim,
      local:              turma.local,
      modality:           turma.modality,
      planUrl,
    });

    const { error } = await resend.emails.send({
      from:    'Collab Engine <treinamentos@collabz.com.br>',
      to:      pessoa.email,
      subject,
      html,
    });

    if (!error) {
      await prisma.inscricaoTurma.update({
        where: { id: inscricao.id },
        data:  { conviteEnviadoEm: new Date() },
      });
      sent++;
    }
  }

  revalidatePath(`/training/turmas/${turmaId}`);
  return { ok: true, data: { sent, skipped } };
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
