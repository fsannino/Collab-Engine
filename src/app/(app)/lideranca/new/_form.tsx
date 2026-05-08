'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { criarLiderancaAction } from '@/modules/lideranca/lideranca.actions';

type Pessoa  = { id: string; nome: string; email: string | null };
type Projeto = { id: string; name: string };
type Area    = { id: string; nome: string };

export default function LiderancaNewForm({ pessoas, projetos, areas }: { pessoas: Pessoa[]; projetos: Projeto[]; areas: Area[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const input: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box', background: '#fff' };
  const label: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await criarLiderancaAction(Object.fromEntries(fd.entries()));
      if (res.ok) {
        router.push(`/lideranca/${res.data.id}`);
      } else {
        setError(res.error ?? 'Erro');
      }
    });
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '600px' }}>
      <div style={{ marginBottom: '8px' }}>
        <button onClick={() => router.push('/lideranca')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          ← Leadership Console
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Adicionar Líder</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', color: '#dc2626', fontSize: '13px' }}>{error}</div>}

        <div>
          <label style={label}>Pessoa *</label>
          <select name="pessoaId" required style={input}>
            <option value="">— selecione —</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.email ? ` (${p.email})` : ''}</option>)}
          </select>
        </div>

        <div>
          <label style={label}>Papel / Função na Mudança *</label>
          <input name="papel" required placeholder="Ex: Sponsor Executivo, Change Champion, Gestor Direto" style={input} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={label}>Projeto <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
            <select name="projectId" style={input}>
              <option value="">— nenhum —</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Área <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
            <select name="areaId" style={input}>
              <option value="">— nenhuma —</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="submit" disabled={isPending} style={{ padding: '10px 24px', background: '#0f2244', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Salvando…' : 'Adicionar'}
          </button>
          <button type="button" onClick={() => router.push('/lideranca')} style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
