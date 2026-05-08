import { createHash } from 'crypto';
import {
  calcularResultado,
  DIMENSOES,
  TIPOS_CULTURA,
  type OcaiValores,
  type ResultadoOcai,
  type TipoCulturaId,
} from '@/modules/cultura/cultura.utils';

// ─── Privacy ────────────────────────────────────────────────────────────────

export const MIN_GROUP_SIZE_DEFAULT = 3;

export function isAbaixoLimite(count: number, minGroupSize: number): boolean {
  return count < minGroupSize;
}

/** Returns null when response count is below the LGPD suppression threshold. */
export function calcularResultadoSafe(
  respostas: { respostas: unknown }[],
  minGroupSize: number = MIN_GROUP_SIZE_DEFAULT,
): ResultadoOcai | null {
  if (isAbaixoLimite(respostas.length, minGroupSize)) return null;
  return calcularResultado(respostas);
}

/** One-way SHA-256 hash of the client IP — stored for fraud detection, never reversed. */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// ─── Gap analysis ───────────────────────────────────────────────────────────

export type GapEntry = {
  tipo: TipoCulturaId;
  label: string;
  cor: string;
  atual: number;
  desejado: number;
  gap: number;
  direction: 'increase' | 'decrease' | 'stable';
};

/** Per-culture-type gap between desired and current scores. */
export function analisarGap(atual: OcaiValores, desejado: OcaiValores): GapEntry[] {
  return TIPOS_CULTURA.map((t) => {
    const a   = atual[t.id];
    const d   = desejado[t.id];
    const gap = d - a;
    return {
      tipo: t.id,
      label: t.label,
      cor: t.cor,
      atual: a,
      desejado: d,
      gap,
      direction: Math.abs(gap) < 1 ? 'stable' : gap > 0 ? 'increase' : 'decrease',
    };
  });
}

// ─── Dominant profile ───────────────────────────────────────────────────────

export type PerfilDominante = {
  tipo: TipoCulturaId;
  label: string;
  cor: string;
  score: number;
  intensidade: 'forte' | 'moderada' | 'fraca';
};

/** Returns the highest-scoring culture type with an intensity classification. */
export function perfilDominante(valores: OcaiValores): PerfilDominante {
  const sorted = TIPOS_CULTURA
    .map((t) => ({ tipo: t.id, label: t.label, cor: t.cor, score: valores[t.id] }))
    .sort((a, b) => b.score - a.score);
  const best = sorted[0]!;
  const intensidade = best.score >= 35 ? 'forte' : best.score >= 28 ? 'moderada' : 'fraca';
  return { ...best, intensidade };
}

// ─── Dimension aggregation ──────────────────────────────────────────────────

/** Flat average across all 6 dimensions for a given moment (atual/desejado). */
export function mediaGeralDim(
  resultado: ResultadoOcai,
  momento: 'atual' | 'desejado',
): OcaiValores {
  const acc: OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };
  for (const dim of DIMENSOES) {
    for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
      acc[tipo] += resultado.media[dim.id][momento][tipo] / DIMENSOES.length;
    }
  }
  return acc;
}
