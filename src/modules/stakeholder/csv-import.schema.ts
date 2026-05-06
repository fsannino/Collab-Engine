import { z } from 'zod';

// Plain string tuples (no @prisma/client) so this schema is safe in client components.
export const STAKEHOLDER_POSITIONS = ['CHAMPION', 'SUPPORTER', 'NEUTRAL', 'RESISTOR', 'ANTAGONIST'] as const;
export const STAKEHOLDER_LEVELS    = ['C_LEVEL', 'EXECUTIVE', 'MIDDLE_MANAGEMENT', 'OPERATIONAL', 'EXTERNAL'] as const;

const toUpper = (v: unknown) =>
  typeof v === 'string' && v !== '' ? v.toUpperCase().trim() : v;
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const csvRowSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.preprocess(
    emptyToUndefined,
    z.string().email('E-mail inválido').optional(),
  ),
  position: z.preprocess(
    toUpper,
    z.enum(STAKEHOLDER_POSITIONS, {
      message: 'Posição inválida. Use: CHAMPION, SUPPORTER, NEUTRAL, RESISTOR ou ANTAGONIST',
    }),
  ),
  influence: z.coerce
    .number({ message: 'Deve ser um número' })
    .int()
    .min(1, 'Mínimo 1')
    .max(5, 'Máximo 5'),
  interest: z.coerce
    .number({ message: 'Deve ser um número' })
    .int()
    .min(1, 'Mínimo 1')
    .max(5, 'Máximo 5'),
  organizationLevel: z.preprocess(
    (v) => emptyToUndefined(toUpper(v)),
    z.enum(STAKEHOLDER_LEVELS).optional(),
  ),
  notes: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
