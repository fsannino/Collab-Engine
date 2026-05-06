import { z } from 'zod';
import { StakeholderLevel, StakeholderPosition } from '@prisma/client';

const scoreField = z.coerce.number().int().min(1, 'Mínimo é 1').max(5, 'Máximo é 5');
const adkarField = z.coerce.number().int().min(0, 'Mínimo é 0').max(5, 'Máximo é 5');

export const createStakeholderSchema = z.object({
  projectId:         z.string().uuid('ID do projeto inválido'),
  name:              z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
  email:             z.string().email('E-mail inválido').optional().or(z.literal('')),
  organizationLevel: z.nativeEnum(StakeholderLevel, { error: 'Nível organizacional inválido' }).optional(),
  position:          z.nativeEnum(StakeholderPosition, { error: 'Posição inválida' }),
  influence:         scoreField,
  interest:          scoreField,
  notes:             z.string().optional(),
  pessoaId:          z.string().uuid('ID da pessoa inválido').optional(),
});

export type CreateStakeholderInput = z.infer<typeof createStakeholderSchema>;

export const updateStakeholderPositionSchema = z.object({
  projectStakeholderId: z.string().uuid('ID inválido'),
  position:             z.nativeEnum(StakeholderPosition).optional(),
  influence:            scoreField.optional(),
  interest:             scoreField.optional(),
  notes:                z.string().optional(),
});

export type UpdateStakeholderPositionInput = z.infer<typeof updateStakeholderPositionSchema>;

export const recordContactSchema = z.object({
  projectStakeholderId: z.string().uuid('ID inválido'),
  contactDate:          z.coerce.date(),
  notes:                z.string().optional(),
});

export type RecordContactInput = z.infer<typeof recordContactSchema>;

export const updateAdkarSchema = z.object({
  projectStakeholderId: z.string().uuid('ID inválido'),
  adkarA:               adkarField.optional(),
  adkarD:               adkarField.optional(),
  adkarK:               adkarField.optional(),
  adkarAb:              adkarField.optional(),
  adkarR:               adkarField.optional(),
});

export type UpdateAdkarInput = z.infer<typeof updateAdkarSchema>;

export const linkPersonSchema = z.object({
  stakeholderId: z.string().uuid('ID do stakeholder inválido'),
  pessoaId:      z.string().uuid('ID da pessoa inválido'),
});

export type LinkPersonInput = z.infer<typeof linkPersonSchema>;
