import { z } from 'zod';

export const createTrainingPlanSchema = z.object({
  projectId:   z.string().uuid({ message: 'Projeto inválido. Acesse o plano a partir de um projeto.' }),
  name:        z.string().min(3).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  startDate:   z.coerce.date().optional(),
  endDate:     z.coerce.date().optional(),
});

export const createTrainingItemSchema = z.object({
  planId:      z.string().uuid(),
  title:       z.string().min(3).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  duration:    z.coerce.number().int().min(1).optional(),
  modality:    z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO', 'AUTOESTUDO']),
});

export const createTurmaSchema = z.object({
  trainingItemId: z.string().uuid(),
  nome:           z.string().min(2).max(200),
  dataInicio:     z.coerce.date(),
  dataFim:        z.coerce.date(),
  modality:       z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO', 'AUTOESTUDO']),
  local:          z.string().max(300).optional().or(z.literal('')),
  instrutorId:    z.string().uuid().optional().or(z.literal('')),
  capacidade:     z.coerce.number().int().min(1).optional(),
});
