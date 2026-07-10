import { z } from 'zod';

/**
 * Schema para envio de usuários ao LMS externo (outbound).
 * Payload que o Collab:Evolve envia via POST ao LMS.
 */
export const lmsEnrollmentPayloadSchema = z.object({
  externalCourseId: z.string().min(1),
  enrollments: z.array(z.object({
    pessoaTreinamentoId: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    courseTitle: z.string(),
  })),
  callbackUrl: z.string().url(),
});

export type LmsEnrollmentPayload = z.infer<typeof lmsEnrollmentPayloadSchema>;

/**
 * Schema para webhook de retorno do LMS (inbound).
 * Payload que o LMS envia de volta ao Collab:Evolve.
 */
export const lmsCompletionWebhookSchema = z.object({
  pessoaTreinamentoId: z.string().uuid(),
  status: z.enum(['COMPLETED', 'FAILED', 'IN_PROGRESS']),
  score: z.number().min(0).max(100).optional(),
  completedAt: z.string().datetime().optional(),
});

export type LmsCompletionWebhook = z.infer<typeof lmsCompletionWebhookSchema>;
