import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { StakeholderMatrix } from '@/shared/components/StakeholderMatrix';

type Props = { params: Promise<{ id: string }> };

export default async function StakeholderMatrixPage({ params }: Props) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const rows = await prisma.projectStakeholder.findMany({
    where: { projectId, deletedAt: null, project: { tenantId: session.tenantId } },
    select: { id: true, influence: true, interest: true, stakeholder: { select: { name: true } } },
  });

  const points = rows.map((ps) => ({ id: ps.id, name: ps.stakeholder.name, influence: ps.influence, interest: ps.interest }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Matriz de Stakeholders</h1>
        <Link href={`/projects/${projectId}/stakeholders`} className="text-sm text-gray-500 hover:underline">← Lista</Link>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <StakeholderMatrix projectId={projectId} stakeholders={points} size="md" />
      </div>
      <p className="mt-4 text-xs text-gray-400">Clique em uma célula para filtrar stakeholders por influência e interesse.</p>
    </div>
  );
}
