'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

// ── helpers ──────────────────────────────────────────────────────────────────

function isPrismaP0001(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2010' // raw query error wraps PG P0001
  ) || (
    err instanceof Error &&
    err.message.includes('orphan_actions_pending')
  )
}

// Executa um UPDATE no Risk com SET LOCAL gm.skip_orphan_check = true
// para contornar o trigger após o usuário confirmar a resolução.
async function forceRiskStatusUpdate(
  riskId: string,
  data: { status?: string; deletedAt?: Date | null }
) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL "gm.skip_orphan_check" = 'true'`
    await tx.risk.update({ where: { id: riskId }, data: data as never })
  })
}

// ── Schema ───────────────────────────────────────────────────────────────────

const CreateRiskSchema = z.object({
  projectId:   z.string().uuid(),
  description: z.string().min(3).max(2000),
  impact:      z.coerce.number().int().min(1).max(5),
  probability: z.coerce.number().int().min(1).max(5),
  mitigation:  z.string().max(2000).optional(),
  ownerId:     z.string().uuid().optional(),
  dueAt:       z.coerce.date().optional(),
  sourceEntityType: z.enum([
    'HISTORY_ASSESSMENT', 'CULTURE_DIMENSION', 'GAP_ANALYSIS',
    'CHANGE_IMPACT', 'MULTIPLE_CHANGE', 'PROJECT_INITIATION', 'MANUAL',
  ]).default('MANUAL'),
  sourceEntityId: z.string().optional(),
})

const CloseRiskSchema = z.object({
  riskId: z.string().uuid(),
  // Resolução de ações órfãs (obrigatório quando há órfãs)
  orphanResolution: z.enum(['CANCEL_ALL', 'REASSIGN', 'STANDALONE']).optional(),
  reassignToRiskId: z.string().uuid().optional(), // quando REASSIGN
  standaloneJustification: z.string().max(500).optional(), // quando STANDALONE
})

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createRiskAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const raw = Object.fromEntries(formData)
  const parsed = CreateRiskSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const d = parsed.data

  // Verifica que o projeto pertence ao tenant
  const project = await prisma.project.findFirst({
    where: { id: d.projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!project) return { error: 'Projeto não encontrado' }

  const risk = await prisma.risk.create({
    data: {
      tenantId:    session.tenantId,
      projectId:   d.projectId,
      description: d.description,
      impact:      d.impact,
      probability: d.probability,
      mitigation:  d.mitigation,
      ownerId:     d.ownerId,
      dueAt:       d.dueAt,
      status:      'OPEN',
      createdBy:   session.userId,
      sources: {
        create: {
          sourceModule:     'GM',
          sourceEntityType: d.sourceEntityType,
          sourceEntityId:   d.sourceEntityId,
          identifiedBy:     session.userId,
        },
      },
    },
  })

  revalidateTag(`project-risks-${d.projectId}`, 'default')
  return { riskId: risk.id }
}

export async function addRiskSourceAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const schema = z.object({
    riskId:          z.string().uuid(),
    sourceModule:    z.enum(['GM', 'XPROC', 'PMO', 'EXTERNAL']),
    sourceEntityType: z.enum([
      'HISTORY_ASSESSMENT', 'CULTURE_DIMENSION', 'GAP_ANALYSIS',
      'CHANGE_IMPACT', 'MULTIPLE_CHANGE', 'PROJECT_INITIATION', 'MANUAL',
    ]),
    sourceEntityId: z.string().optional(),
    notes:          z.string().max(500).optional(),
  })

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }
  const d = parsed.data

  const risk = await prisma.risk.findFirst({
    where: { id: d.riskId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, projectId: true },
  })
  if (!risk) return { error: 'Risco não encontrado' }

  await prisma.riskSource.upsert({
    where: {
      riskId_sourceModule_sourceEntityType_sourceEntityId: {
        riskId:          d.riskId,
        sourceModule:    d.sourceModule,
        sourceEntityType: d.sourceEntityType,
        sourceEntityId:  d.sourceEntityId ?? '',
      },
    },
    create: {
      riskId:          d.riskId,
      sourceModule:    d.sourceModule,
      sourceEntityType: d.sourceEntityType,
      sourceEntityId:  d.sourceEntityId,
      notes:           d.notes,
      identifiedBy:    session.userId,
    },
    update: { notes: d.notes },
  })

  revalidateTag(`project-risks-${risk.projectId}`, 'default')
  return { ok: true }
}

/** Fecha um risco, tratando o fluxo de ações órfãs. */
export async function closeRiskAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const parsed = CloseRiskSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }
  const d = parsed.data

  const risk = await prisma.risk.findFirst({
    where: { id: d.riskId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, projectId: true, status: true },
  })
  if (!risk) return { error: 'Risco não encontrado' }
  if (risk.status === 'CLOSED') return { error: 'Risco já está fechado' }

  // Se não há resolução, tenta fechar diretamente (trigger avisa se houver órfãs)
  if (!d.orphanResolution) {
    try {
      await prisma.risk.update({
        where: { id: d.riskId },
        data: { status: 'CLOSED', closedAt: new Date(), updatedBy: session.userId },
      })
      revalidateTag(`project-risks-${risk.projectId}`, 'default')
      return { ok: true }
    } catch (err) {
      if (isPrismaP0001(err) || (err instanceof Error && err.message.includes('orphan_actions_pending'))) {
        // Busca as ações órfãs para o cliente exibir o modal
        const orphans = await prisma.changePlanItem.findMany({
          where: { sourceRiskId: d.riskId, status: { in: ['OPEN', 'IN_PROGRESS'] }, deletedAt: null },
          select: { id: true, description: true, status: true, pctComplete: true },
        })
        return { orphanActions: orphans }
      }
      throw err
    }
  }

  // Usuário já escolheu a resolução → aplica e fecha com skip_orphan_check
  await prisma.$transaction(async (tx) => {
    if (d.orphanResolution === 'CANCEL_ALL') {
      await tx.changePlanItem.updateMany({
        where: { sourceRiskId: d.riskId, status: { in: ['OPEN', 'IN_PROGRESS'] }, deletedAt: null },
        data: { status: 'CANCELLED', cancellationReason: 'Risco fechado pelo gestor', updatedBy: session.userId },
      })
    } else if (d.orphanResolution === 'REASSIGN' && d.reassignToRiskId) {
      await tx.changePlanItem.updateMany({
        where: { sourceRiskId: d.riskId, status: { in: ['OPEN', 'IN_PROGRESS'] }, deletedAt: null },
        data: { sourceRiskId: d.reassignToRiskId, updatedBy: session.userId },
      })
    } else if (d.orphanResolution === 'STANDALONE') {
      await tx.changePlanItem.updateMany({
        where: { sourceRiskId: d.riskId, status: { in: ['OPEN', 'IN_PROGRESS'] }, deletedAt: null },
        data: {
          sourceRiskId: null,
          cancellationReason: d.standaloneJustification ?? 'Mantido standalone após fechamento de risco',
          updatedBy: session.userId,
        },
      })
    }

    await tx.$executeRaw`SET LOCAL "gm.skip_orphan_check" = 'true'`
    await tx.risk.update({
      where: { id: d.riskId },
      data: { status: 'CLOSED', closedAt: new Date(), updatedBy: session.userId },
    })
  })

  revalidateTag(`project-risks-${risk.projectId}`, 'default')
  return { ok: true }
}

export async function deleteRiskAction(riskId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  const risk = await prisma.risk.findFirst({
    where: { id: riskId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, projectId: true },
  })
  if (!risk) return { error: 'Risco não encontrado' }

  try {
    await prisma.risk.update({
      where: { id: riskId },
      data: { deletedAt: new Date(), updatedBy: session.userId },
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('orphan_actions_pending')) {
      const orphans = await prisma.changePlanItem.findMany({
        where: { sourceRiskId: riskId, status: { in: ['OPEN', 'IN_PROGRESS'] }, deletedAt: null },
        select: { id: true, description: true, status: true, pctComplete: true },
      })
      return { orphanActions: orphans }
    }
    throw err
  }

  revalidateTag(`project-risks-${risk.projectId}`, 'default')
  return { ok: true }
}

/** Calcula severidade no servidor: impacto × probabilidade */
