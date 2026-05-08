'use client';

import { useState, useTransition } from 'react';
import { responderOcaiAction, optarSairOcaiAction } from '@/modules/cultura/cultura.actions';
import { OCAI_AFIRMACOES } from '@/modules/cultura/cultura.utils';

type Dimensao    = { id: string; label: string; stem: string };
type TipoCultura = { id: string; label: string; cor: string };
type Avaliacao   = { id: string; nome: string; descricao: string | null; status: string };

type Props = {
  token: string;
  nomeRespondente: string;
  avaliacao: Avaliacao;
  dimensoes: readonly Dimensao[];
  tiposCultura: readonly TipoCultura[];
};

type Step   = 'consent' | 'questionnaire' | 'done' | 'optedout';
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
  const [step, setStep]     = useState<Step>('consent');
  const [checked, setChecked] = useState(false);
  const [values, setValues] = useState<AllValues>(() => initValues(dimensoes, tiposCultura));
  const [momento, setMomento] = useState<Momento>('ATUAL');
  const [dimIdx, setDimIdx] = useState(0);
  const [error, setError]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dim        = dimensoes[dimIdx]!;
  const vals       = values[momento][dim.id]!;
  const total      = soma(vals);
  const isLastDim  = dimIdx === dimensoes.length - 1;
  const isLastMomento = momento === 'DESEJADO';

  function change(tipoId: string, raw: string) {
    const v = Math.max(0, Math.min(100, parseInt(raw) || 0));
    setValues((prev) => ({
      ...prev,
      [momento]: { ...prev[momento], [dim.id]: { ...prev[momento][dim.id], [tipoId]: v } },
    }));
  }

  function canAdvance(): boolean { return Math.abs(total - 100) <= 1; }

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
    const respostas: Record<string, { atual: Record<string, number>; desejado: Record<string, number> }> = {};
    for (const d of dimensoes) {
      respostas[d.id] = { atual: values.ATUAL[d.id]!, desejado: values.DESEJADO[d.id]! };
    }
    startTransition(async () => {
      const res = await responderOcaiAction({ token, consent: true, respostas });
      if (res.ok) {
        setStep('done');
      } else {
        setError(res.error ?? 'Erro ao registrar resposta.');
      }
    });
  }

  function optOut() {
    startTransition(async () => {
      await optarSairOcaiAction(token);
      setStep('optedout');
    });
  }

  const totalSteps  = dimensoes.length * 2;
  const currentStep = momento === 'ATUAL' ? dimIdx + 1 : dimensoes.length + dimIdx + 1;
  const progress    = (currentStep / totalSteps) * 100;
  const isFirst     = dimIdx === 0 && momento === 'ATUAL';
  const isSubmit    = isLastDim && isLastMomento;

  // ─── Consent screen ───────────────────────────────────────────────────────
  if (step === 'consent') {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#0f2244', padding: '16px 24px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>OCAI — Cultura Organizacional</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{avaliacao.nome}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
          <div style={{ width: '100%', maxWidth: '600px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px 36px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: '0 0 8px' }}>
              Olá, {nomeRespondente}!
            </h1>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Você foi convidado(a) para a avaliação de cultura organizacional{' '}
              <strong>{avaliacao.nome}</strong>. O questionário leva cerca de{' '}
              <strong>5 minutos</strong>.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#0f2244', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Termo de Participação e Privacidade (LGPD)
              </h2>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', fontSize: '13px', lineHeight: 1.7 }}>
                <li>Suas respostas são <strong>anônimas</strong> — nunca serão divulgadas individualmente.</li>
                <li>Os resultados são apresentados apenas quando há <strong>pelo menos 3 respondentes</strong> em um grupo.</li>
                <li>Registramos um identificador de rede anonimizado (hash de IP) para prevenir duplicatas.</li>
                <li>Você pode recusar a participação a qualquer momento antes de enviar.</li>
                <li>Dados são tratados conforme a <strong>Lei nº 13.709/2018 (LGPD)</strong>.</li>
              </ul>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '24px' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                Li e compreendo os termos acima. Concordo em participar desta pesquisa de cultura organizacional.
              </span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                disabled={!checked || isPending}
                onClick={() => setStep('questionnaire')}
                style={{
                  padding: '12px 28px',
                  background: checked && !isPending ? '#0f2244' : '#d1d5db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: checked && !isPending ? 'pointer' : 'default',
                }}
              >
                Concordar e Iniciar →
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={optOut}
                style={{ padding: '10px', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isPending ? 'Aguarde…' : 'Não desejo participar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Opt-out confirmation ─────────────────────────────────────────────────
  if (step === 'optedout') {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: '0 0 12px' }}>Participação recusada</h1>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Sua escolha foi registrada. Obrigado pela atenção, {nomeRespondente}.
          </p>
        </div>
      </div>
    );
  }

  // ─── Done screen ──────────────────────────────────────────────────────────
  if (step === 'done') {
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

  // ─── Questionnaire ────────────────────────────────────────────────────────
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

      {/* Progress bar */}
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f2244', margin: '0 0 4px' }}>{dim.label}</h2>
            <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.4 }}>{dim.stem}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.5 }}>
              {momento === 'ATUAL'
                ? 'Distribua 100 pontos entre as quatro afirmações conforme cada uma descreve a realidade atual da sua organização.'
                : 'Distribua 100 pontos conforme cada afirmação descreve a organização que você gostaria de ter no futuro.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tiposCultura.map((tipo) => {
                const afirmacao = OCAI_AFIRMACOES[dim.id as keyof typeof OCAI_AFIRMACOES]?.[tipo.id as keyof typeof OCAI_AFIRMACOES[keyof typeof OCAI_AFIRMACOES]];
                return (
                  <div key={tipo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tipo.cor, flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: tipo.cor, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tipo.label}</div>
                      {afirmacao && <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{afirmacao}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
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
                        style={{ width: '64px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 6px', fontSize: '15px', fontWeight: 700, color: '#0f2244' }}
                      />
                      <button
                        type="button"
                        onClick={() => change(tipo.id, String(Math.min(100, (vals[tipo.id] ?? 0) + 5)))}
                        style={{ width: '28px', height: '28px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>pontos</span>
                    </div>
                  </div>
                );
              })}
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
