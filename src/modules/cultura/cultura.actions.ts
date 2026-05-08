'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';
import type { ActionResult } from '@/shared/types/action-result';
import { DIMENSOES } from './cultura.utils';
import { hashIp } from '@/lib/ocai/engine';

const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Collab Engine <noreply@collabz.com.br>';
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? '';

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
  token:   z.string().uuid(),
  consent: z.literal(true),
  respostas: z.record(z.string(), z.object({
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

  const convite = await prisma.conviteOcai.create({
    data: {
      avaliacaoId,
      nome,
      email,
      pessoaId: pessoaId || null,
    },
  });

  // Send invite email (fire-and-forget — don't block on failure)
  const link = `${APP_URL}/ocai/${convite.token}`;
  resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Convite para avaliação de cultura: ${avaliacao.nome}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="display:inline-block;background:#0f2244;color:#c9a227;font-weight:700;font-size:13px;padding:4px 12px;border-radius:4px;letter-spacing:0.06em">COLLAB ENGINE</span>
        </div>
        <h2 style="color:#0f2244;font-size:20px;margin:0 0 12px">Olá, ${nome}!</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px">
          Você foi convidado(a) para participar da avaliação de cultura organizacional <strong>${avaliacao.nome}</strong>.
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          O questionário leva cerca de 5 minutos e não requer cadastro.
        </p>
        <a href="${link}" style="display:inline-block;background:#0f2244;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Responder Questionário →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">
          Ou acesse: <a href="${link}" style="color:#0f2244">${link}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:11px;margin:0">Este link é pessoal e intransferível. Use apenas uma vez.</p>
      </div>
    `,
  }).catch(() => { /* log silently */ });

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

const manualSchema = z.object({
  avaliacaoId: z.string().uuid(),
  respostas: z.record(z.string(), z.object({
    atual:    z.object({ CLAN: z.number(), ADHOCRACY: z.number(), MARKET: z.number(), HIERARCHY: z.number() }),
    desejado: z.object({ CLAN: z.number(), ADHOCRACY: z.number(), MARKET: z.number(), HIERARCHY: z.number() }),
  })),
});

export async function registrarResultadoManualAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { avaliacaoId, respostas } = parsed.data;

  const avaliacao = await prisma.avaliacaoCultura.findFirst({
    where: { id: avaliacaoId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!avaliacao) return { ok: false, error: 'Avaliação não encontrada' };

  for (const dim of DIMENSOES) {
    const d = respostas[dim.id];
    if (!d) return { ok: false, error: `Dimensão ${dim.label} não preenchida` };
    const sumA = d.atual.CLAN + d.atual.ADHOCRACY + d.atual.MARKET + d.atual.HIERARCHY;
    const sumD = d.desejado.CLAN + d.desejado.ADHOCRACY + d.desejado.MARKET + d.desejado.HIERARCHY;
    if (Math.abs(sumA - 100) > 1) return { ok: false, error: `${dim.label} (atual) deve somar 100` };
    if (Math.abs(sumD - 100) > 1) return { ok: false, error: `${dim.label} (desejado) deve somar 100` };
  }

  await prisma.respostaOcai.create({
    data: { avaliacaoId, respostas: respostas as object, manual: true },
  });

  revalidatePath(`/cultura/${avaliacaoId}`);
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
  if (convite.status === 'OPTADO_OUT') return { ok: false, error: 'Participação recusada para este link' };

  for (const dim of DIMENSOES) {
    const d = respostas[dim.id];
    if (!d) return { ok: false, error: `Dimensão ${dim.label} não preenchida` };
    const sumAtual    = d.atual.CLAN    + d.atual.ADHOCRACY    + d.atual.MARKET    + d.atual.HIERARCHY;
    const sumDesejado = d.desejado.CLAN + d.desejado.ADHOCRACY + d.desejado.MARKET + d.desejado.HIERARCHY;
    if (Math.abs(sumAtual    - 100) > 1) return { ok: false, error: `${dim.label} (atual) deve somar 100 pontos` };
    if (Math.abs(sumDesejado - 100) > 1) return { ok: false, error: `${dim.label} (desejado) deve somar 100 pontos` };
  }

  // Collect privacy-safe request metadata
  const hdrs       = await headers();
  const rawIp      = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  const ipHash     = hashIp(rawIp);
  const userAgent  = hdrs.get('user-agent') ?? null;
  const now        = new Date();

  await prisma.$transaction([
    prisma.respostaOcai.create({
      data: {
        avaliacaoId: convite.avaliacaoId,
        conviteId:   convite.id,
        respostas:   respostas as object,
        ipHash,
        userAgent,
      },
    }),
    prisma.conviteOcai.update({
      where: { id: convite.id },
      data:  { respondidoEm: now, consentAt: now, status: 'CONCLUIDO' },
    }),
  ]);

  return { ok: true, data: undefined };
}

export async function optarSairOcaiAction(token: string): Promise<ActionResult<void>> {
  const convite = await prisma.conviteOcai.findUnique({ where: { token } });
  if (!convite) return { ok: false, error: 'Link inválido' };
  if (convite.respondidoEm) return { ok: false, error: 'Este convite já foi respondido' };

  await prisma.conviteOcai.update({
    where: { token },
    data:  { status: 'OPTADO_OUT' },
  });

  return { ok: true, data: undefined };
}
