'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Schemas ────────────────────────────────────────────────────────────────

const createPessoaSchema = z.object({
  nome:               z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  email:              z.string().email('E-mail inválido').optional().or(z.literal('')),
  cpf:                z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos (sem pontuação)').optional().or(z.literal('')),
  hrisId:             z.string().max(100).optional().or(z.literal('')),
  areaId:             z.string().uuid().optional().or(z.literal('')),
  superiorId:         z.string().uuid().optional().or(z.literal('')),
  localidadeTrabalho: z.string().max(200).optional().or(z.literal('')),
});

const createCargoSchema = z.object({
  nome:     z.string().min(2).max(200),
  nivel:    z.string().max(100).optional().or(z.literal('')),
  descricao: z.string().max(1000).optional().or(z.literal('')),
  areaId:   z.string().uuid().optional().or(z.literal('')),
});

const createFuncaoSchema = z.object({
  nome:     z.string().min(2).max(200),
  descricao: z.string().max(1000).optional().or(z.literal('')),
});

const assignCargoSchema = z.object({
  pessoaId:  z.string().uuid(),
  cargoId:   z.string().uuid(),
  dataInicio: z.coerce.date(),
});

const assignFuncaoSchema = z.object({
  pessoaId:  z.string().uuid(),
  funcaoId:  z.string().uuid(),
  dataInicio: z.coerce.date(),
});

const endAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  dataFim:      z.coerce.date(),
  type:         z.enum(['cargo', 'funcao']),
});

// ─── Pessoa ─────────────────────────────────────────────────────────────────

export async function createPessoaAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createPessoaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, email, cpf, hrisId, areaId, superiorId, localidadeTrabalho } = parsed.data;

  const pessoa = await prisma.pessoa.create({
    data: {
      tenantId:           session.tenantId,
      nome,
      email:              email              || null,
      cpf:                cpf                || null,
      hrisId:             hrisId             || null,
      areaId:             areaId             || null,
      superiorId:         superiorId         || null,
      localidadeTrabalho: localidadeTrabalho || null,
    },
  });

  revalidatePath('/people');
  return { ok: true, data: { id: pessoa.id } };
}

export async function deletePessoaAction(pessoaId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.pessoa.updateMany({
    where: { id: pessoaId, tenantId: session.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/people');
  return { ok: true, data: undefined };
}

export async function updatePessoaAction(id: string, raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createPessoaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, email, cpf, hrisId, areaId, superiorId, localidadeTrabalho } = parsed.data;

  await prisma.pessoa.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: {
      nome,
      email:              email              || null,
      cpf:                cpf                || null,
      hrisId:             hrisId             || null,
      areaId:             areaId             || null,
      superiorId:         superiorId         || null,
      localidadeTrabalho: localidadeTrabalho || null,
    },
  });

  revalidatePath('/people');
  revalidatePath(`/people/${id}`);
  return { ok: true, data: undefined };
}

// ─── Cargo ───────────────────────────────────────────────────────────────────

export async function createCargoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createCargoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cargo = await prisma.cargo.create({
    data: {
      tenantId:  session.tenantId,
      nome:      parsed.data.nome,
      nivel:     parsed.data.nivel    || null,
      descricao: parsed.data.descricao || null,
      areaId:    parsed.data.areaId   || null,
    },
  });

  revalidatePath('/cargos');
  return { ok: true, data: { id: cargo.id } };
}

