'use client';

import { useState, useTransition } from 'react';
import { registrarAvaliacaoLiderancaAction } from '@/modules/lideranca/lideranca.actions';

const DIMENSOES_ADKAR = ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'] as const;

type DimensaoADKAR = (typeof DIMENSOES_ADKAR)[number];

type Avaliacao = { dimensao: string; pontuacao: number; observacao: string | null };

function scoreColor(v: number): string {
  if (v >= 7) return '#15803d';
  if (v >= 4) return '#d97706';
  return '#dc2626';
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ height: '100%', width: `${value * 10}%`, background: scoreColor(value), borderRadius: '3px', transition: 'width 0.3s' }} />
    </div>
  );
}

export default function AvaliacaoLiderancaForm({
  liderancaId,
  avaliacoes,
}: {
  liderancaId: string;
  avaliacoes: Avaliacao[];
}) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const initial: Record<string, { pontuacao: string; observacao: string }> = {};
  for (const d of DIMENSOES_ADKAR) {
    const av = avaliacoes.find((a) => a.dimensao === d);
    initial[d] = { pontuacao: av ? String(av.pontuacao) : '', observacao: av?.observacao ?? '' };
  }
  const [values, setValues] = useState(initial);

  function set(dim: string, field: 'pontuacao' | 'observacao', val: string) {
    setValues((v) => ({ ...v, [dim]: { ...v[dim]!, [field]: val } }));
    setErrors((e) => ({ ...e, [dim]: '' }));
  }

  function handleSave(dim: DimensaoADKAR) {
    const v = values[dim]!;
    const num = parseFloat(v.pontuacao);
    if (isNaN(num) || num < 0 || num > 10) {
      setErrors((e) => ({ ...e, [dim]: 'Informe um valor entre 0 e 10' }));
      return;
    }
    startTransition(async () => {
      const res = await registrarAvaliacaoLiderancaAction({
        liderancaId,
        dimensao: dim,
        pontuacao: String(num),
        observacao: v.observacao,
      });
      if (res.ok) {
        setSaved((s) => ({ ...s, [dim]: true }));
        setTimeout(() => setSaved((s) => ({ ...s, [dim]: false })), 2000);
      } else {
        setErrors((e) => ({ ...e, [dim]: res.error ?? 'Erro ao salvar' }));
      }
    });
  }

  const input: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {DIMENSOES_ADKAR.map((dim) => {
        const v = values[dim]!;
        const existing = avaliacoes.find((a) => a.dimensao === dim);
        const num = parseFloat(v.pontuacao);
        const hasScore = !isNaN(num) && v.pontuacao !== '';

        return (
          <div key={dim} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: existing ? '#f0fdf4' : '#f8fafc', border: `1px solid ${existing ? '#86efac' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: existing ? '#15803d' : '#94a3b8', flexShrink: 0 }}>
                {dim.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f2244' }}>{dim}</div>
                {existing && (
                  <>
                    <div style={{ fontSize: '12px', color: scoreColor(existing.pontuacao) }}>Score atual: {existing.pontuacao.toFixed(1)}</div>
                    <ScoreBar value={existing.pontuacao} />
                  </>
                )}
              </div>
              {hasScore && (
                <div style={{ fontSize: '22px', fontWeight: 700, color: scoreColor(num) }}>{num.toFixed(1)}</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Pontuação (0–10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={v.pontuacao}
                  onChange={(e) => set(dim, 'pontuacao', e.target.value)}
                  style={input}
                  placeholder="0–10"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Observação <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
                <input
                  type="text"
                  value={v.observacao}
                  onChange={(e) => set(dim, 'observacao', e.target.value)}
                  style={input}
                  placeholder="Contexto, ações, notas..."
                />
              </div>
              <button
                onClick={() => handleSave(dim)}
                disabled={isPending || !v.pontuacao}
                style={{ padding: '8px 16px', background: saved[dim] ? '#15803d' : '#0f2244', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.7 : 1, whiteSpace: 'nowrap' }}
              >
                {saved[dim] ? '✓ Salvo' : 'Salvar'}
              </button>
            </div>
            {errors[dim] && <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626' }}>{errors[dim]}</div>}
          </div>
        );
      })}
    </div>
  );
}
