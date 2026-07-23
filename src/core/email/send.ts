// Envio de e-mail via Resend (Issue 024 — Sprint 4).
//
// Em dev sem RESEND_API_KEY, o e-mail é logado no console em vez de enviado
// (comportamento documentado em .env.example) — permite testar o fluxo completo
// sem conta Resend.

import { Resend } from 'resend';
import { env } from '@/core/config/env';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  if (!resend) {
    console.warn(`[email:dev] to=${to} subject="${subject}" (RESEND_API_KEY ausente — não enviado)`);
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao enviar e-mail' };
  }
}
