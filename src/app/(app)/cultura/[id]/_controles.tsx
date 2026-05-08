'use client';

import { useTransition } from 'react';
import { ativarAvaliacaoAction, encerrarAvaliacaoAction } from '@/modules/cultura/cultura.actions';

export default function AvaliacaoControles({ avaliacaoId, status }: { avaliacaoId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  if (status === 'RASCUNHO') {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(() => ativarAvaliacaoAction(avaliacaoId))}
        style={{ padding: '8px 16px', background: '#0f2244', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Ativando…' : 'Ativar Avaliação'}
      </button>
    );
  }

  if (status === 'ATIVA') {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(() => encerrarAvaliacaoAction(avaliacaoId))}
        style={{ padding: '8px 16px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Encerrando…' : 'Encerrar'}
      </button>
    );
  }

  return null;
}
