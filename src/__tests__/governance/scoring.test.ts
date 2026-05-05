import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  calculateZone,
  zoneColor,
  zoneLabel,
} from '../../shared/governance/scoring';

describe('calculateScore', () => {
  it('multiplies severity by probability', () => {
    expect(calculateScore(1, 1)).toBe(1);
    expect(calculateScore(3, 4)).toBe(12);
    expect(calculateScore(5, 5)).toBe(25);
  });

  it('treats null probability as 1 (impact mode — event already occurred)', () => {
    expect(calculateScore(1, null)).toBe(1);
    expect(calculateScore(3, null)).toBe(3);
    expect(calculateScore(5, null)).toBe(5);
  });
});

describe('calculateZone — boundary values', () => {
  it('GREEN: scores 1-4', () => {
    expect(calculateZone(1)).toBe('GREEN');
    expect(calculateZone(4)).toBe('GREEN');
  });

  it('YELLOW: scores 5-9', () => {
    expect(calculateZone(5)).toBe('YELLOW');
    expect(calculateZone(9)).toBe('YELLOW');
  });

  it('ORANGE: scores 10-15', () => {
    expect(calculateZone(10)).toBe('ORANGE');
    expect(calculateZone(15)).toBe('ORANGE');
  });

  it('RED: scores 16-25', () => {
    expect(calculateZone(16)).toBe('RED');
    expect(calculateZone(25)).toBe('RED');
  });
});

describe('calculateZone — derived from calculateScore', () => {
  it('severity 2 × probability 2 = 4 → GREEN', () => {
    expect(calculateZone(calculateScore(2, 2))).toBe('GREEN');
  });

  it('severity 3 × probability 2 = 6 → YELLOW', () => {
    expect(calculateZone(calculateScore(3, 2))).toBe('YELLOW');
  });

  it('severity 4 × probability 3 = 12 → ORANGE', () => {
    expect(calculateZone(calculateScore(4, 3))).toBe('ORANGE');
  });

  it('severity 4 × probability 4 = 16 → RED', () => {
    expect(calculateZone(calculateScore(4, 4))).toBe('RED');
  });
});

describe('zoneColor', () => {
  it('returns correct hex colors for each zone', () => {
    expect(zoneColor('GREEN')).toBe('#22c55e');
    expect(zoneColor('YELLOW')).toBe('#eab308');
    expect(zoneColor('ORANGE')).toBe('#f97316');
    expect(zoneColor('RED')).toBe('#ef4444');
  });
});

describe('zoneLabel', () => {
  it('returns Portuguese severity labels', () => {
    expect(zoneLabel('GREEN')).toBe('Baixo');
    expect(zoneLabel('YELLOW')).toBe('Moderado');
    expect(zoneLabel('ORANGE')).toBe('Alto');
    expect(zoneLabel('RED')).toBe('Crítico');
  });
});
