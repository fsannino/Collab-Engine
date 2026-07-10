'use server';

import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';
import type { LmsEnrollmentPayload } from './lms.schema';

/**
 * Envia inscrições de uma turma para o LMS externo configurado no projeto.
 * O LMS recebe a lista de pessoas e o callbackUrl para enviar conclusões.
 */
export async function sendToLmsAction(turmaId: string): Promise<ActionResult<{ sent: number }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, deletedAt: null },
    include: {
      trainingItem: {
        select: {
          id: true,
          title: true,
          plan: { select: { tenantId: true, projectId: true, project: { select: { settings: true } } } },
        },
      },
      inscricoes: {
        where: { pessoaTreinamento: { deletedAt: null } },
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

  const projectSettings = turma.trainingItem.plan.project.settings as Record<string, unknown> | null;
  const lmsUrl = (projectSettings?.lmsWebhookUrl as string) ?? null;
  const lmsApiKey = (projectSettings?.lmsApiKey as string) ?? null;

  if (!lmsUrl) {
    return { ok: false, error: 'URL do LMS não configurada nas configurações do projeto (settings.lmsWebhookUrl)' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://engine.collabz.com.br';
  const callbackUrl = `${appUrl}/api/lms/completion`;

  const enrollments = turma.inscricoes
    .filter((i) => i.pessoaTreinamento.pessoa.email)
    .map((i) => ({
      pessoaTreinamentoId: i.pessoaTreinamentoId,
      email: i.pessoaTreinamento.pessoa.email!,
      name: i.pessoaTreinamento.pessoa.nome,
      courseTitle: turma.trainingItem.title,
    }));

  if (enrollments.length === 0) {
    return { ok: false, error: 'Nenhuma inscrição com e-mail válido' };
  }

  const payload: LmsEnrollmentPayload = {
    externalCourseId: turma.trainingItem.id,
    enrollments,
    callbackUrl,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (lmsApiKey) headers['x-api-key'] = lmsApiKey;

  const response = await fetch(lmsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, error: `LMS retornou ${response.status}: ${await response.text().catch(() => 'sem corpo')}` };
  }

  // Atualiza status das pessoas para EM_ANDAMENTO
  await prisma.pessoaTreinamento.updateMany({
    where: { id: { in: enrollments.map((e) => e.pessoaTreinamentoId) } },
    data: { status: 'EM_ANDAMENTO' },
  });

  return { ok: true, data: { sent: enrollments.length } };
}
