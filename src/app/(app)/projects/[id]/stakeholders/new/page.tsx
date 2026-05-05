'use client';

import { useActionState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createStakeholderAction } from '@/modules/stakeholder/stakeholder.actions';
import type { ActionResult } from '@/shared/types/action-result';

const POSITIONS = [
  { value: 'CHAMPION',   label: 'Campeão'     },
  { value: 'SUPPORTER',  label: 'Apoiador'    },
  { value: 'NEUTRAL',    label: 'Neutro'      },
  { value: 'RESISTOR',   label: 'Resistente'  },
  { value: 'ANTAGONIST', label: 'Antagonista' },
];

const LEVELS = [
  { value: 'C_LEVEL',           label: 'C-Level'         },
  { value: 'EXECUTIVE',         label: 'Executivo'        },
  { value: 'MIDDLE_MANAGEMENT', label: 'Gerência Média'   },
  { value: 'OPERATIONAL',       label: 'Operacional'      },
  { value: 'EXTERNAL',          label: 'Externo'          },
];

type State = ActionResult<{ projectStakeholderId: string; stakeholderId: string }> | null;

export default function NewStakeholderPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const input = Object.fromEntries(formData);
    const result = await createStakeholderAction({ ...input, projectId });
    if (result.ok) router.push(`/projects/${projectId}/stakeholders/${result.data.projectStakeholderId}`);
    return result;
  };

  const [state, formAction, pending] = useActionState(action, null);
  const issues = (!state?.ok && state?.issues) ? state.issues : {};

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Stakeholder</h1>
      <form action={formAction} className="space-y-4">
        <Field label="Nome *" error={issues.name?.[0]}>
          <input name="name" required className="input" placeholder="Nome completo" />
        </Field>
        <Field label="E-mail" error={issues.email?.[0]}>
          <input name="email" type="email" className="input" placeholder="email@empresa.com" />
        </Field>
        <Field label="Nível Organizacional" error={issues.organizationLevel?.[0]}>
          <select name="organizationLevel" className="input">
            <option value="">Selecione...</option>
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
        <Field label="Posição no Projeto *" error={issues.position?.[0]}>
          <select name="position" required className="input">
            <option value="">Selecione...</option>
            {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Influência (1–5) *" error={issues.influence?.[0]}>
            <input name="influence" type="number" min={1} max={5} required defaultValue={3} className="input" />
          </Field>
          <Field label="Interesse (1–5) *" error={issues.interest?.[0]}>
            <input name="interest" type="number" min={1} max={5} required defaultValue={3} className="input" />
          </Field>
        </div>
        <Field label="Observações" error={issues.notes?.[0]}>
          <textarea name="notes" rows={3} className="input min-h-20 resize-none" />
        </Field>
        {!state?.ok && state?.error && !state.issues && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {pending ? 'Salvando...' : 'Criar Stakeholder'}
          </button>
          <a href={`/projects/${projectId}/stakeholders`} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
