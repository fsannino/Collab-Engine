// Cultural severity adjustment (Issue 032)
// Multiplier 0.7–1.3x applied to base impact severity based on
// the dominant culture type × impact dimension pairing.

import type { TipoCulturaId } from '@/modules/cultura/cultura.utils';

export type ImpactDimension = 'PROCESS' | 'PEOPLE' | 'TECHNOLOGY' | 'STRUCTURE' | 'CULTURE';

// Multiplier matrix: culture → dimension → multiplier
// Logic: high multiplier = the dominant culture resists / amplifies this dimension.
// Low multiplier = the culture naturally absorbs this type of impact.
const MULTIPLIER_MATRIX: Record<TipoCulturaId, Partial<Record<ImpactDimension, number>>> = {
  HIERARCHY: {
    PROCESS:    1.3, // rigid process culture resists process changes
    TECHNOLOGY: 1.2, // slow to adopt new tech
    STRUCTURE:  1.2, // hierarchical structures resist restructuring
    PEOPLE:     1.0,
    CULTURE:    1.1,
  },
  CLAN: {
    PEOPLE:     1.3, // people-oriented culture amplifies people impacts
    CULTURE:    1.2, // high cultural sensitivity to cultural change
    PROCESS:    0.8, // flexible informal processes reduce friction
    TECHNOLOGY: 0.9,
    STRUCTURE:  0.9,
  },
  ADHOCRACY: {
    TECHNOLOGY: 0.7, // innovation culture embraces tech changes
    PROCESS:    0.8, // agile, adapts easily
    CULTURE:    0.8, // used to reinvention
    PEOPLE:     1.0,
    STRUCTURE:  1.0,
  },
  MARKET: {
    PROCESS:    1.0,
    TECHNOLOGY: 0.9, // results-driven, adopts tech if it improves outcomes
    PEOPLE:     1.2, // impacts on people affect competitive performance
    STRUCTURE:  1.1,
    CULTURE:    1.1,
  },
};

export type AdjustedSeverity = {
  base:       number; // original 1-5 severity
  multiplier: number;
  adjusted:   number; // rounded to 1 decimal, clamped to 1-5
  culture:    TipoCulturaId;
  dimension:  ImpactDimension;
};

/**
 * Adjusts an impact severity score based on the dominant culture type.
 * Returns null when cultural profile is not available.
 */
export function adjustImpactSeverityByCulture(
  baseSeverity:     number,
  dimension:        ImpactDimension,
  dominantCulture:  TipoCulturaId,
): AdjustedSeverity {
  const multiplier = MULTIPLIER_MATRIX[dominantCulture]?.[dimension] ?? 1.0;
  const raw        = baseSeverity * multiplier;
  const adjusted   = Math.min(5, Math.max(1, Math.round(raw * 10) / 10));

  return { base: baseSeverity, multiplier, adjusted, culture: dominantCulture, dimension };
}

/** Human-readable description of the multiplier effect. */
export function describeAdjustment(adj: AdjustedSeverity): string {
  const { multiplier, culture, dimension } = adj;
  const cultureLabels: Record<TipoCulturaId, string> = {
    CLAN: 'Clã', ADHOCRACY: 'Adhocracia', MARKET: 'Mercado', HIERARCHY: 'Hierarquia',
  };
  const dimLabels: Record<ImpactDimension, string> = {
    PROCESS: 'Processo', PEOPLE: 'Pessoas', TECHNOLOGY: 'Tecnologia',
    STRUCTURE: 'Estrutura', CULTURE: 'Cultura',
  };

  if (multiplier === 1.0) return 'Sem ajuste cultural';
  const direction = multiplier > 1.0 ? 'amplificada' : 'reduzida';
  const pct       = Math.round(Math.abs(multiplier - 1) * 100);
  return `Severidade ${direction} em ${pct}% — cultura ${cultureLabels[culture]} × impacto em ${dimLabels[dimension]}`;
}
