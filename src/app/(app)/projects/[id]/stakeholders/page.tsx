import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { StakeholderCard } from '@/shared/components/StakeholderCard';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ position?: string; influence?: string }>;
};

export default async function StakeholdersPage({ params, searchParams }: Props) {
  const { id: projectId }         = await params;
  const { position, influence }   = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');

  const projectStakeholders = await prisma.projectStakeholder.findMany({
    where: {
      projectId,
      deletedAt: null,
      project: { tenantId: session.tenantId },
      ...(position  ? { position:  position  as never } : {}),
      ...(influence ? { influence: Number(influence)   } : {}),
    },
    include: { stakeholder: true },
    orderBy: [{ influence: 'desc' }, { interest: 'desc' }],
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stakeholders</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${projectId}/stakeholders/matrix`}  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Matriz</Link>
          <Link href={`/projects/${projectId}/stakeholders/import`}  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Importar CSV</Link>
          <Link href={`/projects/${projectId}/stakeholders/new`}     className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Novo</Link>
        </div>
      </div>

      {projectStakeholders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-4">
            {position || influence ? 'Nenhum stakeholder encontrado com esses filtros.' : 'Nenhum stakeholder cadastrado.'}
          </p>
          {!position && !influence && (
            <Link href={`/projects/${projectId}/stakeholders/new`} className="text-blue-600 hover:underline">Adicionar o primeiro</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectStakeholders.map((ps) => (
            <StakeholderCard
              key={ps.id}
              id={ps.id}
              name={ps.stakeholder.name}
              email={ps.stakeholder.email}
              organizationLevel={ps.stakeholder.organizationLevel}
              position={ps.position}
              influence={ps.influence}
              interest={ps.interest}
              lastContactDate={ps.lastContactDate}
              href={`/projects/${projectId}/stakeholders/${ps.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
