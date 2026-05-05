// Status de projeto mapeados conforme docs/INTEGRATION_GLOSSARY.md.
// ⚠ PENDENTE: validar contra schemas reais do SMR e XPROC (Issue 004).

export type SmrProjectStatus = 'Em Planejamento' | 'Em Andamento' | 'Concluído'
export type XprocProjectStatus =
  | 'Rascunho'
  | 'EmRevisao'
  | 'Aprovado'
  | 'Publicado'
  | 'Arquivado'
export type CollabProjectStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSING'
  | 'COMPLETED'
  | 'ARCHIVED'

export type System = 'smr' | 'xproc' | 'collab'

const smrToCollab: Record<SmrProjectStatus, CollabProjectStatus> = {
  'Em Planejamento': 'PLANNING',
  'Em Andamento': 'ACTIVE',
  Concluído: 'COMPLETED',
}

const xprocToCollab: Record<XprocProjectStatus, CollabProjectStatus> = {
  Rascunho: 'DRAFT',
  EmRevisao: 'IN_REVIEW',
  Aprovado: 'APPROVED',
  Publicado: 'ACTIVE',
  Arquivado: 'ARCHIVED',
}

const collabToSmr: Partial<Record<CollabProjectStatus, SmrProjectStatus>> = {
  PLANNING: 'Em Planejamento',
  ACTIVE: 'Em Andamento',
  COMPLETED: 'Concluído',
}

const collabToXproc: Partial<Record<CollabProjectStatus, XprocProjectStatus>> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'EmRevisao',
  APPROVED: 'Aprovado',
  ACTIVE: 'Publicado',
  ARCHIVED: 'Arquivado',
}

export const STATUS_MAP = { smrToCollab, xprocToCollab, collabToSmr, collabToXproc }

export function translateStatus(status: string, from: System, to: System): string {
  if (from === to) return status

  if (from === 'smr' && to === 'collab') return smrToCollab[status as SmrProjectStatus] ?? status
  if (from === 'xproc' && to === 'collab')
    return xprocToCollab[status as XprocProjectStatus] ?? status
  if (from === 'collab' && to === 'smr')
    return collabToSmr[status as CollabProjectStatus] ?? status
  if (from === 'collab' && to === 'xproc')
    return collabToXproc[status as CollabProjectStatus] ?? status

  // Tradução indireta via Collab como pivô
  const viaCollab = translateStatus(status, from, 'collab')
  return translateStatus(viaCollab, 'collab', to)
}
