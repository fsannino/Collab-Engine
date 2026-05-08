'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { updatePessoaAction } from '@/modules/people/people.actions';

type Area = { id: string; nome: string };
type PessoaOption = { id: string; nome: string };

type Props = {
  pessoa: {
    id: string;
    nome: string;
    email: string | null;
    cpf: string | null;
    hrisId: string | null;
    areaId: string | null;
    superiorId: string | null;
    localidadeTrabalho: string | null;
  };
  areas: Area[];
  pessoas: PessoaOption[];
};

export default function PessoaEditForm({ pessoa, areas, pessoas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = await updatePessoaAction(pessoa.id, data);
      if (res.ok) {
        router.push(`/people/${pessoa.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
    padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
  };
  const hintStyle: React.CSSProperties = { fontWeight: 400, color: '#9ca3af' };

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '640px' }}>
      <div style={{ marginBottom: '8px' }}>
        <a href={`/people/${pessoa.id}`} style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Voltar</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Editar Pessoa</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nome *</label>
            <input name="nome" required defaultValue={pessoa.nome} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input name="email" type="email" defaultValue={pessoa.email ?? ''} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>CPF <span style={hintStyle}>(11 dígitos, sem pontuação)</span></label>
            <input name="cpf" maxLength={11} pattern="\d{11}" defaultValue={pessoa.cpf ?? ''} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Área</label>
            <select name="areaId" defaultValue={pessoa.areaId ?? ''} style={{ ...inputStyle, background: '#fff' }}>
              <option value="">— nenhuma —</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Superior direto</label>
            <select name="superiorId" defaultValue={pessoa.superiorId ?? ''} style={{ ...inputStyle, background: '#fff' }}>
              <option value="">— nenhum —</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Localidade de trabalho <span style={hintStyle}>(ex: São Paulo - SP, Remoto)</span></label>
          <input name="localidadeTrabalho" defaultValue={pessoa.localidadeTrabalho ?? ''} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>ID no HRIS <span style={hintStyle}>(opcional)</span></label>
          <input name="hrisId" defaultValue={pessoa.hrisId ?? ''} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button
            type="submit"
            disabled={isPending}
            style={{ padding: '10px 24px', background: '#0f2244', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? 'Salvando…' : 'Salvar Alterações'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
