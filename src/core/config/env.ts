import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_NAME: z.string().default('collab_session'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Collab Engine <noreply@example.com>'),
  ANTHROPIC_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Webhook HMAC secret — usado para validar eventos do SMR (Issue 007)
  WEBHOOK_SECRET: z.string().min(32).optional(),
})

export const env = envSchema.parse(process.env)
