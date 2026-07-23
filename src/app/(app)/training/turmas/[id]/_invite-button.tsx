'use client';

// Issue 024 — botão "Enviar convites" (Resend, modo 2: sem RSVP)

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendInvitationsAction } from '@/modules/training/training.actions';

export function InviteButton({ turmaId }: { turmaId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null);

  function enviar() {
    setMsg(null);
    startTransition(async () => {
      const res = await sendInvitationsAction(turmaId);
      if (!res.ok) {
        setMsg({ text: res.error, erro: true });
        return;
      }
      const { enviados, semEmail, jaEnviados, falhas } = res.data;
      const partes = [`${enviados} enviado(s)`];
      if (jaEnviados) partes.push(`${jaEnviados} já enviado(s) antes`);
      if (semEmail) partes.push(`${semEmail} sem e-mail cadastrado`);
      if (falhas) partes.push(`${falhas} falha(s)`);
      setMsg({ text: partes.join(' · '), erro: falhas > 0 });
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={enviar}
        disabled={isPending}
        className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {isPending ? 'Enviando…' : '✉ Enviar convites'}
      </button>
      {msg && (
        <p className={`text-xs rounded px-2 py-1 ${msg.erro ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
