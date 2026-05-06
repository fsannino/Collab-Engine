import { z } from 'zod';
import { ImpactDimension, ImpactStatus, ActivityStatus } from '@prisma/client';

const scoreField = z.coerce
  .number({ message: 'Deve ser um número' })
  .int('Deve ser um número inteiro')
  .min(1, 'Mínimo é 1')
  .max(5, 'Máximo é 5');

// ─── Create ─────────────────────────────────────────────────────────────────

export const createImpactSchema = z.object({
  projectId:     z.string().uuid('ID do projeto inválido'),
  title:         z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(200, 'Título deve ter no máximo 200 caracteres'),
  description:   z.string().optional(),
  dimension:     z.nativeEnum(ImpactDimension, { message: 'Dimensão inválida' }),
  severityScore: scoreField,
  extentScore:   scoreField,
  mitigation:    z.string().optional(),
  activities: z.array(z.object({
    title:       z.string().min(1, 'Título da atividade é obrigatório').max(200),
    description: z.string().optional(),
    dueDate:     z.coerce.date().optional(),
    assignedTo:  z.string().uuid('ID do responsável inválido').optional(),
  })).optional().default([]),
  areaIds: z.array(z.string().uuid('ID de área inválido')).optional().default([]),
});

export type CreateImpactInput = z.infer<typeof createImpactSchema>;

// ─── Update ─────────────────────────────────────────────────────────────────

export const updateImpactSchema = z.object({
  id:            z.string().uuid('ID do impacto inválido'),
  title:         z.string().min(3).max(200).optional(),
  description:   z.string().optional(),
  dimension:     z.nativeEnum(ImpactDimension).optional(),
  severityScore: scoreField.optional(),
  extentScore:   scoreField.optional(),
  mitigation:    z.string().optional(),
  status:        z.nativeEnum(ImpactStatus).optional(),
});

export type UpdateImpactInput = z.infer<typeof updateImpactSchema>;

// ─── Link Activity ──────────────────────────────────────────────────────────

export const linkActivitySchema = z.object({
  impactId:    z.string().uuid('ID do impacto inválido'),
  title:       z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  dueDate:     z.coerce.date().optional(),
  assignedTo:  z.string().uuid('ID do responsável inválido').optional(),
});

export type LinkActivityInput = z.infer<typeof linkActivitySchema>;

// ─── Update Activity Status ─────────────────────────────────────────────────

export const updateActivityStatusSchema = z.object({
  activityId: z.string().uuid('ID da atividade inválido'),
  status:     z.nativeEnum(ActivityStatus, { message: 'Status inválido' }),
});

export type UpdateActivityStatusInput = z.infer<typeof updateActivityStatusSchema>;

// ─── Link Area ───────────────────────────────────────────────────────────────

export const linkAreaSchema = z.object({
  impactId: z.string().uuid('ID do impacto inválido'),
  areaId:   z.string().uuid('ID de área inválido'),
  note:     z.string().optional(),
});

export type LinkAreaInput = z.infer<typeof linkAreaSchema>;

// ─── Acompanhamento ─────────────────────────────────────────────────────────

export const addAcompanhamentoSchema = z.object({
  impactId:      z.string().uuid('ID do impacto inválido'),
  newStatus:     z.nativeEnum(ImpactStatus, { message: 'Status inválido' }),
  severityScore: scoreField.optional(),
  extentScore:   scoreField.optional(),
  note:          z.string().min(1, 'Observação é obrigatória').max(1000, 'Observação muito longa'),
});

export type AddAcompanhamentoInput = z.infer<typeof addAcompanhamentoSchema>;

// ─── Close ───────────────────────────────────────────────────────────────────

export const closeImpactSchema = z.object({
  impactId: z.string().uuid('ID do impacto inválido'),
  note:     z.string().min(1, 'Justificativa de encerramento é obrigatória').max(1000),
});

export type CloseImpactInput = z.infer<typeof closeImpactSchema>;
