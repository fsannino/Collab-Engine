'use client';

import { useTransition } from 'react';
import { reprocessarEventoAction, descartarEventoAction } from './_actions';

export function ReprocessarBtn({ eventoId }: { eventoId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await reprocessarEventoAction(eventoId); })}
      style={{ fontSize: '11px', padding: '3px 8px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '4px', cursor: isPending ? 'default' : 'pointer', fontWeight: 600 }}
    >
      {isPending ? '…' : '↺ Retry'}
    </button>
  );
}

export function DescartarBtn({ eventoId }: { eventoId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await descartarEventoAction(eventoId); })}
      style={{ fontSize: '11px', padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: isPending ? 'default' : 'pointer', fontWeight: 600 }}
    >
      {isPending ? '…' : 'Descartar'}
    </button>
  );
}
