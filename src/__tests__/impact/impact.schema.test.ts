import { describe, it, expect } from 'vitest';
import {
  createImpactSchema,
  updateImpactSchema,
  linkActivitySchema,
  updateActivityStatusSchema,
  linkAreaSchema,
  addAcompanhamentoSchema,
  closeImpactSchema,
} from '../../modules/impact/impact.schema';

const id = {
  project:    '550e8400-e29b-41d4-a716-446655440000',
  impact:     '550e8400-e29b-41d4-a716-446655440001',
  area:       '550e8400-e29b-41d4-a716-446655440002',
  activity:   '550e8400-e29b-41d4-a716-446655440003',
  user:       '550e8400-e29b-41d4-a716-446655440004',
};

// ─── createImpactSchema ──────────────────────────────────────────────────────

describe('createImpactSchema', () => {
  const valid = {
    projectId:     id.project,
    title:         'Impacto no processo de RH',
    dimension:     'PEOPLE',
    severityScore: 3,
    extentScore:   4,
  };

  it('accepts minimal valid input with defaults', () => {
    const r = createImpactSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.activities).toEqual([]);
      expect(r.data.areaIds).toEqual([]);
    }
  });

  it('accepts full input with optional fields', () => {
    const r = createImpactSchema.safeParse({
      ...valid,
      description: 'Descrição detalhada',
      mitigation:  'Plano de mitigação',
      areaIds:     [id.area],
      activities:  [{ title: 'Treinar equipe', assignedTo: id.user }],
    });
    expect(r.success).toBe(true);
  });

  it('coerces string scores to number', () => {
    const r = createImpactSchema.safeParse({ ...valid, severityScore: '3', extentScore: '4' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.severityScore).toBe(3);
  });

  it('rejects missing projectId', () => {
    expect(createImpactSchema.safeParse({ ...valid, projectId: undefined }).success).toBe(false);
  });

  it('rejects title shorter than 3 chars', () => {
    const r = createImpactSchema.safeParse({ ...valid, title: 'AB' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.title).toBeDefined();
  });

  it('rejects title longer than 200 chars', () => {
    const r = createImpactSchema.safeParse({ ...valid, title: 'A'.repeat(201) });
    expect(r.success).toBe(false);
  });

  it('rejects severityScore = 0', () => {
    expect(createImpactSchema.safeParse({ ...valid, severityScore: 0 }).success).toBe(false);
  });

  it('rejects severityScore = 6', () => {
    expect(createImpactSchema.safeParse({ ...valid, severityScore: 6 }).success).toBe(false);
  });

  it('rejects extentScore out of range', () => {
    expect(createImpactSchema.safeParse({ ...valid, extentScore: 0 }).success).toBe(false);
    expect(createImpactSchema.safeParse({ ...valid, extentScore: 6 }).success).toBe(false);
  });

  it('rejects invalid dimension enum', () => {
    expect(createImpactSchema.safeParse({ ...valid, dimension: 'INVALID' }).success).toBe(false);
  });

  it('rejects invalid uuid in areaIds', () => {
    expect(createImpactSchema.safeParse({ ...valid, areaIds: ['not-a-uuid'] }).success).toBe(false);
  });
});

// ─── updateImpactSchema ──────────────────────────────────────────────────────

describe('updateImpactSchema', () => {
  it('accepts id-only (no-op update)', () => {
    expect(updateImpactSchema.safeParse({ id: id.impact }).success).toBe(true);
  });

  it('accepts partial field update', () => {
    const r = updateImpactSchema.safeParse({ id: id.impact, title: 'Novo título válido', status: 'ACTIVE' });
    expect(r.success).toBe(true);
  });

  it('rejects missing id', () => {
    expect(updateImpactSchema.safeParse({ title: 'Título' }).success).toBe(false);
  });

  it('rejects invalid uuid id', () => {
    expect(updateImpactSchema.safeParse({ id: 'nao-e-uuid' }).success).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(updateImpactSchema.safeParse({ id: id.impact, status: 'INEXISTENTE' }).success).toBe(false);
  });
});

