'use client';

import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTrainingMatrixAction } from '@/modules/training/training.actions';

const DIMENSIONS = [
  { value: 'PROCESS',    label: 'Processo' },
  { value: 'PEOPLE',     label: 'Pessoas' },
  { value: 'TECHNOLOGY', label: 'Tecnologia' },
  { value: 'STRUCTURE',  label: 'Estrutura' },
  { value: 'CULTURE',    label: 'Cultura' },
  { value: 'POLICY',     label: 'Políticas' },
  { value: 'METRICS',    label: 'Métricas' },
] as const;

type Props = { projectId: string; impactId?: string };

export function TrainingMatrixForm({ projectId, impactId }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      const res = await createTrainingMatrixAction({
        projectId,
        impactId:    impactId || undefined,
        title:       fd.get('title') as string,
        description: (fd.get('description') as string) || undefined,
        dimension:   (fd.get('dimension') as string) || undefined,
        targetRole:  (fd.get('targetRole') as string) || undefined,
        durationH:   fd.get('durationH') ? Number(fd.get('durationH')) : undefined,
        mandatory:   fd.get('mandatory') === 'on',
        lmsModuleId: (fd.get('lmsModuleId') as string) || undefined,
      });
      if (res.ok) router.push(`/projects/${projectId}/training`);
      return res;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Título *</label>
        <input name="title" required minLength={3} maxLength={200}
          className="border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Treinamento ERP Financeiro" />
        {state?.issues?.title && <span className="text-xs text-red-600">{state.issues.title[0]}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Descrição</label>
        <textarea name="description" rows={3}
          className="border rounded-lg px-3 py-2 text-sm" placeholder="Objetivos e conteúdo do treinamento…" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Dimensão de Impacto</label>
          <select name="dimension" className="border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="">— opcional —</option>
            {DIMENSIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Público-alvo</label>
          <input name="targetRole" maxLength={100}
            className="border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Usuários finais" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Carga horária (h)</label>
          <input name="durationH" type="number" min={1} max={1000}
            className="border rounded-lg px-3 py-2 text-sm" placeholder="Ex: 8" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">ID no LMS</label>
          <input name="lmsModuleId"
            className="border rounded-lg px-3 py-2 text-sm" placeholder="Ex: MOD-2024-001" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="mandatory" type="checkbox" defaultChecked className="rounded" />
        Treinamento obrigatório
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Salvando…' : 'Criar Trilha de Treinamento'}
      </button>
    </form>
  );
}
