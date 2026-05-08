'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { updateMacroprocessoAction } from '@/modules/processos/processos.actions';

type Props = {
  mp: { id: string; nome: string; descricao: string | null; xprocMacroprocessoId: string | null };
};

export default function MacroprocessoEditForm({ mp }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = await updateMacroprocessoAction(mp.id, data);
      if (res.ok) {
        router.push(`/macroprocessos/${mp.id}`);
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

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '640px' }}>
      <div style={{ marginBottom: '8px' }}>
        <a href={`/macroprocessos/${mp.id}`} style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Voltar</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Editar Macroprocesso</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={labelStyle}>Nome *</label>
          <input name="nome" required defaultValue={mp.nome} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Descrição <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
          <textarea name="descricao" rows={3} defaultValue={mp.descricao ?? ''} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div>
          <label style={labelStyle}>ID XPROC <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
          <input name="xprocMacroprocessoId" defaultValue={mp.xprocMacroprocessoId ?? ''} style={inputStyle} />
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
