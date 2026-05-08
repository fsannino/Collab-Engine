type InviteData = {
  pessoaNome: string;
  treinamentoTitulo: string;
  turmaNome: string;
  dataInicio: Date;
  dataFim: Date;
  local: string | null;
  modality: string;
  instrutorNome?: string;
  planUrl: string;
};

const MODALITY_LABEL: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  ONLINE: 'Online',
  HIBRIDO: 'Híbrido',
  AUTOESTUDO: 'Autoestudo',
};

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function buildTrainingInviteEmail(data: InviteData): { subject: string; html: string } {
  const subject = `Convite de Treinamento: ${data.treinamentoTitulo} — ${data.turmaNome}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.3px;">Collab Engine</span>
            <span style="color:#94a3b8;font-size:13px;margin-left:8px;">Treinamento</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Convite de Participação</p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${data.treinamentoTitulo}</h1>

            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
              Olá, <strong>${data.pessoaNome}</strong>!<br/>
              Você foi designado(a) para participar do treinamento <strong>${data.turmaNome}</strong>.
            </p>

            <!-- Details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:12px;">
                        <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Turma</span><br/>
                        <span style="font-size:14px;color:#0f172a;font-weight:500;">${data.turmaNome}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:12px;">
                        <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Data</span><br/>
                        <span style="font-size:14px;color:#0f172a;">${fmtDate(data.dataInicio)}${data.dataInicio.getTime() !== data.dataFim.getTime() ? ' a ' + fmtDate(data.dataFim) : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:12px;">
                        <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Modalidade</span><br/>
                        <span style="font-size:14px;color:#0f172a;">${MODALITY_LABEL[data.modality] ?? data.modality}</span>
                      </td>
                    </tr>
                    ${data.local ? `
                    <tr>
                      <td style="padding-bottom:12px;">
                        <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Local / Link</span><br/>
                        <span style="font-size:14px;color:#0f172a;">${data.local}</span>
                      </td>
                    </tr>` : ''}
                    ${data.instrutorNome ? `
                    <tr>
                      <td>
                        <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Instrutor</span><br/>
                        <span style="font-size:14px;color:#0f172a;">${data.instrutorNome}</span>
                      </td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;font-size:13px;color:#64748b;line-height:1.6;">
              Este é um convite informativo. Não é necessário confirmar presença — o instrutor registrará a lista no dia.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              CollabZ Consultoria &middot; Uso interno &middot;
              <a href="${data.planUrl}" style="color:#3b82f6;text-decoration:none;">Ver plano no Collab Engine</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
