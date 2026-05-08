'use client';

import { useTransition, useState } from 'react';
import {
  linkFuncaoProcessoAction,
  unlinkFuncaoProcessoAction,
} from '@/modules/people/people.actions';

type Processo = { id: string; nome: string };

type ProcessoVinculado = {
  id: string;
  papel: string;
  observacao: string | null;
  processo: { id: string; nome: string } | null;
};

type Props = {
  funcaoId: string;
  processos: ProcessoVinculado[];
  available: Processo[];
};

const PAPEL_LABEL: Record<string, string> = {
  RESPONSIBLE:  'Responsible (R)',
  ACCOUNTABLE:  'Accountable (A)',
  CONSULTED:    'Consulted (C)',
  INFORMED:     'Informed (I)',
};

const PAPEL_COLOR: Record<string, { bg: string; color: string }> = {
  RESPONSIBLE: { bg: '#dbeafe', color: '#1d4ed8' },
  ACCOUNTABLE: { bg: '#fef3c7', color: '#92400e' },
  CONSULTED:   { bg: '#dcfce7', color: '#15803d' },
  INFORMED:    { bg: '#f3f4f6', color: '#374151' },
};

export function ProcessosForm({ funcaoId, processos, available }: Props) {
  const [processoId, setProcessoId] = useState('');
  const [papel, setPapel] = useState<'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED'>('RESPONSIBLE');
  const [observacao, setObservacao] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, startAdd] = useTransition();
  const [removing, startRemove] = useTransition();

  function handleAdd() {
    if (!processoId) return;
    startAdd(async () => {
      const res = await linkFuncaoProcessoAction({
        funcaoId,
        processoId,
        papel,
        observacao,
      });
      if (res.ok) {
        setProcessoId('');
        setPapel('RESPONSIBLE');
        setObservacao('');
        setMessage({ ok: true, text: 'Processo vinculado.' });
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  function handleRemove(id: string) {
    startRemove(async () => {
      const res = await unlinkFuncaoProcessoAction(id);
      if (!res.ok) setMessage({ ok: false, text: res.error });
      else setMessage({ ok: true, text: 'Vínculo removido.' });
    });
  }

  return (
    <div>
      {message && (
        <div
          style={{
            padding: '8px 0',
            fontSize: '13px',
            color: message.ok ? '#166534' : '#991b1b',
            marginBottom: '8px',
          }}
        >
          {message.text}
        </div>
      )}

      {/* List */}
      {processos.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '12px' }}>
          Nenhum processo vinculado.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
          {processos.map((fp) => {
            const colors = PAPEL_COLOR[fp.papel] ?? { bg: '#f1f5f9', color: '#475569' };
            return (
              <li
                key={fp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  {fp.processo ? (
                    <a
                      href={`/processos/${fp.processo.id}`}
                      style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500, textDecoration: 'none' }}
                    >
                      {fp.processo.nome}
                    </a>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>—</span>
                  )}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: colors.bg,
                      color: colors.color,
                      borderRadius: '9999px',
                      padding: '1px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {PAPEL_LABEL[fp.papel] ?? fp.papel}
                  </span>
                  {fp.observacao && (
                    <span style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fp.observacao}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => handleRemove(fp.id)}
                  style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  Desvincular
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add form */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={processoId}
          onChange={(e) => setProcessoId(e.target.value)}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '13px',
            minWidth: '180px',
          }}
        >
          <option value="">Selecionar processo…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value as 'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED')}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '13px',
          }}
        >
          <option value="RESPONSIBLE">R — Responsible</option>
          <option value="ACCOUNTABLE">A — Accountable</option>
          <option value="CONSULTED">C — Consulted</option>
          <option value="INFORMED">I — Informed</option>
        </select>
        <input
          type="text"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observação (opcional)"
          maxLength={500}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '13px',
            flex: '1 1 160px',
            minWidth: '120px',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !processoId}
          style={{
            background: '#0f2244',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            opacity: adding || !processoId ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {adding ? 'Vinculando…' : 'Vincular'}
        </button>
      </div>
    </div>
  );
}
