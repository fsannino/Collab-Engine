'use client';

import { useTransition, useState } from 'react';
import { savePresencaAction, encerrarTurmaAction } from '@/modules/training/training.actions';

type Inscricao = {
  id: string;
  presente: boolean | null;
  notaAvaliacao: number | null | undefined;
  observacao: string;
  pessoa: { id: string; nome: string; email: string | null };
};

type Props = {
  turmaId: string;
  inscricoes: Inscricao[];
  isConcluida: boolean;
};

export function AttendanceForm({ turmaId, inscricoes, isConcluida }: Props) {
  const [rows, setRows] = useState(() =>
    inscricoes.map((i) => ({
      id: i.id,
      presente: i.presente,
      notaAvaliacao: i.notaAvaliacao ?? null,
      observacao: i.observacao,
      pessoa: i.pessoa,
    }))
  );
  const [saving, startSave] = useTransition();
  const [encerring, startEncerrar] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function setPresente(idx: number, value: boolean | null) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, presente: value } : r)));
  }

  function setNota(idx: number, value: number | null) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, notaAvaliacao: value } : r)));
  }

  function setObs(idx: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, observacao: value } : r)));
  }

  function handleSave() {
    startSave(async () => {
      const res = await savePresencaAction({
        turmaId,
        inscricoes: rows.map((r) => ({
          id: r.id,
          presente: r.presente,
          notaAvaliacao: r.notaAvaliacao,
          observacao: r.observacao,
        })),
      });
      setMessage(res.ok ? { ok: true, text: 'Presença salva com sucesso.' } : { ok: false, text: res.error });
    });
  }

  function handleEncerrar() {
    if (!confirm('Encerrar a turma? Esta ação não pode ser desfeita.')) return;
    startEncerrar(async () => {
      const res = await encerrarTurmaAction({ turmaId });
      if (res.ok) {
        setMessage({ ok: true, text: 'Turma encerrada com sucesso.' });
        window.location.reload();
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div>
      {message && (
        <div className={`px-5 py-2.5 text-sm ${message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Pessoa</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase w-32">Presença</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase w-24">Nota (1–5)</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-800">{row.pessoa.nome}</span>
                  {row.pessoa.email && (
                    <p className="text-xs text-gray-500">{row.pessoa.email}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1.5">
                    <button
                      type="button"
                      disabled={isConcluida}
                      onClick={() => setPresente(idx, row.presente === true ? null : true)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                        row.presente === true
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                      } disabled:opacity-50 disabled:cursor-default`}
                    >
                      P
                    </button>
                    <button
                      type="button"
                      disabled={isConcluida}
                      onClick={() => setPresente(idx, row.presente === false ? null : false)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                        row.presente === false
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                      } disabled:opacity-50 disabled:cursor-default`}
                    >
                      A
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    disabled={isConcluida}
                    value={row.notaAvaliacao ?? ''}
                    onChange={(e) => setNota(idx, e.target.value ? Number(e.target.value) : null)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-16 text-center disabled:bg-gray-50 disabled:cursor-default"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    disabled={isConcluida}
                    value={row.observacao}
                    onChange={(e) => setObs(idx, e.target.value)}
                    placeholder="Observação…"
                    maxLength={500}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs disabled:bg-gray-50 disabled:cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isConcluida && (
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar Presença'}
          </button>
          <button
            type="button"
            onClick={handleEncerrar}
            disabled={encerring}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {encerring ? 'Encerrando…' : 'Encerrar Turma'}
          </button>
        </div>
      )}
    </div>
  );
}
