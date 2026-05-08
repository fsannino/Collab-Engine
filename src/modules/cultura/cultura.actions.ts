'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Tipos OCAI ─────────────────────────────────────────────────────────────

export const DIMENSOES = [
  { id: 'CARACTERISTICAS', label: 'Características Dominantes' },
  { id: 'LIDERANCA',       label: 'Liderança Organizacional' },
  { id: 'GESTAO_PESSOAS',  label: 'Gestão de Pessoas' },
  { id: 'COESAO',          label: 'Coesão Organizacional' },
  { id: 'ENFASE',          label: 'Ênfase Estratégica' },
  { id: 'CRITERIOS',       label: 'Critérios de Sucesso' },
] as const;

export type DimensaoId = typeof DIMENSOES[number]['id'];

export const TIPOS_CULTURA = [
  { id: 'CLAN',      label: 'Clã',        descricao: 'Colaboração, pessoas, trabalho em equipe', cor: '#3b82f6' },
  { id: 'ADHOCRACY', label: 'Adhocracia', descricao: 'Inovação, criatividade, flexibilidade',    cor: '#f59e0b' },
  { id: 'MARKET',    label: 'Mercado',    descricao: 'Resultados, competitividade, externo',      cor: '#ef4444' },
  { id: 'HIERARCHY', label: 'Hierarquia', descricao: 'Controle, processos, estabilidade',         cor: '#8b5cf6' },
] as const;

export type TipoCulturaId = typeof TIPOS_CULTURA[number]['id'];

export type OcaiValores = {
  CLAN: number; ADHOCRACY: number; MARKET: number; HIERARCHY: number;
};

export type OcaiRespostas = {
  [dim in DimensaoId]: { atual: OcaiValores; desejado: OcaiValores };
};

// ─── Schemas ────────────────────────────────────────────────────────────────

const createAvaliacaoSchema = z.object({
  nome:       z.string().min(3).max(200),
  descricao:  z.string().max(1000).optional().or(z.literal('')),
  tipo:       z.enum(['PROJETO', 'AREA', 'LIVRE']),
  projectId:  z.string().uuid().optional().or(z.literal('')),
  areaId:     z.string().uuid().optional().or(z.literal('')),
  dataInicio: z.coerce.date().optional(),
  dataFim:    z.coerce.date().optional(),
});

const convidarSchema = z.object({
  avaliacaoId: z.string().uuid(),
  nome:        z.string().min(2).max(200),
  email:       z.string().email(),
  pessoaId:    z.string().uuid().optional().or(z.literal('')),
});

const respostaSchema = z.object({
  token: z.string().uuid(),
  respostas: z.record(z.object({
    atual:    z.object({ CLAN: z.number(), ADHOCRACY: z.number(), MARKET: z.number(), HIERARCHY: z.number() }),
    desejado: z.object({ CLAN: z.number(), ADHOCRACY: z.number(), MARKET: z.number(), HIERARCHY: z.number() }),
  })),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createAvaliacaoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = createAvaliacaoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { nome, descricao, tipo, projectId, areaId, dataInicio, dataFim } = parsed.data;

  const av = await prisma.avaliacaoCultura.create({
    data: {
      tenantId:   session.tenantId,
      nome,
      descricao:  descricao  || null,
      tipo,
      projectId:  projectId  || null,
      areaId:     areaId     || null,
      dataInicio: dataInicio ?? null,
      dataFim:    dataFim    ?? null,
      createdBy:  session.userId,
    },
  });

  revalidatePath('/cultura');
  return { ok: true, data: { id: av.id } };
}

export async function ativarAvaliacaoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.avaliacaoCultura.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { status: 'ATIVA' },
  });

  revalidatePath(`/cultura/${id}`);
  return { ok: true, data: undefined };
}

export async function encerrarAvaliacaoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  await prisma.avaliacaoCultura.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { status: 'ENCERRADA' },
  });

  revalidatePath(`/cultura/${id}`);
  return { ok: true, data: undefined };
}

