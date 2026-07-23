// Issue 027 — Notificações automatizadas de treinamento (Sprint 4)
//
// Executado diariamente via cron (POST /api/cron/training-notifications):
//   1. Pessoas designadas há +30 dias sem turma agendada → e-mail ao coordenador do plano
//   2. Turmas amanhã → lembrete para inscritos e instrutor
//   3. Turmas que terminaram ontem sem presença marcada → e-mail ao instrutor
//
// Cada envio é registrado em NotificationLog (auditoria + dedup para o cron
// ser idempotente em re-execuções).

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/core/email/send';
import type { NotificationType } from '@prisma/client';

const DIAS_ATRASO = 30;
const DEDUP_ATRASADO_DIAS = 7; // 1 e-mail de atrasados por plano por semana

export type NotificationsSummary = {
  atrasados: number;
  lembretes: number;
  presencaPendente: number;
  falhas: number;
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtData(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function wrapHtml(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#111827;font-size:14px;line-height:1.5;">
<h2 style="color:#1d4ed8;font-size:16px;">${esc(titulo)}</h2>
${corpo}
<p style="color:#9ca3af;font-size:11px;margin-top:24px;">Enviado automaticamente pelo Collab Engine (CollabZ).</p>
</body></html>`;
}

async function jaNotificado(
  type: NotificationType,
  refId: string,
  recipient: string,
  janelaHoras: number,
): Promise<boolean> {
  const desde = new Date(Date.now() - janelaHoras * 60 * 60 * 1000);
  const existente = await prisma.notificationLog.findFirst({
    where: { type, refId, recipient, status: 'SENT', createdAt: { gte: desde } },
    select: { id: true },
  });
  return Boolean(existente);
}

async function notificar(params: {
  tenantId: string | null;
  type: NotificationType;
  recipient: string;
  subject: string;
  html: string;
  refId: string;
}): Promise<boolean> {
  const result = await sendEmail({
    to: params.recipient,
    subject: params.subject,
    html: params.html,
  });
  await prisma.notificationLog.create({
    data: {
      tenantId: params.tenantId,
      type: params.type,
      recipient: params.recipient,
      subject: params.subject,
      refId: params.refId,
      status: result.ok ? 'SENT' : 'FAILED',
      error: result.ok ? null : result.error,
    },
  });
  return result.ok;
}

// ─── 1. Atrasados → coordenador ──────────────────────────────────────────────

async function notificarAtrasados(summary: NotificationsSummary): Promise<void> {
  const corte = new Date(Date.now() - DIAS_ATRASO * 24 * 60 * 60 * 1000);

  const atrasados = await prisma.pessoaTreinamento.findMany({
    where: {
      status: 'PENDENTE',
      deletedAt: null,
      createdAt: { lt: corte },
      inscricoes: { none: {} },
      trainingItem: { deletedAt: null, plan: { deletedAt: null } },
    },
    select: {
      createdAt: true,
      pessoa: { select: { nome: true } },
      trainingItem: {
        select: {
          title: true,
          plan: { select: { id: true, name: true, tenantId: true, createdBy: true } },
        },
      },
    },
  });

  // Agrupa por plano — 1 e-mail por plano para o coordenador (createdBy)
  const porPlano = new Map<
    string,
    {
      plan: { id: string; name: string; tenantId: string; createdBy: string };
      linhas: Array<{ pessoa: string; item: string; desde: Date }>;
    }
  >();
  for (const a of atrasados) {
    const plan = a.trainingItem.plan;
    const grupo = porPlano.get(plan.id) ?? { plan, linhas: [] };
    grupo.linhas.push({ pessoa: a.pessoa.nome, item: a.trainingItem.title, desde: a.createdAt });
    porPlano.set(plan.id, grupo);
  }

  for (const { plan, linhas } of porPlano.values()) {
    const coordenador = await prisma.user.findFirst({
      where: { id: plan.createdBy, deletedAt: null, active: true },
      select: { email: true, name: true },
    });
    if (!coordenador?.email) continue;

    if (
      await jaNotificado(
        'TRAINING_ATRASADO_COORDENADOR',
        plan.id,
        coordenador.email,
        DEDUP_ATRASADO_DIAS * 24,
      )
    ) {
      continue;
    }

    const subject = `[Collab Engine] ${linhas.length} pessoa(s) atrasada(s) no plano "${plan.name}"`;
    const lista = linhas
      .map((l) => `<li>${esc(l.pessoa)} — ${esc(l.item)} (designado em ${fmtData(l.desde)})</li>`)
      .join('');
    const html = wrapHtml(
      'Treinamentos atrasados',
      `<p>Olá, ${esc(coordenador.name)}. As pessoas abaixo estão designadas há mais de ${DIAS_ATRASO} dias sem turma agendada no plano <strong>${esc(plan.name)}</strong>:</p><ul>${lista}</ul><p>Agende turmas ou revise as designações.</p>`,
    );

    const ok = await notificar({
      tenantId: plan.tenantId,
      type: 'TRAINING_ATRASADO_COORDENADOR',
      recipient: coordenador.email,
      subject,
      html,
      refId: plan.id,
    });
    if (ok) summary.atrasados++;
    else summary.falhas++;
  }
}

// ─── 2. Turmas amanhã → lembrete ─────────────────────────────────────────────

async function notificarTurmasAmanha(summary: NotificationsSummary): Promise<void> {
  const hoje = new Date();
  const amanhaInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const amanhaFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2);

  const turmas = await prisma.turma.findMany({
    where: {
      deletedAt: null,
      status: 'AGENDADA',
      dataInicio: { gte: amanhaInicio, lt: amanhaFim },
    },
    include: {
      trainingItem: { select: { title: true, plan: { select: { tenantId: true } } } },
      inscricoes: {
        include: {
          pessoaTreinamento: { include: { pessoa: { select: { nome: true, email: true } } } },
        },
      },
    },
  });

  for (const turma of turmas) {
    const tenantId = turma.trainingItem.plan.tenantId;
    const subject = `[Lembrete] Treinamento amanhã: ${turma.trainingItem.title}`;
    const detalhes = `<p><strong>${esc(turma.nome)}</strong> — ${esc(turma.trainingItem.title)}<br/>Data: ${fmtData(turma.dataInicio)}${turma.local ? `<br/>Local/Link: ${esc(turma.local)}` : ''}</p>`;

    // Inscritos
    for (const insc of turma.inscricoes) {
      const pessoa = insc.pessoaTreinamento.pessoa;
      if (!pessoa.email) continue;
      if (await jaNotificado('TURMA_LEMBRETE_AMANHA', turma.id, pessoa.email, 48)) continue;

      const html = wrapHtml(
        'Seu treinamento é amanhã',
        `<p>Olá, ${esc(pessoa.nome)}!</p>${detalhes}<p>Contamos com a sua presença.</p>`,
      );
      const ok = await notificar({
        tenantId,
        type: 'TURMA_LEMBRETE_AMANHA',
        recipient: pessoa.email,
        subject,
        html,
        refId: turma.id,
      });
      if (ok) summary.lembretes++;
      else summary.falhas++;
    }

    // Instrutor
    if (turma.instrutorId) {
      const instrutor = await prisma.user.findFirst({
        where: { id: turma.instrutorId, deletedAt: null, active: true },
        select: { email: true, name: true },
      });
      if (
        instrutor?.email &&
        !(await jaNotificado('TURMA_LEMBRETE_AMANHA', turma.id, instrutor.email, 48))
      ) {
        const html = wrapHtml(
          'Você instrui uma turma amanhã',
          `<p>Olá, ${esc(instrutor.name)}!</p>${detalhes}<p>${turma.inscricoes.length} pessoa(s) inscrita(s). Lembre-se de marcar a presença após a turma.</p>`,
        );
        const ok = await notificar({
          tenantId,
          type: 'TURMA_LEMBRETE_AMANHA',
          recipient: instrutor.email,
          subject,
          html,
          refId: turma.id,
        });
        if (ok) summary.lembretes++;
        else summary.falhas++;
      }
    }
  }
}

// ─── 3. Presença não marcada → instrutor ─────────────────────────────────────

async function notificarPresencaPendente(summary: NotificationsSummary): Promise<void> {
  const hoje = new Date();
  const ontemInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const turmas = await prisma.turma.findMany({
    where: {
      deletedAt: null,
      status: { in: ['AGENDADA', 'EM_ANDAMENTO'] },
      dataFim: { gte: ontemInicio, lt: hojeInicio },
      instrutorId: { not: null },
      inscricoes: { some: { presente: null } },
    },
    include: {
      trainingItem: { select: { title: true, plan: { select: { tenantId: true } } } },
      _count: { select: { inscricoes: true } },
    },
  });

  for (const turma of turmas) {
    const instrutor = await prisma.user.findFirst({
      where: { id: turma.instrutorId!, deletedAt: null, active: true },
      select: { email: true, name: true },
    });
    if (!instrutor?.email) continue;
    if (await jaNotificado('PRESENCA_PENDENTE_INSTRUTOR', turma.id, instrutor.email, 20)) continue;

    const subject = `[Pendente] Marcar presença: ${turma.nome}`;
    const html = wrapHtml(
      'Presença não registrada',
      `<p>Olá, ${esc(instrutor.name)}. A turma <strong>${esc(turma.nome)}</strong> (${esc(turma.trainingItem.title)}) terminou em ${fmtData(turma.dataFim)}, mas a presença ainda não foi registrada.</p><p>Acesse a turma no Collab Engine, marque a presença dos ${turma._count.inscricoes} inscrito(s) e encerre a turma.</p>`,
    );

    const ok = await notificar({
      tenantId: turma.trainingItem.plan.tenantId,
      type: 'PRESENCA_PENDENTE_INSTRUTOR',
      recipient: instrutor.email,
      subject,
      html,
      refId: turma.id,
    });
    if (ok) summary.presencaPendente++;
    else summary.falhas++;
  }
}

// ─── Entry point do cron ─────────────────────────────────────────────────────

export async function runTrainingNotifications(): Promise<NotificationsSummary> {
  const summary: NotificationsSummary = {
    atrasados: 0,
    lembretes: 0,
    presencaPendente: 0,
    falhas: 0,
  };
  await notificarAtrasados(summary);
  await notificarTurmasAmanha(summary);
  await notificarPresencaPendente(summary);
  return summary;
}
