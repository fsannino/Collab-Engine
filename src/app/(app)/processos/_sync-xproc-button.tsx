'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncXprocProcessosAction } from '@/modules/processos/processos.actions';

export function SyncXprocButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  function handleSync() {
    setMsg(null);
    startTransition(async () => {
      const result = await syncXprocProcessosAction();
      if (result.ok) {
        const { criados, atualizados, ignorados, total } = result.data;
        setMsg({
          text: `Sincronizado: ${criados} criado(s), ${atualizados} atualizado(s)${ignorados ? `, ${ignorados} ignorado(s)` : ''} de ${total}.`,
          error: false,
        });
        router.refresh();
      } else {
        setMsg({ text: result.error, error: true });
      }
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {msg && (
        <span style={{ fontSize: '12px', color: msg.error ? '#b91c1c' : '#15803d' }}>
          {msg.text}
        </span>
      )}
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        style={{
          padding: '9px 18px',
          background: 'transparent',
          color: '#0f2244',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Sincronizando…' : '⟳ Sincronizar XPROC'}
      </button>
    </div>
  );
}
