'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpsertSchema = z.object({
  id:             z.string().uuid().optional(),
  projectId:      z.string().uuid(),
  stakeholderId:  z.string().uuid().optional(),
  description:    z.string().min(3).max(2000),
  rootCause:      z.string().max(1000).optional(),
  intensity:      z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status:         z.enum(['IDENTIFIED', 'BEING_ADDRESSED', 'RESOLVED', 'ACCEPTED']).default('IDENTIFIED'),
  mitigationPlan: z.string().max(2000).optional(),
})

export async function upsertResistanceAction(formData: FormData) {
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

  const data = {
    tenantId:       session.tenantId,
    projectId:      d.projectId,
    stakeholderId:  d.stakeholderId ?? null,
    description:    d.description,
    rootCause:      d.rootCause ?? null,
    intensity:      d.intensity,
    status:         d.status,
    mitigationPlan: d.mitigationPlan ?? null,
    updatedBy:      session.userId,
  }

  if (d.id) {
    await prisma.resistanceItem.update({ where: { id: d.id }, data })
  } else {
    await prisma.resistanceItem.create({ data: { ...data, createdBy: session.userId } })
  }

  revalidateTag(`project-resistance-${d.projectId}`, 'default')
  return { ok: true }
}

export async function deleteResistanceAction(id: string, projectId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await prisma.resistanceItem.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidateTag(`project-resistance-${projectId}`, 'default')
  return { ok: true }
}
