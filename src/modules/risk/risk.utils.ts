/** Calcula severidade no servidor: impacto × probabilidade */
export function computeRiskSeverity(impact: number, probability: number) {
  return impact * probability
}

/** Zona de risco baseada no score (1–25) */
export function getRiskZone(score: number): 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' {
  if (score <= 4) return 'GREEN'
  if (score <= 9) return 'YELLOW'
  if (score <= 15) return 'ORANGE'
  return 'RED'
}
