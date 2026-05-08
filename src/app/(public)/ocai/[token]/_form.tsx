'use client';

import { useState, useTransition } from 'react';
import { responderOcaiAction } from '@/modules/cultura/cultura.actions';

type Dimensao    = { id: string; label: string };
type TipoCultura = { id: string; label: string; cor: string };
type Avaliacao   = { id: string; nome: string; descricao: string | null; status: string };

type Props = {
  token: string;
  nomeRespondente: string;
  avaliacao: Avaliacao;
  dimensoes: readonly Dimensao[];
  tiposCultura: readonly TipoCultura[];
};

type Momento = 'ATUAL' | 'DESEJADO';

type DimValues = Record<string, number>;
type AllValues = { ATUAL: Record<string, DimValues>; DESEJADO: Record<string, DimValues> };

function initValues(dimensoes: readonly Dimensao[], tipos: readonly TipoCultura[]): AllValues {
  const make = (): Record<string, DimValues> => {
    const r: Record<string, DimValues> = {};
    for (const d of dimensoes) {
      r[d.id] = {};
      for (const t of tipos) r[d.id]![t.id] = 25;
    }
    return r;
  };
  return { ATUAL: make(), DESEJADO: make() };
}

function soma(vals: DimValues): number {
  return Object.values(vals).reduce((a, b) => a + b, 0);
}

export default function OcaiForm({ token, nomeRespondente, avaliacao, dimensoes, tiposCultura }: Props) {
  const [values, setValues] = useState<AllValues>(() => initValues(dimensoes, tiposCultura));
  const [momento, setMomento] = useState<Momento>('ATUAL');
  const [dimIdx, setDimIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dim = dimensoes[dimIdx]!;
  const vals = values[momento][dim.id]!;
  const total = soma(vals);
  const isLastDim = dimIdx === dimensoes.length - 1;
  const isLastMomento = momento === 'DESEJADO';

  function change(tipoId: string, raw: string) {
    const v = Math.max(0, Math.min(100, parseInt(raw) || 0));
    setValues((prev) => ({
      ...prev,
      [momento]: {
        ...prev[momento],
        [dim.id]: { ...prev[momento][dim.id], [tipoId]: v },
      },
    }));
  }

  function canAdvance(): boolean {
    return Math.abs(total - 100) <= 1;
  }

  function advance() {
    if (!canAdvance()) return;
    if (!isLastDim) {
      setDimIdx((i) => i + 1);
    } else if (!isLastMomento) {
      setMomento('DESEJADO');
      setDimIdx(0);
    } else {
      submit();
    }
  }

  function back() {
    if (dimIdx > 0) {
      setDimIdx((i) => i - 1);
    } else if (momento === 'DESEJADO') {
      setMomento('ATUAL');
      setDimIdx(dimensoes.length - 1);
    }
  }

  function submit() {
    // Transform AllValues { ATUAL: {[dim]: DimValues}, DESEJADO: {[dim]: DimValues} }
    // into { [dim]: { atual: OcaiValores, desejado: OcaiValores } }
    const respostas: Record<string, { atual: Record<string, number>; desejado: Record<string, number> }> = {};
    for (const d of dimensoes) {
      respostas[d.id] = { atual: values.ATUAL[d.id]!, desejado: values.DESEJADO[d.id]! };
    }
    startTransition(async () => {
      const res = await responderOcaiAction({ token, respostas });
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error ?? 'Erro ao registrar resposta.');
      }
    });
  }

  const totalSteps = dimensoes.length * 2;
  const currentStep = momento === 'ATUAL' ? dimIdx + 1 : dimensoes.length + dimIdx + 1;
  const progress = (currentStep / totalSteps) * 100;

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: '0 0 12px' }}>Obrigado, {nomeRespondente}!</h1>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Sua avaliação de cultura para <strong>{avaliacao.nome}</strong> foi registrada com sucesso.
          </p>
        </div>
      </div>
    );
  }

  const isFirst = dimIdx === 0 && momento === 'ATUAL';
  const isSubmit = isLastDim && isLastMomento;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: '#0f2244', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>OCAI — Cultura Organizacional</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{avaliacao.nome}</div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Olá, {nomeRespondente}</div>
      </div>

      {/* Progress */}
      <div style={{ background: '#e2e8f0', height: '4px' }}>
        <div style={{ background: '#c9a227', height: '4px', width: `${progress}%`, transition: 'width 0.3s ease' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: '700px' }}>

          {/* Momento badge */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', background: momento === 'ATUAL' ? '#0f2244' : '#e2e8f0', color: momento === 'ATUAL' ? '#fff' : '#94a3b8' }}>
              Cultura Atual
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', background: momento === 'DESEJADO' ? '#c9a227' : '#e2e8f0', color: momento === 'DESEJADO' ? '#fff' : '#94a3b8' }}>
              Cultura Desejada
            </span>
          </div>

          {/* Dimension card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Dimensão {dimIdx + 1} de {dimensoes.length}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f2244', margin: '0 0 8px' }}>{dim.label}</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              {momento === 'ATUAL'
                ? 'Distribua 100 pontos entre os quatro perfis conforme reflete a realidade atual da sua organização.'
                : 'Agora distribua 100 pontos conforme o perfil que você gostaria que sua organização tivesse no futuro.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tiposCultura.map((tipo) => (
                <div key={tipo.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tipo.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#0f2244' }}>{tipo.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => change(tipo.id, String(Math.max(0, (vals[tipo.id] ?? 0) - 5)))}
                      style={{ width: '28px', height: '28px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={vals[tipo.id]}
                      onChange={(e) => change(tipo.id, e.target.value)}
                      style={{ width: '56px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', fontSize: '15px', fontWeight: 700, color: '#0f2244' }}
                    />
                    <button
                      type="button"
                      onClick={() => change(tipo.id, String(Math.min(100, (vals[tipo.id] ?? 0) + 5)))}
                      style={{ width: '28px', height: '28px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total indicator */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Total:</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: Math.abs(total - 100) <= 1 ? '#15803d' : '#dc2626' }}>
                {total}
              </span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>/100</span>
            </div>
            {Math.abs(total - 100) > 1 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626', textAlign: 'right' }}>
                {total < 100 ? `Faltam ${100 - total} pontos para distribuir.` : `Reduza ${total - 100} pontos.`}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={back}
              disabled={isFirst}
              style={{ padding: '10px 20px', background: 'transparent', color: isFirst ? '#d1d5db' : '#374151', border: `1px solid ${isFirst ? '#e2e8f0' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', cursor: isFirst ? 'default' : 'pointer' }}
            >
              ← Anterior
            </button>

            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{currentStep}/{totalSteps}</span>

            <button
              type="button"
              onClick={advance}
              disabled={!canAdvance() || isPending}
              style={{ padding: '10px 24px', background: canAdvance() && !isPending ? (isSubmit ? '#15803d' : '#0f2244') : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: canAdvance() && !isPending ? 'pointer' : 'default' }}
            >
              {isPending ? 'Enviando…' : isSubmit ? 'Enviar Avaliação ✓' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
