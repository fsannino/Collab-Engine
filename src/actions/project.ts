'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'

const createProjectSchema = z.object({
  name:         z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(200),
  description:  z.string().max(1000).optional().or(z.literal('')),
  projectType:  z.enum(['ERP_IMPLEMENTATION','DIGITAL_TRANSFORMATION','INFRASTRUCTURE','MERGER_ACQUISITION','INNOVATION','SOCIAL_IMPACT','LEAN_SIX_SIGMA','CULTURAL_TRANSFORMATION']),
  deliveryModel: z.enum(['WATERFALL','AGILE','HYBRID']).default('HYBRID'),
  startDate:    z.coerce.date().optional(),
  targetEndDate: z.coerce.date().optional(),
})

type State = { ok: boolean; error?: string; issues?: Record<string, string[]> }

export async function createProjectAction(_prev: unknown, formData: FormData): Promise<State> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Não autenticado' }

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => v !== '')
  )
  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors }
  }

  const { name, description, projectType, deliveryModel, startDate, targetEndDate } = parsed.data

  await prisma.project.create({
    data: {
      tenantId: session.tenantId,
      name,
      description: description || null,
      projectType,
      deliveryModel,
      startDate: startDate ?? null,
      targetEndDate: targetEndDate ?? null,
    },
  })

  redirect('/projects')
}
