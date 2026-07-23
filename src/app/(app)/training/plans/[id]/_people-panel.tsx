'use client';

import { useTransition, useState } from 'react';
import { removePessoaTreinamentoAction } from '@/modules/training/training.actions';

type Pessoa = {
  ptId: string;
  nome: string;
  email: string | null;
  derivedFromFuncao: boolean;
};

type Props = {
  trainingItemId: string;
  pessoas: Pessoa[];
};

export function PeoplePanel({ pessoas }: Props) {
  const [list, setList] = useState(pessoas);
  const [removing, startRemove] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove(ptId: string) {
    if (!confirm('Remover esta pessoa do treinamento?')) return;
    startRemove(async () => {
      const res = await removePessoaTreinamentoAction(ptId);
      if (res.ok) {
        setList((prev) => prev.filter((p) => p.ptId !== ptId));
      } else {
        setError(res.error);
      }
    });
  }

  if (list.length === 0) {
    return <p className="text-xs text-gray-400 italic py-2">Nenhuma pessoa designada.</p>;
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {list.map((p) => (
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
      ))}
    </div>
  );
}
