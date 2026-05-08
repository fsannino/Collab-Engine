'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpsertSchema = z.object({
  id:               z.string().uuid().optional(),
  projectId:        z.string().uuid(),
  changePlanItemId: z.string().uuid().optional(),
  type:             z.enum(['COST', 'BENEFIT']),
  category:         z.enum([
    'CONSULTING', 'LICENSE', 'INTERNAL_HOURS', 'COMMUNICATION', 'INFRASTRUCTURE',
    'OPPORTUNITY_COST', 'PRODUCTIVITY_GAIN', 'TURNOVER_REDUCTION',
    'REVENUE_INCREASE', 'REWORK_REDUCTION', 'OTHER',
  ]),
  amount:         z.coerce.number().positive(),
  currency:       z.string().default('BRL'),
  occurredAt:     z.coerce.date(),
  description:    z.string().max(500).optional(),
  isBudgeted:     z.coerce.boolean().default(true),
  probabilityPct: z.coerce.number().int().min(0).max(100).optional(),
})

export async function upsertFinancialAction(formData: FormData) {
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
    tenantId:         session.tenantId,
    projectId:        d.projectId,
    changePlanItemId: d.changePlanItemId ?? null,
    type:             d.type,
    category:         d.category,
    amount:           d.amount,
    currency:         d.currency,
    occurredAt:       d.occurredAt,
    description:      d.description ?? null,
    isBudgeted:       d.isBudgeted,
    probabilityPct:   d.probabilityPct ?? null,
  }

  if (d.id) {
    await prisma.financialAction.update({ where: { id: d.id }, data })
  } else {
    await prisma.financialAction.create({ data: { ...data, createdBy: session.userId } })
  }

  revalidateTag(`project-roi-${d.projectId}`, 'default')
  return { ok: true }
}

export async function deleteFinancialAction(id: string, projectId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await prisma.financialAction.updateMany({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidateTag(`project-roi-${projectId}`, 'default')
  return { ok: true }
}

/** Calcula ROI do projeto — sempre no servidor */
export async function computeProjectRoi(projectId: string, tenantId: string) {
  const actions = await prisma.financialAction.findMany({
    where: { projectId, tenantId, deletedAt: null },
    select: { type: true, amount: true, isBudgeted: true, probabilityPct: true },
  })

  let totalCost = 0
  let totalBenefit = 0
  let realizedCost = 0
  let realizedBenefit = 0

  for (const a of actions) {
    const adjustedAmount = a.probabilityPct !== null ? a.amount * (a.probabilityPct / 100) : a.amount
    if (a.type === 'COST') {
      totalCost += adjustedAmount
      if (!a.isBudgeted) realizedCost += adjustedAmount
    } else {
      totalBenefit += adjustedAmount
      if (!a.isBudgeted) realizedBenefit += adjustedAmount
    }
  }

  const netValue  = totalBenefit - totalCost
  const roiPct    = totalCost > 0 ? ((netValue / totalCost) * 100) : null
  const realizedNet = realizedBenefit - realizedCost
  const realizedRoiPct = realizedCost > 0 ? ((realizedNet / realizedCost) * 100) : null

  return {
    totalCost,
    totalBenefit,
    netValue,
    roiPct,
    realizedCost,
    realizedBenefit,
    realizedNet,
    realizedRoiPct,
    entriesCount: actions.length,
  }
}
