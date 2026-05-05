// Tradução de escala XPROC (A/M/B) ↔ Collab Engine (1-5).
// XPROC usa letras; SMR e Collab Engine usam escala numérica 5×5 (ADR-001).
// Após Sprint 2 (migração de escala no XPROC), estas funções poderão ser removidas.

export type XprocScale = 'A' | 'M' | 'B'
export type CollabScale = 1 | 2 | 3 | 4 | 5

const XPROC_TO_COLLAB: Record<XprocScale, CollabScale> = { B: 2, M: 3, A: 4 }

export function xprocToCollabScale(letter: XprocScale): CollabScale {
  return XPROC_TO_COLLAB[letter]
}

export function collabToXprocScale(n: CollabScale): XprocScale {
  if (n <= 2) return 'B'
  if (n <= 3) return 'M'
  return 'A'
}
