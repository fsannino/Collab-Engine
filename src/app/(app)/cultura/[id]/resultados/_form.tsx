'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registrarResultadoManualAction } from '@/modules/cultura/cultura.actions';
import { DIMENSOES, TIPOS_CULTURA } from '@/modules/cultura/cultura.utils';

type Avaliacao = { id: string; nome: string; status: string };

type DimValues = Record<string, number>;
type AllValues = { ATUAL: Record<string, DimValues>; DESEJADO: Record<string, DimValues> };

function initValues(): AllValues {
  const make = (): Record<string, DimValues> => {
    const r: Record<string, DimValues> = {};
    for (const d of DIMENSOES) {
      r[d.id] = {};
      for (const t of TIPOS_CULTURA) r[d.id]![t.id] = 25;
    }
    return r;
  };
  return { ATUAL: make(), DESEJADO: make() };
}

function soma(vals: DimValues): number {
  return Object.values(vals).reduce((a, b) => a + b, 0);
}

export default function ManualResultadoForm({ avaliacao }: { avaliacao: Avaliacao }) {
  const router = useRouter();
  const [values, setValues] = useState<AllValues>(initValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputStyle: React.CSSProperties = {
    width: '64px', textAlign: 'center', border: '1px solid #d1d5db',
    borderRadius: '6px', padding: '4px 6px', fontSize: '14px', fontWeight: 700,
  };

  function change(momento: 'ATUAL' | 'DESEJADO', dimId: string, tipoId: string, raw: string) {
    const v = Math.max(0, Math.min(100, parseInt(raw) || 0));
    setValues((prev) => ({
      ...prev,
      [momento]: { ...prev[momento], [dimId]: { ...prev[momento][dimId], [tipoId]: v } },
    }));
  }

  function allValid(): boolean {
    for (const d of DIMENSOES) {
      const a = values.ATUAL[d.id]!;
      const de = values.DESEJADO[d.id]!;
      if (Math.abs(soma(a) - 100) > 1 || Math.abs(soma(de) - 100) > 1) return false;
    }
    return true;
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await registrarResultadoManualAction({ avaliacaoId: avaliacao.id, respostas: values });
      if (res.ok) {
        router.push(`/cultura/${avaliacao.id}`);
      } else {
        setError(res.error ?? 'Erro ao registrar');
      }
    });
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '900px' }}>
      <div style={{ marginBottom: '8px' }}>
        <button onClick={() => router.push(`/cultura/${avaliacao.id}`)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          ← {avaliacao.nome}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Entrada Manual de Resultado OCAI</h1>
      </div>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
        Para cada dimensão, distribua 100 pontos entre os 4 tipos de cultura — uma vez para a cultura atual e outra para a cultura desejada.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {DIMENSOES.map((dim) => {
          const atual = values.ATUAL[dim.id]!;
          const desejado = values.DESEJADO[dim.id]!;
          const somaA = soma(atual);
          const somaD = soma(desejado);
          const okA = Math.abs(somaA - 100) <= 1;
          const okD = Math.abs(somaD - 100) <= 1;

          return (
            <div key={dim.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f2244', margin: '0 0 16px' }}>{dim.label}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {(['ATUAL', 'DESEJADO'] as const).map((momento) => {
                  const vals = momento === 'ATUAL' ? atual : desejado;
                  const s = momento === 'ATUAL' ? somaA : somaD;
                  const ok = momento === 'ATUAL' ? okA : okD;
                  return (
                    <div key={momento}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: momento === 'ATUAL' ? '#0f2244' : '#c9a227', marginBottom: '10px' }}>
                        {momento === 'ATUAL' ? 'Cultura Atual' : 'Cultura Desejada'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {TIPOS_CULTURA.map((tipo) => (
                          <div key={tipo.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tipo.cor, flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>{tipo.label}</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={vals[tipo.id]}
                              onChange={(e) => change(momento, dim.id, tipo.id, e.target.value)}
                              style={inputStyle}
                            />
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px', fontSize: '12px' }}>
                          <span style={{ color: '#94a3b8' }}>Total:</span>
                          <span style={{ fontWeight: 700, color: ok ? '#15803d' : '#dc2626' }}>{s}/100</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allValid() || isPending}
          style={{ padding: '10px 28px', background: allValid() && !isPending ? '#15803d' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: allValid() && !isPending ? 'pointer' : 'default' }}
        >
          {isPending ? 'Registrando…' : 'Registrar Resultado'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/cultura/${avaliacao.id}`)}
          style={{ padding: '10px 20px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