export async function convidarRespondentesAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = convidarSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { avaliacaoId, nome, email, pessoaId } = parsed.data;

  const avaliacao = await prisma.avaliacaoCultura.findFirst({
    where: { id: avaliacaoId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!avaliacao) return { ok: false, error: 'Avaliação não encontrada' };

  const existing = await prisma.conviteOcai.findFirst({ where: { avaliacaoId, email } });
  if (existing) return { ok: false, error: 'Este e-mail já foi convidado' };

  await prisma.conviteOcai.create({
    data: {
      avaliacaoId,
      nome,
      email,
      pessoaId: pessoaId || null,
    },
  });

  revalidatePath(`/cultura/${avaliacaoId}`);
  return { ok: true, data: undefined };
}

export async function removerConviteAction(conviteId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const convite = await prisma.conviteOcai.findFirst({
    where: { id: conviteId },
    include: { avaliacao: { select: { tenantId: true } } },
  });
  if (!convite || convite.avaliacao.tenantId !== session.tenantId) {
    return { ok: false, error: 'Não encontrado' };
  }

  await prisma.conviteOcai.delete({ where: { id: conviteId } });

  revalidatePath(`/cultura/${convite.avaliacaoId}`);
  return { ok: true, data: undefined };
}

// Public — no auth required
export async function responderOcaiAction(raw: unknown): Promise<ActionResult<void>> {
  const parsed = respostaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' };

  const { token, respostas } = parsed.data;

  const convite = await prisma.conviteOcai.findUnique({ where: { token } });
  if (!convite) return { ok: false, error: 'Link inválido ou expirado' };
  if (convite.respondidoEm) return { ok: false, error: 'Este convite já foi respondido' };

  // Validate each dimension sums to 100
  for (const dim of DIMENSOES) {
    const d = respostas[dim.id];
    if (!d) return { ok: false, error: `Dimensão ${dim.label} não preenchida` };
    const sumAtual    = d.atual.CLAN    + d.atual.ADHOCRACY    + d.atual.MARKET    + d.atual.HIERARCHY;
    const sumDesejado = d.desejado.CLAN + d.desejado.ADHOCRACY + d.desejado.MARKET + d.desejado.HIERARCHY;
    if (Math.abs(sumAtual    - 100) > 1) return { ok: false, error: `${dim.label} (atual) deve somar 100 pontos` };
    if (Math.abs(sumDesejado - 100) > 1) return { ok: false, error: `${dim.label} (desejado) deve somar 100 pontos` };
  }

  await prisma.$transaction([
    prisma.respostaOcai.create({
      data: { avaliacaoId: convite.avaliacaoId, conviteId: convite.id, respostas },
    }),
    prisma.conviteOcai.update({
      where: { id: convite.id },
      data: { respondidoEm: new Date() },
    }),
  ]);

  return { ok: true, data: undefined };
}

// ─── Cálculo de resultado ────────────────────────────────────────────────────

export type ResultadoOcai = {
  totalRespostas: number;
  media: { [dim in DimensaoId]: { atual: OcaiValores; desejado: OcaiValores } };
  geral: { atual: OcaiValores; desejado: OcaiValores };
};

export function calcularResultado(respostas: { respostas: unknown }[]): ResultadoOcai {
  const n = respostas.length;
  if (n === 0) {
    const zero: OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };
    const emptyDim = { atual: zero, desejado: zero };
    return {
      totalRespostas: 0,
      media: Object.fromEntries(DIMENSOES.map((d) => [d.id, emptyDim])) as ResultadoOcai['media'],
      geral: emptyDim,
    };
  }

  const sums: Record<string, { atual: OcaiValores; desejado: OcaiValores }> = {};
  for (const dim of DIMENSOES) {
    sums[dim.id] = { atual: { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 }, desejado: { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 } };
  }

  for (const r of respostas) {
    const data = r.respostas as OcaiRespostas;
    for (const dim of DIMENSOES) {
      const d = data[dim.id];
      if (!d) continue;
      for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
        sums[dim.id].atual[tipo]    += d.atual[tipo]    ?? 0;
        sums[dim.id].desejado[tipo] += d.desejado[tipo] ?? 0;
      }
    }
  }

  const media: ResultadoOcai['media'] = {} as ResultadoOcai['media'];
  const geralAtual:    OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };
  const geralDesejado: OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };

  for (const dim of DIMENSOES) {
    const id = dim.id as DimensaoId;
    media[id] = {
      atual:    { CLAN: sums[id].atual.CLAN / n,    ADHOCRACY: sums[id].atual.ADHOCRACY / n,    MARKET: sums[id].atual.MARKET / n,    HIERARCHY: sums[id].atual.HIERARCHY / n },
      desejado: { CLAN: sums[id].desejado.CLAN / n, ADHOCRACY: sums[id].desejado.ADHOCRACY / n, MARKET: sums[id].desejado.MARKET / n, HIERARCHY: sums[id].desejado.HIERARCHY / n },
    };
    for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
      geralAtual[tipo]    += media[id].atual[tipo]    / DIMENSOES.length;
      geralDesejado[tipo] += media[id].desejado[tipo] / DIMENSOES.length;
    }
  }

  return { totalRespostas: n, media, geral: { atual: geralAtual, desejado: geralDesejado } };
}
