'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registrarResultadoManualAction } from '@/modules/cultura/cultura.actions';
import { DIMENSOES, TIPOS_CULTURA, OCAI_AFIRMACOES } from '@/modules/cultura/cultura.utils';

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
    // Transform { ATUAL: {[dim]: vals}, DESEJADO: {[dim]: vals} } → { [dim]: { atual, desejado } }
    const respostas: Record<string, { atual: Record<string, number>; desejado: Record<string, number> }> = {};
    for (const d of DIMENSOES) {
      respostas[d.id] = { atual: values.ATUAL[d.id]!, desejado: values.DESEJADO[d.id]! };
    }
    startTransition(async () => {
      const res = await registrarResultadoManualAction({ avaliacaoId: avaliacao.id, respostas });
      if (res.ok) {
        router.push(`/cultura/${avaliacao.id}`);
      } else {
        setError(res.error ?? 'Erro ao registrar');
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '60px', textAlign: 'center', border: '1px solid #d1d5db',
    borderRadius: '6px', padding: '4px 6px', fontSize: '14px', fontWeight: 700,
  };

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '960px' }}>
      <div style={{ marginBottom: '8px' }}>
        <button onClick={() => router.push(`/cultura/${avaliacao.id}`)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          ← {avaliacao.nome}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Entrada Manual de Resultado OCAI</h1>
      </div>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px', lineHeight: 1.6 }}>
        Para cada dimensão, leia as quatro afirmações e distribua <strong>100 pontos</strong> — uma vez para a <strong>cultura atual</strong> e outra para a <strong>cultura desejada</strong>. Dê mais pontos à afirmação que mais se identifica com a organização.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {DIMENSOES.map((dim) => {
          const atual    = values.ATUAL[dim.id]!;
          const desejado = values.DESEJADO[dim.id]!;
          const somaA = soma(atual);
          const somaD = soma(desejado);
          const okA = Math.abs(somaA - 100) <= 1;
          const okD = Math.abs(somaD - 100) <= 1;
          const afirmacoesDim = OCAI_AFIRMACOES[dim.id];

          return (
            <div key={dim.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f2244', margin: '0 0 2px' }}>{dim.label}</h3>
              <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: '0 0 16px' }}>{dim.stem}</p>

              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '8px', padding: '6px 0', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Afirmação</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f2244', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Atual</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#c9a227', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Desejado</span>
              </div>

              {/* Rows */}
              {TIPOS_CULTURA.map((tipo) => (
                <div key={tipo.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '8px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: tipo.cor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{tipo.label}</div>
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                      {afirmacoesDim?.[tipo.id]}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={atual[tipo.id]}
                      onChange={(e) => change('ATUAL', dim.id, tipo.id, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={desejado[tipo.id]}
                      onChange={(e) => change('DESEJADO', dim.id, tipo.id, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              ))}

              {/* Totals row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '8px', padding: '8px 0 0', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>Total:</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: okA ? '#15803d' : '#dc2626', textAlign: 'center' }}>{somaA}/100</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: okD ? '#15803d' : '#dc2626', textAlign: 'center' }}>{somaD}/100</span>
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
