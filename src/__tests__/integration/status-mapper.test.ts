import { describe, it, expect } from 'vitest'
import { translateStatus, STATUS_MAP } from '@/integration/bridge/status-mapper'

describe('translateStatus — SMR → Collab', () => {
  it('Em Planejamento → PLANNING', () =>
    expect(translateStatus('Em Planejamento', 'smr', 'collab')).toBe('PLANNING'))
  it('Em Andamento → ACTIVE', () =>
    expect(translateStatus('Em Andamento', 'smr', 'collab')).toBe('ACTIVE'))
  it('Concluído → COMPLETED', () =>
    expect(translateStatus('Concluído', 'smr', 'collab')).toBe('COMPLETED'))
  it('status desconhecido retorna o próprio valor', () =>
    expect(translateStatus('Desconhecido', 'smr', 'collab')).toBe('Desconhecido'))
})

describe('translateStatus — XPROC → Collab', () => {
  it('Rascunho → DRAFT', () =>
    expect(translateStatus('Rascunho', 'xproc', 'collab')).toBe('DRAFT'))
  it('EmRevisao → IN_REVIEW', () =>
    expect(translateStatus('EmRevisao', 'xproc', 'collab')).toBe('IN_REVIEW'))
  it('Aprovado → APPROVED', () =>
    expect(translateStatus('Aprovado', 'xproc', 'collab')).toBe('APPROVED'))
  it('Publicado → ACTIVE', () =>
    expect(translateStatus('Publicado', 'xproc', 'collab')).toBe('ACTIVE'))
  it('Arquivado → ARCHIVED', () =>
    expect(translateStatus('Arquivado', 'xproc', 'collab')).toBe('ARCHIVED'))
})

describe('translateStatus — Collab → SMR', () => {
  it('PLANNING → Em Planejamento', () =>
    expect(translateStatus('PLANNING', 'collab', 'smr')).toBe('Em Planejamento'))
  it('ACTIVE → Em Andamento', () =>
    expect(translateStatus('ACTIVE', 'collab', 'smr')).toBe('Em Andamento'))
  it('COMPLETED → Concluído', () =>
    expect(translateStatus('COMPLETED', 'collab', 'smr')).toBe('Concluído'))
  it('status sem mapeamento retorna o próprio valor', () =>
    expect(translateStatus('ON_HOLD', 'collab', 'smr')).toBe('ON_HOLD'))
})

describe('translateStatus — Collab → XPROC', () => {
  it('DRAFT → Rascunho', () =>
    expect(translateStatus('DRAFT', 'collab', 'xproc')).toBe('Rascunho'))
  it('ACTIVE → Publicado', () =>
    expect(translateStatus('ACTIVE', 'collab', 'xproc')).toBe('Publicado'))
  it('ARCHIVED → Arquivado', () =>
    expect(translateStatus('ARCHIVED', 'collab', 'xproc')).toBe('Arquivado'))
})

describe('translateStatus — mesmo sistema', () => {
  it('retorna o próprio valor sem transformação', () => {
    expect(translateStatus('ACTIVE', 'collab', 'collab')).toBe('ACTIVE')
    expect(translateStatus('Em Andamento', 'smr', 'smr')).toBe('Em Andamento')
  })
})

describe('translateStatus — tradução indireta SMR → XPROC', () => {
  it('Em Andamento → Publicado (via collab ACTIVE)', () =>
    expect(translateStatus('Em Andamento', 'smr', 'xproc')).toBe('Publicado'))
})

describe('STATUS_MAP shape', () => {
  it('smrToCollab tem 3 entradas', () =>
    expect(Object.keys(STATUS_MAP.smrToCollab)).toHaveLength(3))
  it('xprocToCollab tem 5 entradas', () =>
    expect(Object.keys(STATUS_MAP.xprocToCollab)).toHaveLength(5))
})
