'use client';

import { useTransition, useState } from 'react';
import { sendInvitationsAction } from '@/modules/training/training.actions';

type Props = { turmaId: string; pendingCount: number };

export function SendInvitesButton({ turmaId, pendingCount }: Props) {
  const [sending, startSend] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (pendingCount === 0) {
    return (
      <span className="text-xs text-gray-400 italic">Todos os convites já foram enviados.</span>
    );
  }

  function handleSend() {
    if (!confirm(`Enviar convite para ${pendingCount} pessoa(s) ainda não notificada(s)?`)) return;
    startSend(async () => {
      const res = await sendInvitationsAction(turmaId);
      if (res.ok) {
        setResult({ ok: true, text: `${res.data.sent} convite(s) enviado(s).${res.data.skipped ? ` ${res.data.skipped} sem e-mail (ignorados).` : ''}` });
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {result && (
        <p className={`text-xs ${result.ok ? 'text-green-700' : 'text-red-600'}`}>{result.text}</p>
      )}
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
      >
        {sending ? 'Enviando…' : `Enviar Convites (${pendingCount})`}
      </button>
    </div>
  );
}
