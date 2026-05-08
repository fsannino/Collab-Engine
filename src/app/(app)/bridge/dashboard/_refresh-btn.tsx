'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RefreshBtn() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch('/api/bridge/refresh', { method: 'POST' });
    } catch {
      // best-effort
    } finally {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        fontSize: '12px', fontWeight: 600, color: '#0f2244', background: '#fff',
        border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 14px',
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Atualizando…' : '↻ Atualizar agora'}
    </button>
  );
}
