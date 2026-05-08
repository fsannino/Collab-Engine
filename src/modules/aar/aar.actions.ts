'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpsertSchema = z.object({
  projectId:       z.string().uuid(),
  whatWorked:      z.string().max(5000).optional(),
  whatDidntWork:   z.string().max(5000).optional(),
  lessons:         z.string().max(5000).optional(),
  recommendations: z.string().max(5000).optional(),
  conductedAt:     z.coerce.date().optional(),
  conductedBy:     z.string().max(200).optional(),
})

export async function upsertAarAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const parsed = UpsertSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }
  const d = parsed.data

  const project = await prisma.project.findFirst({
    where: { id: d.projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!project) return { error: 'Projeto não encontrado' }

  await prisma.afterActionReview.upsert({
    where:  { projectId: d.projectId },
    create: {
      tenantId:        session.tenantId,
      projectId:       d.projectId,
      whatWorked:      d.whatWorked ?? null,
      whatDidntWork:   d.whatDidntWork ?? null,
      lessons:         d.lessons ?? null,
      recommendations: d.recommendations ?? null,
      conductedAt:     d.conductedAt ?? null,
      conductedBy:     d.conductedBy ?? null,
      createdBy:       session.userId,
    },
    update: {
      whatWorked:      d.whatWorked ?? null,
      whatDidntWork:   d.whatDidntWork ?? null,
      lessons:         d.lessons ?? null,
      recommendations: d.recommendations ?? null,
      conductedAt:     d.conductedAt ?? null,
      conductedBy:     d.conductedBy ?? null,
    },
  })

  revalidateTag(`project-aar-${d.projectId}`, 'default')
  return { ok: true }
}
