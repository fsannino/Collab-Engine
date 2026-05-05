import { z } from 'zod';
import { ActivityStatus } from '@prisma/client';

export const smrWebhookPayloadSchema = z.object({
  eventId:       z.string().uuid('eventId deve ser UUID'),
  smrActivityId: z.string().min(1, 'smrActivityId obrigatório'),
  status:        z.nativeEnum(ActivityStatus),
  updatedAt:     z.string().datetime(),
});

export type SmrWebhookPayload = z.infer<typeof smrWebhookPayloadSchema>;

export const linkSmrActivitySchema = z.object({
  activityId:    z.string().uuid(),
  smrActivityId: z.string().min(1, 'ID da atividade SMR obrigatório'),
});
