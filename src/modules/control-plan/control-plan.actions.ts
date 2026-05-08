'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpsertSchema = z.object({
  id:              z.string().uuid().optional(),
  projectId:       z.string().uuid(),
  controlName:     z.string().min(2).max(200),
  metricMonitored: z.string().min(2).max(200),
  frequency:       z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']).default('MONTHLY'),
  thresholdLow:    z.coerce.number().optional(),
  thresholdHigh:   z.coerce.number().optional(),
  dataSource:      z.enum(['MANUAL', 'INTEGRATION']).default('MANUAL'),
})

const MeasureSchema = z.object({
  id:              z.string().uuid(),
  projectId:       z.string().uuid(),
  lastMeasurement: z.coerce.number(),
})

export async function upsertControlPlanAction(formData: FormData) {
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
    tenantId:        session.tenantId,
    projectId:       d.projectId,
    controlName:     d.controlName,
    metricMonitored: d.metricMonitored,
    frequency:       d.frequency,
    thresholdLow:    d.thresholdLow ?? null,
    thresholdHigh:   d.thresholdHigh ?? null,
    dataSource:      d.dataSource,
  }

  if (d.id) {
    await prisma.controlPlanItem.update({ where: { id: d.id }, data })
  } else {
    await prisma.controlPlanItem.create({ data: { ...data, createdBy: session.userId } })
  }

  revalidateTag(`project-control-plan-${d.projectId}`, 'default')
  return { ok: true }
}

export async function recordMeasurementAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const parsed = MeasureSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }
  const d = parsed.data

  const item = await prisma.controlPlanItem.findFirst({
    where: { id: d.id, tenantId: session.tenantId, deletedAt: null },
  })
  if (!item) return { error: 'Controle não encontrado' }

  // Calcula RAG no servidor
  let statusRag: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
  if (item.thresholdLow !== null && d.lastMeasurement < item.thresholdLow) statusRag = 'RED'
  else if (item.thresholdHigh !== null && d.lastMeasurement > item.thresholdHigh) statusRag = 'RED'

  await prisma.controlPlanItem.update({
    where: { id: d.id },
    data: { lastMeasurement: d.lastMeasurement, lastMeasuredAt: new Date(), statusRag },
  })

  revalidateTag(`project-control-plan-${d.projectId}`, 'default')
  return { ok: true }
}

export async function deleteControlPlanAction(id: string, projectId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await prisma.controlPlanItem.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidateTag(`project-control-plan-${projectId}`, 'default')
  return { ok: true }
}
