function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><title>Collab Engine</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:20px 32px;">
          <span style="color:#fff;font-size:17px;font-weight:600;">Collab Engine</span>
          <span style="color:#94a3b8;font-size:12px;margin-left:8px;">Treinamento</span>
        </td></tr>
        <tr><td style="padding:28px 32px;">${body}</td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">CollabZ Consultoria &middot; Notificação automática</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── 1. OVERDUE_TRAINING ─────────────────────────────────────────────────────

export function buildOverdueTrainingEmail(params: {
  coordinatorName: string;
  projectName: string;
  items: Array<{ treinamento: string; pendentes: number }>;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `[Collab Engine] Treinamentos atrasados — ${params.projectName}`;
  const rows = params.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:#334155;">${i.treinamento}</td>` +
        `<td style="padding:6px 0;font-size:14px;color:#dc2626;font-weight:600;text-align:right;">${i.pendentes} pendente(s)</td></tr>`
    )
    .join('');

  const body = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Alerta de treinamentos atrasados</p>
    <p style="margin:0 0 20px;font-size:15px;color:#0f172a;">Olá, <strong>${params.coordinatorName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
      O projeto <strong>${params.projectName}</strong> possui pessoas designadas há mais de 30 dias em treinamentos sem turma agendada:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin-bottom:20px;">${rows}</table>
    <p style="margin:0;font-size:13px;color:#64748b;">
      <a href="${params.appUrl}/training/plans" style="color:#3b82f6;text-decoration:none;">Agendar turmas no Collab Engine →</a>
    </p>`;

  return { subject, html: wrap(body) };
}

// ── 2. TURMA_REMINDER ──────────────────────────────────────────────────────

export function buildTurmaReminderEmail(params: {
  recipientName: string;
  treinamento: string;
  turmaNome: string;
  dataInicio: Date;
  dataFim: Date;
  local: string | null;
  modality: string;
  isInstrutor: boolean;
  appUrl: string;
  turmaId: string;
}): { subject: string; html: string } {
  const subject = `[Collab Engine] Lembrete: ${params.treinamento} amanhã`;

  const MODALITY: Record<string, string> = {
    PRESENCIAL: 'Presencial', ONLINE: 'Online', HIBRIDO: 'Híbrido', AUTOESTUDO: 'Autoestudo',
  };

  const role = params.isInstrutor ? 'como <strong>instrutor(a)</strong>' : 'como <strong>participante</strong>';

  const body = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Lembrete de treinamento</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">Olá, <strong>${params.recipientName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
      Amanhã você participa de <strong>${params.treinamento}</strong> — ${params.turmaNome} ${role}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Data</p>
        <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">${fmtDate(params.dataInicio)}${params.dataInicio.getTime() !== params.dataFim.getTime() ? ' a ' + fmtDate(params.dataFim) : ''}</p>
        <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Modalidade</p>
        <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">${MODALITY[params.modality] ?? params.modality}</p>
        ${params.local ? `<p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Local / Link</p><p style="margin:0;font-size:14px;color:#0f172a;">${params.local}</p>` : ''}
      </td></tr>
    </table>
    ${params.isInstrutor ? `<p style="margin:0;font-size:13px;color:#64748b;">Não se esqueça de registrar a presença após a turma: <a href="${params.appUrl}/training/turmas/${params.turmaId}" style="color:#3b82f6;text-decoration:none;">abrir lista de presença →</a></p>` : ''}`;

  return { subject, html: wrap(body) };
}

// ── 3. ATTENDANCE_REMINDER ─────────────────────────────────────────────────

export function buildAttendanceReminderEmail(params: {
  instrutorName: string;
  treinamento: string;
  turmaNome: string;
  dataFim: Date;
  pendentes: number;
  appUrl: string;
  turmaId: string;
}): { subject: string; html: string } {
  const subject = `[Collab Engine] Presença não registrada — ${params.turmaNome}`;

  const body = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Registro de presença pendente</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">Olá, <strong>${params.instrutorName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
      A turma <strong>${params.turmaNome}</strong> de <strong>${params.treinamento}</strong> encerrou em ${fmtDate(params.dataFim)} e ainda há
      <strong style="color:#dc2626;">${params.pendentes} participante(s)</strong> sem presença marcada.
    </p>
    <p style="margin:0;font-size:13px;color:#64748b;">
      <a href="${params.appUrl}/training/turmas/${params.turmaId}" style="color:#3b82f6;text-decoration:none;">Registrar presença agora →</a>
    </p>`;

  return { subject, html: wrap(body) };
}
