'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { createAvaliacaoAction } from '@/modules/cultura/cultura.actions';

type Project = { id: string; name: string };
type Area    = { id: string; nome: string };

export default function CulturaNewForm({ projects, areas }: { projects: Project[]; areas: Area[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'LIVRE' | 'PROJETO' | 'AREA'>('LIVRE');

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = await createAvaliacaoAction(data);
      if (res.ok) router.push(`/cultura/${res.data.id}`);
      else setError(res.error);
    });
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Nova Avaliação de Cultura</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>{error}</div>}

        <div>
          <label style={labelStyle}>Nome da Avaliação *</label>
          <input name="nome" required placeholder="ex: Diagnóstico Cultural Q1 2026 — TI" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Tipo *</label>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} style={{ ...inputStyle, background: '#fff' }}>
            <option value="LIVRE">Livre (diagnóstico independente)</option>
            <option value="PROJETO">Vinculada a Projeto (antes/depois da mudança)</option>
            <option value="AREA">Vinculada a Área / Departamento</option>
          </select>
        </div>

        {tipo === 'PROJETO' && (
          <div>
            <label style={labelStyle}>Projeto</label>
            <select name="projectId" style={{ ...inputStyle, background: '#fff' }}>
              <option value="">— selecione —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {tipo === 'AREA' && (
          <div>
            <label style={labelStyle}>Área</label>
            <select name="areaId" style={{ ...inputStyle, background: '#fff' }}>
              <option value="">— selecione —</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Descrição / Objetivo</label>
          <textarea name="descricao" rows={3} placeholder="Descreva o objetivo desta avaliação..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Data de Início</label>
            <input name="dataInicio" type="date" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Data de Encerramento</label>
            <input name="dataFim" type="date" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
          <strong style={{ color: '#0f2244' }}>Como funciona:</strong> após criar, você convida respondentes (pessoas internas ou externas). Cada respondente distribui 100 pontos por dimensão, para cultura atual e desejada. O resultado é um gráfico radar consolidado.
        </div>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button type="submit" disabled={isPending} style={{ padding: '10px 24px', background: '#0f2244', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Criando…' : 'Criar Avaliação'}
          </button>
          <button type="button" onClick={() => router.back()} style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
