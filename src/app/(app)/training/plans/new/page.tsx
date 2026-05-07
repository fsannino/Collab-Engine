'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, Suspense } from 'react';
import { createTrainingPlanAction, generateTrainingPlanAction } from '@/modules/training/training.actions';

function NewPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ?? '';
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultGeneratedName = `Plano de Treinamento — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createTrainingPlanAction(Object.fromEntries(fd.entries()));
      if (res.ok) {
        router.push(projectId ? `/projects/${projectId}/training` : '/training/plans');
      } else {
        setError(res.error);
      }
    });
  }

  function handleGenerate() {
    if (!projectId) {
      setError('Informe o projeto antes de gerar automaticamente.');
      return;
    }
    startGenerate(async () => {
      const res = await generateTrainingPlanAction({ projectId, name: defaultGeneratedName });
      if (res.ok) {
        router.push(`/training/plans/${res.data.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Novo Plano de Treinamento</h1>

      {/* Auto-generate card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 space-y-2">
        <div>
          <p className="text-sm font-semibold text-blue-800">Geração automática</p>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            Cria um plano com um item de treinamento por Função cadastrada, adicionando automaticamente todas as pessoas ativas nessa função.
          </p>
        </div>
        {error && isGenerating === false && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !projectId}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Gerando…' : 'Gerar automaticamente'}
        </button>
        {!projectId && (
          <p className="text-xs text-blue-500 italic">Disponível apenas quando acessado a partir de um projeto.</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">ou criar manualmente</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Manual form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && !isGenerating && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <input type="hidden" name="projectId" value={projectId} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input
            name="name"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            name="description"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              name="startDate"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              name="endDate"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? 'Salvando…' : 'Criar Plano'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewTrainingPlanPage() {
  return (
    <Suspense>
      <NewPlanForm />
    </Suspense>
  );
}
