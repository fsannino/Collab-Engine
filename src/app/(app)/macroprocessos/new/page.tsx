'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { createMacroprocessoAction } from '@/modules/processos/processos.actions';

export default function NewMacroprocessoPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = await createMacroprocessoAction(data);
      if (res.ok) router.push(`/macroprocessos/${res.data.id}`);
      else setError(res.error);
    });
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Novo Macroprocesso</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>{error}</div>}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Nome *</label>
          <input name="nome" required style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Descrição</label>
          <textarea name="descricao" rows={3} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            ID no XPROC <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional — para integração futura)</span>
          </label>
          <input name="xprocMacroprocessoId" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button type="submit" disabled={isPending} style={{ padding: '10px 24px', background: '#0f2244', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Salvando…' : 'Criar Macroprocesso'}
          </button>
          <button type="button" onClick={() => router.back()} style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
