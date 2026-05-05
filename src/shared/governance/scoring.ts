export type ScoreZone = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

/**
 * Calculates the governance score on the 5x5 scale (ADR-001).
 * For Risks/Problems: severity × probability (both 1-5), range 1-25.
 * For Impacts (already occurred): pass null for probability — score = severity × 1.
 */
export function calculateScore(severity: number, probability: number | null): number {
  return severity * (probability ?? 1);
}

/**
 * Maps a score to a governance zone.
 * GREEN 1-4 | YELLOW 5-9 | ORANGE 10-15 | RED 16-25
 */
export function calculateZone(score: number): ScoreZone {
  if (score <= 4) return 'GREEN';
  if (score <= 9) return 'YELLOW';
  if (score <= 15) return 'ORANGE';
  return 'RED';
}

/** Bright indicator color — for badges, text, borders. */
export function zoneColor(zone: ScoreZone): string {
  const colors: Record<ScoreZone, string> = {
    GREEN:  '#22c55e',
    YELLOW: '#eab308',
    ORANGE: '#f97316',
    RED:    '#ef4444',
  };
  return colors[zone];
}

/** Muted background color — for heatmap cells and row highlights. */
export function zoneBgColor(zone: ScoreZone): string {
  const colors: Record<ScoreZone, string> = {
    GREEN:  '#C0DD97',
    YELLOW: '#FAC775',
    ORANGE: '#EF9F27',
    RED:    '#A32D2D',
  };
  return colors[zone];
}

export function zoneLabel(zone: ScoreZone): string {
  const labels: Record<ScoreZone, string> = {
    GREEN:  'Baixo',
    YELLOW: 'Moderado',
    ORANGE: 'Alto',
    RED:    'Crítico',
  };
  return labels[zone];
}
