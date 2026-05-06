import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { calculateZone, zoneLabel, zoneBgColor } from '@/shared/governance/scoring';

const DIMENSION_LABEL: Record<string, string> = {
  PROCESS:    'Processo',
  PEOPLE:     'Pessoas',
  TECHNOLOGY: 'Tecnologia',
  STRUCTURE:  'Estrutura',
  CULTURE:    'Cultura',
  POLICY:     'Políticas',
  METRICS:    'Métricas',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:       'Rascunho',
  OPEN:        'Aberto',
  IN_PROGRESS: 'Em Andamento',
  MITIGATED:   'Mitigado',
  CLOSED:      'Encerrado',
  ACCEPTED:    'Aceito',
};

type Props = { params: Promise<{ id: string }> };

export default async function ImpactsReportPage({ params }: Props) {
  const { id: projectId } = await params;

  const session = await getSession();
  if (!session) redirect('/login');

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const impacts = await prisma.changeImpact.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    include: {
      areas:      { where: { deletedAt: null }, include: { area: { select: { nome: true } } } },
      activities: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
  });

  // Summary stats
  const zoneCounts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
  const statusCounts: Record<string, number> = {};
  const dimensionCounts: Record<string, number> = {};
  for (const i of impacts) {
    zoneCounts[calculateZone(i.score)]++;
    statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
    dimensionCounts[i.dimension] = (dimensionCounts[i.dimension] ?? 0) + 1;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="text-xs text-gray-400 mb-1">
            <Link href={`/projects/${projectId}/impacts`} className="hover:underline">Impactos</Link>
            {' / '}Relatório
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Impactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{project.name}</p>
        </div>
        <a
          href={`/api/projects/${projectId}/impacts/export`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          ↓ Exportar CSV
        </a>
      </div>

      {/* Zone summary */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Zona de Risco</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['RED', 'ORANGE', 'YELLOW', 'GREEN'] as const).map((zone) => (
            <div
              key={zone}
              className="rounded-lg p-4 text-center border-l-4"
              style={{ backgroundColor: zoneBgColor(zone) + '22', borderLeftColor: zoneBgColor(zone) }}
            >
              <p className="text-2xl font-bold text-gray-900">{zoneCounts[zone]}</p>
              <p className="text-xs text-gray-600 mt-0.5">{zoneLabel(zone)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* By status */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Por Status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              <strong>{count}</strong> {STATUS_LABEL[status] ?? status}
            </span>
          ))}
          {Object.keys(statusCounts).length === 0 && (
            <p className="text-sm text-gray-400 italic">Nenhum impacto registrado.</p>
          )}
        </div>
      </section>

      {/* By dimension */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Por Dimensão</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(dimensionCounts).sort((a, b) => b[1] - a[1]).map(([dim, count]) => (
            <span key={dim} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              <strong>{count}</strong> {DIMENSION_LABEL[dim] ?? dim}
            </span>
          ))}
          {Object.keys(dimensionCounts).length === 0 && (
            <p className="text-sm text-gray-400 italic">Nenhum impacto registrado.</p>
          )}
        </div>
      </section>

      {/* Full table */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Lista Completa
          <span className="ml-2 font-normal text-gray-400">({impacts.length})</span>
        </h2>
        {impacts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            Nenhum impacto registrado neste projeto.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Título</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dimensão</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Zona</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Atividades</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Áreas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {impacts.map((impact) => {
                  const zone = calculateZone(impact.score);
                  return (
                    <tr key={impact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${projectId}/impacts/${impact.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                        >
                          {impact.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{DIMENSION_LABEL[impact.dimension] ?? impact.dimension}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{STATUS_LABEL[impact.status] ?? impact.status}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm"
                          style={{ backgroundColor: zoneBgColor(zone) }}
                          title={zoneLabel(zone)}
                        >
                          {impact.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{zoneLabel(zone)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{impact.activities.length}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{impact.areas.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link href={`/projects/${projectId}/impacts`} className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          ← Voltar para a lista
        </Link>
        <a
          href={`/api/projects/${projectId}/impacts/export`}
          className="inline-block px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ↓ Exportar CSV
        </a>
      </div>
    </div>
  );
}
