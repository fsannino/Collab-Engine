'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { convidarRespondentesAction } from '@/modules/cultura/cultura.actions';

type Avaliacao = { id: string; nome: string; status: string };
type Pessoa    = { id: string; nome: string; email: string | null };

export default function ConvidarForm({ avaliacao, pessoas }: { avaliacao: Avaliacao; pessoas: Pessoa[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPessoa, setSelectedPessoa] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };

  function handlePessoaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = pessoas.find((x) => x.id === e.target.value);
    setSelectedPessoa(e.target.value);
    if (p) {
      const form = e.target.closest('form') as HTMLFormElement;
      (form.elements.namedItem('nome') as HTMLInputElement).value  = p.nome;
      (form.elements.namedItem('email') as HTMLInputElement).value = p.email ?? '';
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd  = new FormData(e.currentTarget);
    const data = { ...Object.fromEntries(fd.entries()), avaliacaoId: avaliacao.id };
    startTransition(async () => {
      const res = await convidarRespondentesAction(data);
      if (res.ok) {
        setSuccess('Convidado adicionado com sucesso!');
        setError(null);
        (e.target as HTMLFormElement).reset();
        setSelectedPessoa('');
      } else {
        setError(res.error);
        setSuccess(null);
      }
    });
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '600px' }}>
      <div style={{ marginBottom: '8px' }}>
        <button onClick={() => router.push(`/cultura/${avaliacao.id}`)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          ← {avaliacao.nome}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Convidar Respondentes</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error   && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#15803d', fontSize: '13px' }}>{success}</div>}

        <div>
          <label style={labelStyle}>Buscar na base de pessoas <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
          <select value={selectedPessoa} onChange={handlePessoaChange} style={{ ...inputStyle, background: '#fff' }}>
            <option value="">— selecione para preencher —</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>)}
          </select>
          {selectedPessoa && <input type="hidden" name="pessoaId" value={selectedPessoa} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Nome *</label>
            <input name="nome" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>E-mail *</label>
            <input name="email" type="email" required style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
          O convidado receberá um link único para responder o questionário OCAI sem precisar fazer login.
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={isPending} style={{ padding: '10px 24px', background: '#0f2244', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Adicionando…' : 'Adicionar Convidado'}
          </button>
          <button type="button" onClick={() => router.push(`/cultura/${avaliacao.id}`)} style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            ← Ver Avaliação
          </button>
        </div>
      </form>
    </div>
  );
}