// ─── linkActivitySchema ──────────────────────────────────────────────────────

describe('linkActivitySchema', () => {
  it('accepts minimal valid input', () => {
    expect(linkActivitySchema.safeParse({ impactId: id.impact, title: 'Treinar equipe' }).success).toBe(true);
  });

  it('accepts with optional fields', () => {
    const r = linkActivitySchema.safeParse({
      impactId:    id.impact,
      title:       'Treinar equipe',
      description: 'Detalhes',
      assignedTo:  id.user,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(linkActivitySchema.safeParse({ impactId: id.impact, title: '' }).success).toBe(false);
  });

  it('rejects invalid assignedTo uuid', () => {
    expect(linkActivitySchema.safeParse({ impactId: id.impact, title: 'T', assignedTo: 'bad' }).success).toBe(false);
  });
});

// ─── updateActivityStatusSchema ─────────────────────────────────────────────

describe('updateActivityStatusSchema', () => {
  it.each(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'])('accepts status %s', (status) => {
    expect(updateActivityStatusSchema.safeParse({ activityId: id.activity, status }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateActivityStatusSchema.safeParse({ activityId: id.activity, status: 'UNKNOWN' }).success).toBe(false);
  });

  it('rejects invalid activityId', () => {
    expect(updateActivityStatusSchema.safeParse({ activityId: 'bad', status: 'DONE' }).success).toBe(false);
  });
});

// ─── linkAreaSchema ──────────────────────────────────────────────────────────

describe('linkAreaSchema', () => {
  it('accepts valid link', () => {
    expect(linkAreaSchema.safeParse({ impactId: id.impact, areaId: id.area }).success).toBe(true);
  });

  it('accepts with optional note', () => {
    expect(linkAreaSchema.safeParse({ impactId: id.impact, areaId: id.area, note: 'Área afetada diretamente' }).success).toBe(true);
  });

  it('rejects missing areaId', () => {
    expect(linkAreaSchema.safeParse({ impactId: id.impact }).success).toBe(false);
  });
});

// ─── addAcompanhamentoSchema ─────────────────────────────────────────────────

describe('addAcompanhamentoSchema', () => {
  const valid = {
    impactId:  id.impact,
    newStatus: 'MITIGATING',
    note:      'Iniciado plano de mitigação com equipe de RH',
  };

  it('accepts valid entry', () => {
    expect(addAcompanhamentoSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts with optional score overrides', () => {
    const r = addAcompanhamentoSchema.safeParse({ ...valid, severityScore: 4, extentScore: 3 });
    expect(r.success).toBe(true);
  });

  it('rejects empty note', () => {
    expect(addAcompanhamentoSchema.safeParse({ ...valid, note: '' }).success).toBe(false);
  });

  it('rejects note over 1000 chars', () => {
    expect(addAcompanhamentoSchema.safeParse({ ...valid, note: 'x'.repeat(1001) }).success).toBe(false);
  });

  it('rejects invalid newStatus', () => {
    expect(addAcompanhamentoSchema.safeParse({ ...valid, newStatus: 'ABERTO' }).success).toBe(false);
  });
});

// ─── closeImpactSchema ───────────────────────────────────────────────────────

describe('closeImpactSchema', () => {
  it('accepts valid close request', () => {
    expect(closeImpactSchema.safeParse({ impactId: id.impact, note: 'Resolvido após treinamento' }).success).toBe(true);
  });

  it('rejects empty note', () => {
    expect(closeImpactSchema.safeParse({ impactId: id.impact, note: '' }).success).toBe(false);
  });

  it('rejects missing impactId', () => {
    expect(closeImpactSchema.safeParse({ note: 'Justificativa' }).success).toBe(false);
  });
});
