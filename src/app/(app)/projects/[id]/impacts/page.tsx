import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ImpactStatusBadge } from '@/shared/components/ImpactStatusBadge';
import { calculateZone, zoneBgColor } from '@/shared/governance/scoring';

const DIMENSION_LABEL: Record<string, string> = {
  PROCESS: 'Processo', PEOPLE: 'Pessoas', TECHNOLOGY: 'Tecnologia',
  STRUCTURE: 'Estrutura', CULTURE: 'Cultura', POLICY: 'Políticas', METRICS: 'Métricas',
};

type Props = {
  params:      Promise<{ id: string }>;
  searchParams: Promise<{ dimension?: string; status?: string }>;
};

export default async function ImpactsPage({ params, searchParams }: Props) {
  const { id: projectId }       = await params;
  const { dimension, status }   = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');

  const impacts = await prisma.changeImpact.findMany({
    where: {
      projectId,
      deletedAt: null,
      project: { tenantId: session.tenantId },
      ...(dimension ? { dimension: dimension as never } : {}),
      ...(status    ? { status:    status    as never } : {}),
    },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impactos Organizacionais</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${projectId}/impacts/heatmap`} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Heatmap</Link>
          <Link href={`/projects/${projectId}/impacts/report`}  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Relatório</Link>
          <Link href={`/projects/${projectId}/impacts/new`}     className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Novo</Link>
        </div>
      </div>

      {impacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-4">Nenhum impacto cadastrado.</p>
          <Link href={`/projects/${projectId}/impacts/new`} className="text-blue-600 hover:underline">
            Registrar o primeiro impacto
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {impacts.map((impact: (typeof impacts)[number]) => {
            const zone = calculateZone(impact.score);
            return (
              <Link key={impact.id} href={`/projects/${projectId}/impacts/${impact.id}`} className="block">
                <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: zoneBgColor(zone) }}
                    title={`Score ${impact.score}/25`}
                  >
                    {impact.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{impact.title}</p>
                    <p className="text-xs text-gray-500">{DIMENSION_LABEL[impact.dimension]}</p>
                  </div>
                  <ImpactStatusBadge status={impact.status} size="sm" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
