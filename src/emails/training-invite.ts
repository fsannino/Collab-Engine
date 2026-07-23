// Template HTML do convite de treinamento (Issue 024 — Sprint 4).
//
// Modo 2 (decisão da issue): convite informativo, sem RSVP.
// O instrutor marca presença no dia da turma.

export type TrainingInviteData = {
  pessoaNome: string;
  treinamentoTitulo: string;
  turmaNome: string;
  dataInicio: Date;
  dataFim: Date;
  modality: string;
  local?: string | null;
  instrutorNome?: string | null;
  descricao?: string | null;
};

const MODALITY_LABEL: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  ONLINE: 'Online',
  HIBRIDO: 'Híbrido',
  AUTOESTUDO: 'Autoestudo',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtHora(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function renderTrainingInvite(data: TrainingInviteData): { subject: string; html: string } {
  const subject = `Convite: ${data.treinamentoTitulo} — ${fmtData(data.dataInicio)}`;

  const linhas: Array<[string, string]> = [
    ['Treinamento', data.treinamentoTitulo],
    ['Turma', data.turmaNome],
    ['Data', `${fmtData(data.dataInicio)} às ${fmtHora(data.dataInicio)} — ${fmtData(data.dataFim)} às ${fmtHora(data.dataFim)}`],
    ['Modalidade', MODALITY_LABEL[data.modality] ?? data.modality],
  ];
  if (data.local) linhas.push(['Local / Link', data.local]);
  if (data.instrutorNome) linhas.push(['Instrutor(a)', data.instrutorNome]);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1d4ed8;padding:20px 32px;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">Convite para Treinamento</p>
            <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">Collab Engine — CollabZ</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:14px;color:#111827;">Olá, <strong>${esc(data.pessoaNome)}</strong>!</p>
            <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.5;">
              Você foi convidado(a) para o treinamento abaixo. Sua participação é importante
              para a adoção das mudanças do projeto.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;">
              ${linhas
                .map(
                  ([label, valor], i) => `
              <tr style="${i % 2 === 1 ? 'background:#f9fafb;' : ''}">
                <td style="padding:10px 14px;font-size:12px;color:#6b7280;width:130px;">${esc(label)}</td>
                <td style="padding:10px 14px;font-size:13px;color:#111827;font-weight:600;">${esc(valor)}</td>
              </tr>`
                )
                .join('')}
            </table>
            ${
              data.descricao
                ? `<p style="margin:20px 0 0;font-size:13px;color:#374151;line-height:1.5;">${esc(data.descricao)}</p>`
                : ''
            }
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
              Este convite é informativo — não é necessário confirmar presença.
              A presença será registrada pelo instrutor no dia do treinamento.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Enviado automaticamente pelo Collab Engine. Em caso de dúvida, fale com o gestor do projeto.
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
