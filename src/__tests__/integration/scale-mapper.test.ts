import { describe, it, expect } from 'vitest'
import { xprocToCollabScale, collabToXprocScale } from '@/integration/bridge/scale-mapper'

describe('xprocToCollabScale', () => {
  it('B → 2', () => expect(xprocToCollabScale('B')).toBe(2))
  it('M → 3', () => expect(xprocToCollabScale('M')).toBe(3))
  it('A → 4', () => expect(xprocToCollabScale('A')).toBe(4))
})

describe('collabToXprocScale', () => {
  it('1 → B', () => expect(collabToXprocScale(1)).toBe('B'))
  it('2 → B', () => expect(collabToXprocScale(2)).toBe('B'))
  it('3 → M', () => expect(collabToXprocScale(3)).toBe('M'))
  it('4 → A', () => expect(collabToXprocScale(4)).toBe('A'))
  it('5 → A', () => expect(collabToXprocScale(5)).toBe('A'))
})

describe('round-trip', () => {
  it('xproc → collab → xproc preserva letra', () => {
    for (const l of ['A', 'M', 'B'] as const) {
      expect(collabToXprocScale(xprocToCollabScale(l))).toBe(l)
    }
  })
})
