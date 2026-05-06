import { z } from 'zod';
import { ImpactDimension, TrainingStatus } from '@prisma/client';

export const createTrainingMatrixSchema = z.object({
  projectId:   z.string().uuid(),
  impactId:    z.string().uuid().optional(),
  title:       z.string().min(3, 'Mínimo 3 caracteres').max(200),
  description: z.string().optional(),
  dimension:   z.nativeEnum(ImpactDimension).optional(),
  targetRole:  z.string().max(100).optional(),
  durationH:   z.coerce.number().int().min(1).max(1000).optional(),
  mandatory:   z.boolean().default(true),
  lmsModuleId: z.string().optional(),
});

export const assignTrainingPlanSchema = z
  .object({
    matrixId:      z.string().uuid(),
    projectId:     z.string().uuid(),
    userId:        z.string().uuid().optional(),
    stakeholderId: z.string().uuid().optional(),
    dueDate:       z.string().datetime().optional(),
  })
  .refine((d) => d.userId ?? d.stakeholderId, {
    message: 'userId ou stakeholderId é obrigatório',
  });

export const updateTrainingStatusSchema = z.object({
  planId: z.string().uuid(),
  status: z.nativeEnum(TrainingStatus),
  notes:  z.string().optional(),
});

export const generateMatrixFromImpactSchema = z.object({
  projectId: z.string().uuid(),
  impactId:  z.string().uuid(),
});
