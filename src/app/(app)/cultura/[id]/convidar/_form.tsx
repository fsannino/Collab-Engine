'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { convidarRespondentesAction, convidarEmLoteAction } from '@/modules/cultura/cultura.actions';

type Avaliacao = { id: string; nome: string; status: string };
type Pessoa    = { id: string; nome: string; email: string | null };
type CsvRow    = { nome: string; email: string; valid: boolean; motivo?: string };

function parseCsv(raw: string): CsvRow[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.toLowerCase().startsWith('nome') && !l.toLowerCase().startsWith('name'))
    .map((line) => {
      const [nome = '', email = ''] = line.split(/[,;|\t]/).map((s) => s.trim().replace(/^["']|["']$/g, ''));
      const valid = nome.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const motivo = !nome || nome.length < 2 ? 'Nome inválido' : !email ? 'E-mail em falta' : !valid ? 'E-mail inválido' : undefined;
      return { nome, email, valid, motivo };
    });
}

export default function ConvidarForm({ avaliacao, pessoas }: { avaliacao: Avaliacao; pessoas: Pessoa[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab]           = useState<'individual' | 'lote'>('individual');
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [selectedPessoa, setSelectedPessoa] = useState('');

  // Batch state
  const [csvText, setCsvText]   = useState('');
  const [preview, setPreview]   = useState<CsvRow[]>([]);
  const [batchResult, setBatchResult] = useState<{ criados: number; duplicados: number } | null>(null);

  const inputStyle: React.CSSProperties  = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties  = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };

  function handlePessoaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = pessoas.find((x) => x.id === e.target.value);
    setSelectedPessoa(e.target.value);
    if (p) {
      const form = e.target.closest('form') as HTMLFormElement;
      (form.elements.namedItem('nome')  as HTMLInputElement).value = p.nome;
      (form.elements.namedItem('email') as HTMLInputElement).value = p.email ?? '';
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const data = { ...Object.fromEntries(fd.entries()), avaliacaoId: avaliacao.id };
    startTransition(async () => {
      const res = await convidarRespondentesAction(data);
      if (res.ok) { setSuccess('Convidado adicionado!'); setError(null); (e.target as HTMLFormElement).reset(); setSelectedPessoa(''); }
      else         { setError(res.error ?? 'Erro'); setSuccess(null); }
    });
  }

  function handleCsvChange(raw: string) {
    setCsvText(raw);
    setBatchResult(null);
    setError(null);
    setPreview(raw.trim() ? parseCsv(raw) : []);
  }

  function handleBatchSubmit() {
    const validos = preview.filter((r) => r.valid);
    if (validos.length === 0) { setError('Nenhuma linha válida para importar.'); return; }
    startTransition(async () => {
      const res = await convidarEmLoteAction({ avaliacaoId: avaliacao.id, linhas: validos });
      if (res.ok) {
        setBatchResult(res.data);
        setCsvText('');
        setPreview([]);
        setError(null);
      } else {
        setError(res.error ?? 'Erro ao importar');
      }
    });
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid #0f2244' : '2px solid transparent',
    background: 'transparent', color: active ? '#0f2244' : '#94a3b8',
  });

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '660px' }}>
      <div style={{ marginBottom: '8px' }}>
        <button onClick={() => router.push(`/cultura/${avaliacao.id}`)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          ← {avaliacao.nome}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Convidar Respondentes</h1>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button style={tabStyle(tab === 'individual')} onClick={() => { setTab('individual'); setError(null); setSuccess(null); }}>Individual</button>
        <button style={tabStyle(tab === 'lote')}       onClick={() => { setTab('lote');       setError(null); setSuccess(null); }}>Importar CSV</button>
      </div>

      {error   && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#15803d', fontSize: '13px', marginBottom: '16px' }}>{success}</div>}

      {/* ── Individual tab ── */}
      {tab === 'individual' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Buscar na base de pessoas <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
            <select value={selectedPessoa} onChange={handlePessoaChange} style={{ ...inputStyle, background: '#fff' }}>
              <option value="">— selecione para preencher —</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>)}
            </select>
            {selectedPessoa && <input type="hidden" name="pessoaId" value={selectedPessoa} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Nome *</label><input name="nome" required style={inputStyle} /></div>
            <div><label style={labelStyle}>E-mail *</label><input name="email" type="email" required style={inputStyle} /></div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
            O convidado receberá um link único por e-mail para responder sem precisar fazer login.
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
      )}

      {/* ── Batch/CSV tab ── */}
      {tab === 'lote' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {batchResult && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px 16px', color: '#15803d', fontSize: '13px' }}>
              ✓ {batchResult.criados} convite{batchResult.criados !== 1 ? 's' : ''} criado{batchResult.criados !== 1 ? 's' : ''}
              {batchResult.duplicados > 0 ? ` · ${batchResult.duplicados} duplicado${batchResult.duplicados !== 1 ? 's' : ''} ignorado${batchResult.duplicados !== 1 ? 's' : ''}` : ''}
            </div>
          )}

          <div>
            <label style={labelStyle}>Cole ou digite os dados (Nome, E-mail — um por linha)</label>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              Formatos aceitos: vírgula, ponto-e-vírgula, tab ou pipe (|). Cabeçalho opcional.
            </div>
            <textarea
              rows={8}
              placeholder={'Nome, Email\nJoão Silva, joao@empresa.com\nMaria Costa, maria@empresa.com'}
              value={csvText}
              onChange={(e) => handleCsvChange(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
                Preview: {preview.filter((r) => r.valid).length} válidos / {preview.filter((r) => !r.valid).length} inválidos
              </p>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Nome</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>E-mail</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9', background: row.valid ? '#fff' : '#fef9f9' }}>
                        <td style={{ padding: '7px 12px', color: '#0f2244' }}>{row.nome || '—'}</td>
                        <td style={{ padding: '7px 12px', color: '#475569' }}>{row.email || '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                          {row.valid
                            ? <span style={{ color: '#15803d', fontWeight: 600 }}>✓</span>
                            : <span style={{ color: '#dc2626', fontSize: '11px' }}>{row.motivo}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              disabled={isPending || preview.filter((r) => r.valid).length === 0}
              onClick={handleBatchSubmit}
              style={{ padding: '10px 24px', background: preview.filter((r) => r.valid).length > 0 && !isPending ? '#0f2244' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: preview.filter((r) => r.valid).length > 0 && !isPending ? 'pointer' : 'default' }}
            >
              {isPending ? 'Importando…' : `Importar ${preview.filter((r) => r.valid).length} convite${preview.filter((r) => r.valid).length !== 1 ? 's' : ''}`}
            </button>
            <button type="button" onClick={() => router.push(`/cultura/${avaliacao.id}`)} style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              ← Ver Avaliação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
