'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpsertSchema = z.object({
  id:          z.string().uuid().optional(),
  projectId:   z.string().uuid(),
  title:       z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  targetDate:  z.coerce.date().optional(),
  status:      z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE', 'DROPPED']).default('BACKLOG'),
  impact:      z.coerce.number().int().min(1).max(5).default(3),
  effort:      z.coerce.number().int().min(1).max(5).default(3),
})

export async function upsertQuickWinAction(formData: FormData) {
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
    tenantId:    session.tenantId,
    projectId:   d.projectId,
    title:       d.title,
    description: d.description ?? null,
    targetDate:  d.targetDate ?? null,
    status:      d.status,
    impact:      d.impact,
    effort:      d.effort,
    completedAt: d.status === 'DONE' ? new Date() : null,
  }

  if (d.id) {
    await prisma.quickWin.update({ where: { id: d.id }, data })
  } else {
    await prisma.quickWin.create({ data: { ...data, createdBy: session.userId } })
  }

  revalidateTag(`project-quickwins-${d.projectId}`, 'default')
  return { ok: true }
}

export async function deleteQuickWinAction(id: string, projectId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await prisma.quickWin.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidateTag(`project-quickwins-${projectId}`, 'default')
  return { ok: true }
}
