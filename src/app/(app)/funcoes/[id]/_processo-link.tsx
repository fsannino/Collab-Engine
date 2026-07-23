'use client';

// Issue 021 — UI de vinculação Função ↔ Processo (XPROC)

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  searchProcessosAction,
  vincularProcessoAction,
  desvincularProcessoAction,
} from '@/modules/people/funcao-processo.actions';
import type { XprocProcesso } from '@/integration/xproc/client';

const PAPEL_OPTIONS = [
  { value: 'RESPONSIBLE', label: 'Responsável (R)' },
  { value: 'ACCOUNTABLE', label: 'Aprovador (A)' },
  { value: 'CONSULTED',   label: 'Consultado (C)' },
  { value: 'INFORMED',    label: 'Informado (I)' },
] as const;

type Vinculo = {
  id: string;
  xprocProcessoId: string;
  processoNome: string | null;
  papel: string;
  observacao: string | null;
};

export function ProcessoLinkSection({
  funcaoId,
  vinculos,
  xprocDisponivel,
  papelLabel,
}: {
  funcaoId: string;
  vinculos: Vinculo[];
  xprocDisponivel: boolean;
  papelLabel: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState<XprocProcesso[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionado, setSelecionado] = useState<XprocProcesso | null>(null);
  const [papel, setPapel] = useState<string>('RESPONSIBLE');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    setBuscando(true);
    setErro(null);
    const res = await searchProcessosAction(search);
    setBuscando(false);
    if (!res.ok) {
      setErro(res.error);
      setResultados([]);
      return;
    }
    setResultados(res.data);
    if (res.data.length === 0) setErro('Nenhum processo encontrado no XPROC.');
  }

  function vincular() {
    if (!selecionado) return;
    setErro(null);
    startTransition(async () => {
      const res = await vincularProcessoAction({
        funcaoId,
        xprocProcessoId: selecionado.id,
        papel,
        observacao,
      });
      if (!res.ok) {
        setErro(res.error);
        return;
      }
      setShowForm(false);
      setSelecionado(null);
      setSearch('');
      setResultados([]);
      setObservacao('');
      router.refresh();
    });
  }

  function desvincular(vinculoId: string) {
    startTransition(async () => {
      const res = await desvincularProcessoAction(vinculoId);
      if (!res.ok) setErro(res.error);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Processos Vinculados (XPROC)
          <span className="ml-2 font-normal text-gray-400">({vinculos.length})</span>
        </h2>
        {xprocDisponivel && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            {showForm ? 'Cancelar' : '+ Vincular processo'}
          </button>
        )}
      </div>

      {!xprocDisponivel && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2 mb-3">
          Integração XPROC não configurada (defina <code>XPROC_API_URL</code> e{' '}
          <code>XPROC_API_KEY</code>). Vínculos existentes são exibidos, mas não é possível
          buscar processos.
        </p>
      )}

      {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}

      {/* Formulário de vinculação */}
      {showForm && xprocDisponivel && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Buscar processo por nome ou código…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={buscar}
              disabled={buscando}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {resultados.length > 0 && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 rounded border border-gray-200 bg-white">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(p)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                      selecionado?.id === p.id ? 'bg-blue-50 font-medium' : ''
                    }`}
                  >
                    {p.nome}
                    {p.codigo && <span className="ml-2 text-xs text-gray-400">{p.codigo}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selecionado && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-600">
                Selecionado: <span className="font-medium">{selecionado.nome}</span>
              </p>
              <div className="flex gap-2">
                <select
                  value={papel}
                  onChange={(e) => setPapel(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {PAPEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observação (opcional)"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={vincular}
                disabled={isPending}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isPending ? 'Vinculando…' : 'Vincular'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de vínculos */}
      {vinculos.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Nenhum processo vinculado.</p>
      ) : (
        <ul className="space-y-1">
          {vinculos.map((v) => (
            <li key={v.id} className="flex items-center justify-between text-sm gap-2">
              <div className="min-w-0">
                <span className="font-medium text-gray-800">
                  {v.processoNome ?? `Processo ${v.xprocProcessoId}`}
                </span>
                {v.observacao && (
                  <span className="ml-2 text-xs text-gray-400">{v.observacao}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  {papelLabel[v.papel] ?? v.papel}
                </span>
                <button
                  type="button"
                  onClick={() => desvincular(v.id)}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  title="Desvincular"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
