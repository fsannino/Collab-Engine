'use client';

// Issue 023 — botão "Gerar plano automaticamente"

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateTrainingPlanAction } from '@/modules/training/plan-generator';

export function GeneratePlanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function gerar() {
    setError(null);
    startTransition(async () => {
      const res = await generateTrainingPlanAction({ projectId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/training/plans/${res.data.planId}`);
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={gerar}
        disabled={isPending}
        className="px-4 py-2 border border-blue-600 text-blue-600 text-sm rounded-lg hover:bg-blue-50 disabled:opacity-50"
        title="Deriva itens do catálogo pelas dimensões dos impactos e designa pessoas pelas funções afetadas"
      >
        {isPending ? 'Gerando…' : '⚡ Gerar plano automaticamente'}
      </button>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 max-w-sm text-right">{error}</p>
      )}
    </div>
  );
}
