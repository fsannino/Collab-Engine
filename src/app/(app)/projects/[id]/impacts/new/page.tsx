'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createImpactAction } from '@/modules/impact/impact.actions';

const DIMENSIONS = [
  { value: 'PROCESS',    label: 'Processo'    },
  { value: 'PEOPLE',     label: 'Pessoas'     },
  { value: 'TECHNOLOGY', label: 'Tecnologia'  },
  { value: 'STRUCTURE',  label: 'Estrutura'   },
  { value: 'CULTURE',    label: 'Cultura'     },
  { value: 'POLICY',     label: 'Políticas'   },
  { value: 'METRICS',    label: 'Métricas'    },
];

type ActivityDraft = { id: string; title: string; description: string };

type WizardData = {
  title:         string;
  description:   string;
  dimension:     string;
  severityScore: number;
  extentScore:   number;
  mitigation:    string;
  activities:    ActivityDraft[];
};

const INITIAL: WizardData = {
  title: '', description: '', dimension: '',
  severityScore: 3, extentScore: 3, mitigation: '', activities: [],
};

export default function NewImpactPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep]   = useState(1);
  const [data, setData]   = useState<WizardData>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [pending, start]  = useTransition();

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  const addActivity = () =>
    update({ activities: [...data.activities, { id: crypto.randomUUID(), title: '', description: '' }] });

  const removeActivity = (id: string) =>
    update({ activities: data.activities.filter((a) => a.id !== id) });

  const patchActivity = (id: string, patch: Partial<ActivityDraft>) =>
    update({ activities: data.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const canStep1 = data.title.trim().length >= 3 && !!data.dimension;
  const canStep2 = data.activities.every((a) => a.title.trim().length > 0);
  const score    = data.severityScore * data.extentScore;

  const submit = () => {
    start(async () => {
      const result = await createImpactAction({
        projectId,
        title:         data.title,
        description:   data.description || undefined,
        dimension:     data.dimension,
        severityScore: data.severityScore,
        extentScore:   data.extentScore,
        mitigation:    data.mitigation || undefined,
        activities:    data.activities.map(({ title, description }) => ({
          title,
          description: description || undefined,
        })),
      });
      if (result.ok) {
        router.push(`/projects/${projectId}/impacts/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {(['Descrição', 'Atividades', 'Revisão'] as const).map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`text-xs hidden sm:inline ${s === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Descreva o impacto</h1>

          <Field label="Título *">
            <input className="input" value={data.title} onChange={(e) => update({ title: e.target.value })}
              placeholder="Ex: Mudança no processo de aprovação" />
          </Field>

          <Field label="Dimensão *">
            <select className="input" value={data.dimension} onChange={(e) => update({ dimension: e.target.value })}>
              <option value="">Selecione...</option>
              {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Severidade: ${data.severityScore}/5`}>
              <input type="range" min={1} max={5} value={data.severityScore}
                onChange={(e) => update({ severityScore: Number(e.target.value) })} className="w-full accent-blue-600" />
            </Field>
            <Field label={`Extensão: ${data.extentScore}/5`}>
              <input type="range" min={1} max={5} value={data.extentScore}
                onChange={(e) => update({ extentScore: Number(e.target.value) })} className="w-full accent-blue-600" />
            </Field>
          </div>
          <p className="text-sm text-gray-500">Score calculado: <strong className="text-gray-900">{score}</strong>/25</p>

          <Field label="Descrição">
            <textarea className="input resize-none" rows={3} value={data.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Contexto e efeitos do impacto..." />
          </Field>

          <Field label="Plano de Mitigação">
            <textarea className="input resize-none" rows={2} value={data.mitigation}
              onChange={(e) => update({ mitigation: e.target.value })}
              placeholder="Como será tratado..." />
          </Field>

          <div className="flex justify-end">
            <button disabled={!canStep1} onClick={() => setStep(2)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Atividades de mitigação</h1>
          <p className="text-sm text-gray-500">Opcional — adicione tarefas para tratar este impacto.</p>

          {data.activities.map((a) => (
            <div key={a.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Título da atividade *" value={a.title}
                  onChange={(e) => patchActivity(a.id, { title: e.target.value })} />
                <button onClick={() => removeActivity(a.id)} className="text-red-400 hover:text-red-600 px-1 text-lg" aria-label="Remover">×</button>
              </div>
              <input className="input text-sm" placeholder="Descrição (opcional)" value={a.description}
                onChange={(e) => patchActivity(a.id, { description: e.target.value })} />
            </div>
          ))}

          <button onClick={addActivity}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500">
            + Adicionar atividade
          </button>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</button>
            <button disabled={!canStep2} onClick={() => setStep(3)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Revisão</h1>

          <dl className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            <Row label="Título"    value={data.title} />
            <Row label="Dimensão"  value={DIMENSIONS.find((d) => d.value === data.dimension)?.label ?? ''} />
            <Row label="Score"     value={`${data.severityScore} × ${data.extentScore} = ${score}/25`} />
            {data.description && <Row label="Descrição"  value={data.description} />}
            {data.mitigation  && <Row label="Mitigação" value={data.mitigation}  />}
            <Row
              label="Atividades"
              value={data.activities.length === 0 ? 'Nenhuma' : data.activities.map((a) => a.title).join(', ')}
            />
          </dl>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</button>
            <button disabled={pending} onClick={submit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {pending ? 'Criando...' : 'Criar Impacto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <dt className="text-sm font-medium text-gray-500 w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 flex-1">{value}</dd>
    </div>
  );
}
