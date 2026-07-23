'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inscreverPessoaAction } from '@/modules/training/training.actions';

type Candidato = {
  ptId: string;
  nome: string;
  email: string | null;
};

type Props = {
  turmaId: string;
  candidatos: Candidato[];
};

export function EnrollPanel({ turmaId, candidatos }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [, startEnroll] = useTransition();

  function handleEnroll(ptId: string) {
    setError(null);
    setEnrollingId(ptId);
    startEnroll(async () => {
      const res = await inscreverPessoaAction(turmaId, ptId);
      setEnrollingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (candidatos.length === 0) {
    return (
      <p className="px-5 py-3 text-xs text-gray-400 italic">
        Todas as pessoas designadas ao item já estão inscritas nesta turma.
      </p>
    );
  }

  return (
    <div className="px-5 py-3 space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {candidatos.map((c) => (
        <div key={c.ptId} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
          <div>
            <span className="font-medium text-gray-800">{c.nome}</span>
            {c.email && <span className="text-xs text-gray-400 ml-2">{c.email}</span>}
          </div>
          <button
            type="button"
            disabled={enrollingId !== null}
            onClick={() => handleEnroll(c.ptId)}
            className="text-xs rounded-lg px-2.5 py-1 bg-[#0f2244] text-white disabled:opacity-50"
          >
            {enrollingId === c.ptId ? 'Inscrevendo…' : 'Inscrever'}
          </button>
        </div>
      ))}
    </div>
  );
}