export async function updateCargoAction(id: string, raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createCargoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  await prisma.cargo.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: {
      nome:      parsed.data.nome,
      nivel:     parsed.data.nivel     || null,
      descricao: parsed.data.descricao || null,
      areaId:    parsed.data.areaId    || null,
    },
  });

  revalidatePath('/cargos');
  revalidatePath(`/cargos/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteCargoAction(cargoId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.cargo.updateMany({
    where: { id: cargoId, tenantId: session.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/cargos');
  return { ok: true, data: undefined };
}

// ─── Função ──────────────────────────────────────────────────────────────────

export async function createFuncaoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createFuncaoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const funcao = await prisma.funcao.create({
    data: {
      tenantId: session.tenantId,
      nome:     parsed.data.nome,
      descricao: parsed.data.descricao || null,
    },
  });

  revalidatePath('/funcoes');
  return { ok: true, data: { id: funcao.id } };
}

export async function updateFuncaoAction(id: string, raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createFuncaoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  await prisma.funcao.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: {
      nome:      parsed.data.nome,
      descricao: parsed.data.descricao || null,
    },
  });

  revalidatePath('/funcoes');
  revalidatePath(`/funcoes/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteFuncaoAction(funcaoId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.funcao.updateMany({
    where: { id: funcaoId, tenantId: session.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/funcoes');
  return { ok: true, data: undefined };
}

// ─── Vínculos ────────────────────────────────────────────────────────────────

export async function assignCargoAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = assignCargoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { pessoaId, cargoId, dataInicio } = parsed.data;

  const pessoa = await prisma.pessoa.findFirst({ where: { id: pessoaId, tenantId: session.tenantId } });
  if (!pessoa) return { ok: false, error: 'Pessoa não encontrada' };

  await prisma.pessoaCargo.create({ data: { pessoaId, cargoId, dataInicio } });
  revalidatePath(`/people/${pessoaId}`);
  return { ok: true, data: undefined };
}

export async function assignFuncaoAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = assignFuncaoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { pessoaId, funcaoId, dataInicio } = parsed.data;

  const pessoa = await prisma.pessoa.findFirst({ where: { id: pessoaId, tenantId: session.tenantId } });
  if (!pessoa) return { ok: false, error: 'Pessoa não encontrada' };

  await prisma.pessoaFuncao.create({ data: { pessoaId, funcaoId, dataInicio } });
  revalidatePath(`/people/${pessoaId}`);
  return { ok: true, data: undefined };
}

// ─── FuncaoProcesso (RACI local) ─────────────────────────────────────────────

const linkProcessoSchema = z.object({
  funcaoId:   z.string().uuid(),
  processoId: z.string().uuid(),
  papel:      z.enum(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED']),
  observacao: z.string().max(500).optional().or(z.literal('')),
});

export async function linkFuncaoProcessoAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = linkProcessoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { funcaoId, processoId, papel, observacao } = parsed.data;

  const funcao = await prisma.funcao.findFirst({
    where: { id: funcaoId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!funcao) return { ok: false, error: 'Função não encontrada' };

  const processo = await prisma.processo.findFirst({
    where: { id: processoId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!processo) return { ok: false, error: 'Processo não encontrado' };

  await prisma.funcaoProcesso.create({
    data: {
      funcaoId,
      processoId,
      papel,
      observacao: observacao || null,
    },
  });

  revalidatePath(`/funcoes/${funcaoId}`);
  return { ok: true, data: undefined };
}

export async function unlinkFuncaoProcessoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const fp = await prisma.funcaoProcesso.findFirst({
    where: { id, deletedAt: null },
    include: { funcao: { select: { tenantId: true, id: true } } },
  });
  if (!fp || fp.funcao.tenantId !== session.tenantId) {
    return { ok: false, error: 'Vínculo não encontrado' };
  }

  await prisma.funcaoProcesso.delete({ where: { id } });

  revalidatePath(`/funcoes/${fp.funcao.id}`);
  return { ok: true, data: undefined };
}

export async function endAssignmentAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = endAssignmentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { assignmentId, dataFim, type } = parsed.data;

  if (type === 'cargo') {
    await prisma.pessoaCargo.update({ where: { id: assignmentId }, data: { dataFim } });
  } else {
    await prisma.pessoaFuncao.update({ where: { id: assignmentId }, data: { dataFim } });
  }

  return { ok: true, data: undefined };
}
