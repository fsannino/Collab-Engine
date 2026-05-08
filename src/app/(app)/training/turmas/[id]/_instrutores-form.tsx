'use client';

import { useTransition, useState } from 'react';
import {
  addTurmaInstrutorAction,
  removeTurmaInstrutorAction,
} from '@/modules/training/training.actions';

type Instrutor = {
  id: string;
  principal: boolean;
  pessoa: { id: string; nome: string };
};

type Pessoa = { id: string; nome: string };

type Props = {
  turmaId: string;
  instrutores: Instrutor[];
  pessoas: Pessoa[];
};

export function InstrutoresForm({ turmaId, instrutores, pessoas }: Props) {
  const [pessoaId, setPessoaId] = useState('');
  const [principal, setPrincipal] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, startAdd] = useTransition();
  const [removing, startRemove] = useTransition();

  const available = pessoas.filter(
    (p) => !instrutores.some((i) => i.pessoa.id === p.id)
  );

  function handleAdd() {
    if (!pessoaId) return;
    startAdd(async () => {
      const res = await addTurmaInstrutorAction({ turmaId, pessoaId, principal });
      if (res.ok) {
        setPessoaId('');
        setPrincipal(false);
        setMessage({ ok: true, text: 'Instrutor adicionado.' });
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  function handleRemove(id: string) {
    startRemove(async () => {
      const res = await removeTurmaInstrutorAction({ id });
      if (!res.ok) setMessage({ ok: false, text: res.error });
      else setMessage({ ok: true, text: 'Instrutor removido.' });
    });
  }

  return (
    <div>
      {message && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            background: message.ok ? '#f0fdf4' : '#fef2f2',
            color: message.ok ? '#166534' : '#991b1b',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Current instructors list */}
      {instrutores.length === 0 ? (
        <p style={{ padding: '12px 20px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
          Nenhum instrutor cadastrado.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: '0 20px' }}>
          {instrutores.map((inst) => (
            <li
              key={inst.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f1f5f9',
                fontSize: '13px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{inst.pessoa.nome}</span>
                {inst.principal && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#c9a227',
                      color: '#fff',
                      borderRadius: '9999px',
                      padding: '1px 8px',
                      fontWeight: 600,
                    }}
                  >
                    Principal
                  </span>
                )}
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => handleRemove(inst.id)}
                style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={pessoaId}
          onChange={(e) => setPessoaId(e.target.value)}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '13px',
            minWidth: '180px',
          }}
        >
          <option value="">Selecionar pessoa…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}>
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => setPrincipal(e.target.checked)}
          />
          Principal?
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !pessoaId}
          style={{
            background: '#0f2244',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            opacity: adding || !pessoaId ? 0.5 : 1,
          }}
        >
          {adding ? 'Adicionando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}
