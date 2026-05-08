import { redirect } from 'next/navigation'
import { getSession } from '@/core/auth/session'
import { prisma } from '@/lib/prisma'
import { NewPlanForm } from './new-plan-form'

export const metadata = { title: 'Novo Plano de Treinamento — Collab:Evolve' }

export default async function NewTrainingPlanPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return <NewPlanForm projects={projects} />
}
