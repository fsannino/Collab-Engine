'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addPessoaTreinamentoAction,
  removePessoaTreinamentoAction,
} from '@/modules/training/training.actions';

type Pessoa = {
  ptId: string;
  nome: string;
  email: string | null;
  derivedFromFuncao: boolean;
};

type Props = {
  trainingItemId: string;
  pessoas: Pessoa[];
  disponiveis: { id: string; nome: string }[];
};

export function PeoplePanel({ trainingItemId, pessoas, disponiveis }: Props) {
  const router = useRouter();
  const [removing, startRemove] = useTransition();
  const [adding, startAdd] = useTransition();
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleRemove(ptId: string) {
    if (!confirm('Remover esta pessoa do treinamento?')) return;
    setError(null);
    startRemove(async () => {
      const res = await removePessoaTreinamentoAction(ptId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function handleAdd() {
    if (!selectedId) return;
    setError(null);
    startAdd(async () => {
      const res = await addPessoaTreinamentoAction({ trainingItemId, pessoaId: selectedId });
      if (res.ok) {
        setSelectedId('');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {pessoas.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">Nenhuma pessoa designada.</p>
      ) : (
        pessoas.map((p) => (
          <div key={p.ptId} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
            <div>
              <span className="font-medium text-gray-800">{p.nome}</span>
              {p.email && <span className="text-xs text-gray-400 ml-2">{p.email}</span>}
              {!p.derivedFromFuncao && (
                <span className="ml-2 text-xs text-purple-600 bg-purple-50 rounded-full px-1.5 py-0.5">manual</span>
              )}
            </div>
            <button
              type="button"
              disabled={removing}
              onClick={() => handleRemove(p.ptId)}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 ml-3"
            >
              remover
            </button>
          </div>
        ))
      )}

      {disponiveis.length > 0 && (
        <div className="flex items-center gap-2 pt-1.5">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs flex-1 max-w-xs"
          >
            <option value="">Designar pessoa…</option>
            {disponiveis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !selectedId}
            className="text-xs rounded-lg px-2.5 py-1 bg-[#0f2244] text-white disabled:opacity-50"
          >
            {adding ? 'Designando…' : 'Designar'}
          </button>
        </div>
      )}
    </div>
  );
}
