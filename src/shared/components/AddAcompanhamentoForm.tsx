'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addAcompanhamentoAction } from '@/modules/impact/impact.actions';
import type { ImpactStatus } from '@prisma/client';

const OPTIONS: { value: ImpactStatus; label: string }[] = [
  { value: 'DRAFT',      label: 'Rascunho'  },
  { value: 'ACTIVE',     label: 'Ativo'     },
  { value: 'MITIGATING', label: 'Mitigando' },
  { value: 'RESOLVED',   label: 'Resolvido' },
  { value: 'CLOSED',     label: 'Encerrado' },
];

export function AddAcompanhamentoForm({
  impactId,
  currentStatus,
}: {
  impactId: string;
  currentStatus: ImpactStatus;
}) {
  const router               = useRouter();
  const [pending, start]     = useTransition();
  const [open, setOpen]      = useState(false);
  const [note, setNote]      = useState('');
  const [newStatus, setNewStatus] = useState<ImpactStatus>(currentStatus);
  const [error, setError]    = useState<string | null>(null);

  const submit = () => {
    if (!note.trim()) return;
    start(async () => {
      const result = await addAcompanhamentoAction({ impactId, newStatus, note });
      if (result.ok) {
        setOpen(false);
        setNote('');
        setNewStatus(currentStatus);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
      >
        + Acompanhamento
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3 w-full">
      <h3 className="text-sm font-semibold text-gray-700">Novo Acompanhamento</h3>

      <div>
        <label className="text-xs font-medium text-gray-600">Novo Status</label>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as ImpactStatus)}
          className="mt-1 w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
        >
          {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Observação *</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full text-sm border border-gray-200 rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Descreva o progresso ou mudança..."
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={!note.trim() || pending}
          onClick={submit}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
