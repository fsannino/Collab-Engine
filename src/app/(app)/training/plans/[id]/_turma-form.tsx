'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTurmaAction } from '@/modules/training/training.actions';

type Props = {
  trainingItemId: string;
  defaultModality: string;
};

const MODALITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'PRESENCIAL',    label: 'Presencial' },
  { value: 'ONLINE',        label: 'Online' },
  { value: 'HIBRIDO',       label: 'Híbrido' },
  { value: 'AUTOESTUDO',    label: 'Autoestudo' },
  { value: 'DINAMICA',      label: 'Dinâmica' },
  { value: 'ONE_ON_ONE',    label: '1:1' },
  { value: 'MULTIPLICADOR', label: 'Multiplicador' },
];

export function TurmaForm({ trainingItemId, defaultModality }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [modality, setModality] = useState(defaultModality);
  const [local, setLocal] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [notaLimite, setNotaLimite] = useState('');

  function handleSubmit() {
    setError(null);
    if (!nome.trim() || !dataInicio || !dataFim) {
      setError('Preencha nome e datas da turma.');
      return;
    }
    startSave(async () => {
      const res = await createTurmaAction({
        trainingItemId,
        nome: nome.trim(),
        dataInicio,
        dataFim,
        modality,
        local: local.trim(),
        ...(capacidade ? { capacidade } : {}),
        ...(notaLimite ? { notaLimiteAprovacao: notaLimite } : {}),
      });
      if (res.ok) {
        setOpen(false);
        setNome('');
        setDataInicio('');
        setDataFim('');
        setLocal('');
        setCapacidade('');
        setNotaLimite('');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 text-gray-600 hover:bg-gray-50"
      >
        + Nova Turma
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da turma (ex.: Turma 1)"
          maxLength={200}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm flex-1 min-w-[160px]"
        />
        <select
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          {MODALITY_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-gray-500">
          Início{' '}
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Fim{' '}
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </label>
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Local (opcional)"
          maxLength={300}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm flex-1 min-w-[120px]"
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="number"
          min={1}
          value={capacidade}
          onChange={(e) => setCapacidade(e.target.value)}
          placeholder="Capacidade"
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-28"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={notaLimite}
          onChange={(e) => setNotaLimite(e.target.value)}
          placeholder="Nota mín. aprovação"
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-40"
        />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 text-gray-600 hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="text-xs rounded-lg px-3 py-1 bg-[#0f2244] text-white disabled:opacity-50"
          >
            {saving ? 'Criando…' : 'Criar turma'}
          </button>
        </div>
      </div>
    </div>
  );
}
