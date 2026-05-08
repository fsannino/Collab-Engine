'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpsertSchema = z.object({
  id:                  z.string().uuid().optional(),
  projectId:           z.string().uuid(),
  criterion:           z.string().min(3).max(500),
  evidenceRequired:    z.string().max(500).optional(),
  evidenceDescription: z.string().max(2000).optional(),
  status:              z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'WAIVED']).default('PENDING'),
  order:               z.coerce.number().int().default(0),
})

export async function upsertExitChecklistAction(formData: FormData) {
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
    tenantId:            session.tenantId,
    projectId:           d.projectId,
    criterion:           d.criterion,
    evidenceRequired:    d.evidenceRequired ?? null,
    evidenceDescription: d.evidenceDescription ?? null,
    status:              d.status,
    order:               d.order,
    approvedBy:          d.status === 'APPROVED' ? session.userId : null,
    approvedAt:          d.status === 'APPROVED' ? new Date() : null,
  }

  if (d.id) {
    await prisma.exitChecklistItem.update({ where: { id: d.id }, data })
  } else {
    await prisma.exitChecklistItem.create({ data: { ...data, createdBy: session.userId } })
  }

  revalidateTag(`project-exit-checklist-${d.projectId}`, 'default')
  return { ok: true }
}

export async function deleteExitChecklistAction(id: string, projectId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await prisma.exitChecklistItem.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidateTag(`project-exit-checklist-${projectId}`, 'default')
  return { ok: true }
}
