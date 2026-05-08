import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';
import {
  buildOverdueTrainingEmail,
  buildTurmaReminderEmail,
  buildAttendanceReminderEmail,
} from '@/emails/cron-notifications';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://engine.collabz.com.br';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Collab Engine <noreply@collabz.com.br>';

type CronResult = { type: string; sent: number; skipped: number; errors: number };

async function alreadySentToday(type: string, refId: string, recipientEmail: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const count = await prisma.notificationLog.count({
    where: { type: type as never, refId, recipientEmail, createdAt: { gte: since } },
  });
  return count > 0;
}

async function logSent(tenantId: string, type: string, recipientEmail: string, subject: string, refId: string) {
  await prisma.notificationLog.create({
    data: { tenantId, type: type as never, recipientEmail, subject, refId },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
  return !error;
}

// ── 1. Treinamentos atrasados (+30 dias sem turma agendada) ──────────────────

async function notifyOverdueTrainings(): Promise<CronResult> {
  let sent = 0, skipped = 0, errors = 0;

  // Find TrainingPlans that have items with PENDENTE pessoas and no future turma
  const plans = await prisma.trainingPlan.findMany({
    where: { deletedAt: null },
    include: {
      project: { select: { name: true } },
      items: {
        where: { deletedAt: null },
        include: {
          pessoas: {
            where: {
              status: 'PENDENTE',
              deletedAt: null,
              createdAt: { lte: new Date(Date.now() - 30 * 86_400_000) },
            },
          },
          turmas: {
            where: {
              deletedAt: null,
              status: { in: ['AGENDADA', 'EM_ANDAMENTO'] },
            },
            select: { id: true },
          },
        },
      },
    },
  });

  for (const plan of plans) {
    const overdueItems = plan.items.filter(
      (i) => i.pessoas.length > 0 && i.turmas.length === 0
    );
    if (overdueItems.length === 0) continue;

    // Get coordinator email (plan.createdBy is a userId)
    const coordinator = await prisma.user.findFirst({
      where: { id: plan.createdBy, deletedAt: null },
      select: { email: true, name: true },
    });
    if (!coordinator) { skipped++; continue; }

    const refId = `overdue-${plan.id}`;
    if (await alreadySentToday('OVERDUE_TRAINING', refId, coordinator.email)) {
      skipped++;
      continue;
    }

    const { subject, html } = buildOverdueTrainingEmail({
      coordinatorName: coordinator.name,
      projectName:     plan.project.name,
      items:           overdueItems.map((i) => ({ treinamento: i.title, pendentes: i.pessoas.length })),
      appUrl:          APP_URL,
    });

    const ok = await sendEmail(coordinator.email, subject, html);
    if (ok) {
      await logSent(plan.tenantId, 'OVERDUE_TRAINING', coordinator.email, subject, refId);
      sent++;
    } else {
      errors++;
    }
  }

  return { type: 'OVERDUE_TRAINING', sent, skipped, errors };
}

// ── 2. Lembrete de turmas amanhã ─────────────────────────────────────────────

async function notifyTurmasAmanha(): Promise<CronResult> {
  let sent = 0, skipped = 0, errors = 0;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
  const end   = new Date(tomorrow); end.setHours(23, 59, 59, 999);

  const turmas = await prisma.turma.findMany({
    where: {
      status:    'AGENDADA',
      deletedAt: null,
      dataInicio: { gte: start, lte: end },
    },
    include: {
      trainingItem: {
        select: { title: true, plan: { select: { tenantId: true } } },
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

  for (const turma of turmas) {
    const tenantId = turma.trainingItem.plan.tenantId;

    // Notify inscritos
    for (const inscricao of turma.inscricoes) {
      const pessoa = inscricao.pessoaTreinamento.pessoa;
      if (!pessoa.email) { skipped++; continue; }

      const refId = `turma-reminder-${turma.id}-${pessoa.email}`;
      if (await alreadySentToday('TURMA_REMINDER', refId, pessoa.email)) { skipped++; continue; }

      const { subject, html } = buildTurmaReminderEmail({
        recipientName: pessoa.nome,
        treinamento:   turma.trainingItem.title,
        turmaNome:     turma.nome,
        dataInicio:    turma.dataInicio,
        dataFim:       turma.dataFim,
        local:         turma.local,
        modality:      turma.modality,
        isInstrutor:   false,
        appUrl:        APP_URL,
        turmaId:       turma.id,
      });

      const ok = await sendEmail(pessoa.email, subject, html);
      if (ok) {
        await logSent(tenantId, 'TURMA_REMINDER', pessoa.email, subject, refId);
        sent++;
      } else {
        errors++;
      }
    }

    // Notify instrutores (via TurmaInstrutor join table)
    const instrutores = await prisma.turmaInstrutor.findMany({
      where: { turmaId: turma.id },
      include: { pessoa: { select: { email: true, nome: true } } },
    });
    for (const ti of instrutores) {
      if (!ti.pessoa.email) { skipped++; continue; }
      const refId = `turma-reminder-${turma.id}-instrutor-${ti.pessoaId}`;
      if (await alreadySentToday('TURMA_REMINDER', refId, ti.pessoa.email)) { skipped++; continue; }
      const { subject, html } = buildTurmaReminderEmail({
        recipientName: ti.pessoa.nome,
        treinamento:   turma.trainingItem.title,
        turmaNome:     turma.nome,
        dataInicio:    turma.dataInicio,
        dataFim:       turma.dataFim,
        local:         turma.local,
        modality:      turma.modality,
        isInstrutor:   true,
        appUrl:        APP_URL,
        turmaId:       turma.id,
      });
      const ok = await sendEmail(ti.pessoa.email, subject, html);
      if (ok) {
        await logSent(tenantId, 'TURMA_REMINDER', ti.pessoa.email, subject, refId);
        sent++;
      } else {
        errors++;
      }
    }
  }

  return { type: 'TURMA_REMINDER', sent, skipped, errors };
}

// ── 3. Presença não registrada (turmas encerradas ontem) ─────────────────────

async function notifyAttendancePending(): Promise<CronResult> {
  let sent = 0, skipped = 0, errors = 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const start = new Date(yesterday); start.setHours(0, 0, 0, 0);
  const end   = new Date(yesterday); end.setHours(23, 59, 59, 999);

  const turmas = await prisma.turma.findMany({
    where: {
      status:    { notIn: ['CONCLUIDA', 'CANCELADA'] },
      deletedAt: null,
      dataFim:   { gte: start, lte: end },
      inscricoes: { some: { presente: null } },
    },
    include: {
      trainingItem: {
        select: { title: true, plan: { select: { tenantId: true } } },
      },
      inscricoes: { select: { presente: true } },
    },
  });

  for (const turma of turmas) {
    const pendentes = turma.inscricoes.filter((i) => i.presente === null).length;
    const instrutores = await prisma.turmaInstrutor.findMany({
      where: { turmaId: turma.id },
      include: { pessoa: { select: { email: true, nome: true } } },
    });

    if (instrutores.length === 0) { skipped++; continue; }

    for (const ti of instrutores) {
      if (!ti.pessoa.email) { skipped++; continue; }

      const refId = `attendance-${turma.id}-${ti.pessoaId}`;
      if (await alreadySentToday('ATTENDANCE_REMINDER', refId, ti.pessoa.email)) { skipped++; continue; }

      const { subject, html } = buildAttendanceReminderEmail({
        instrutorName: ti.pessoa.nome,
        treinamento:   turma.trainingItem.title,
        turmaNome:     turma.nome,
        dataFim:       turma.dataFim,
        pendentes,
        appUrl:        APP_URL,
        turmaId:       turma.id,
      });

      const ok = await sendEmail(ti.pessoa.email, subject, html);
      if (ok) {
        await logSent(turma.trainingItem.plan.tenantId, 'ATTENDANCE_REMINDER', ti.pessoa.email, subject, refId);
        sent++;
      } else {
        errors++;
      }
    }
  }

  return { type: 'ATTENDANCE_REMINDER', sent, skipped, errors };
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function runTrainingNotificationCron(): Promise<CronResult[]> {
  const results = await Promise.allSettled([
    notifyOverdueTrainings(),
    notifyTurmasAmanha(),
    notifyAttendancePending(),
  ]);

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { type: 'unknown', sent: 0, skipped: 0, errors: 1 }
  );
}
