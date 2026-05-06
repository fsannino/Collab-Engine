import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ImpactStatusBadge } from '@/shared/components/ImpactStatusBadge';
import { AcompanhamentoTimeline } from '@/shared/components/AcompanhamentoTimeline';
import { ActivityStatusForm } from '@/shared/components/ActivityStatusForm';
import { AddAcompanhamentoForm } from '@/shared/components/AddAcompanhamentoForm';
import { HeatmapMatrix } from '@/shared/components/HeatmapMatrix';
import { calculateZone, zoneBgColor, zoneLabel } from '@/shared/governance/scoring';

const DIMENSION_LABEL: Record<string, string> = {
  PROCESS: 'Processo', PEOPLE: 'Pessoas', TECHNOLOGY: 'Tecnologia',
  STRUCTURE: 'Estrutura', CULTURE: 'Cultura', POLICY: 'PolÃ­ticas', METRICS: 'MÃ©tricas',
};

type Props = { params: Promise<{ id: string; iid: string }> };

export default async function ImpactDetailPage({ params }: Props) {
  const { id: projectId, iid } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const [impact, peers] = await Promise.all([
    prisma.changeImpact.findFirst({
      where: { id: iid, deletedAt: null, project: { tenantId: session.tenantId } },
      include: {
        activities:      { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        areas:           { where: { deletedAt: null }, include: { area: true } },
        acompanhamentos: { orderBy: { changedAt: 'desc' } },
      },
    }),
    prisma.changeImpact.findMany({
      where: { projectId, deletedAt: null, project: { tenantId: session.tenantId } },
      select: { id: true, title: true, severityScore: true, extentScore: true },
    }),
  ]);
  if (!impact) notFound();

  const zone = calculateZone(impact.score);

  // Aggregate peers for heatmap
  const cellMap = new Map<string, { severity: number; probability: number; count: number; items: { id: string; title: string }[] }>();
  for (const p of peers) {
    const key      = `${p.severityScore}-${p.extentScore}`;
    const existing = cellMap.get(key);
    if (existing) { existing.count++; existing.items.push({ id: p.id, title: p.title }); }
    else cellMap.set(key, { severity: p.severityScore, probability: p.extentScore, count: 1, items: [{ id: p.id, title: p.title }] });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-1">
          <Link href={`/projects/${projectId}/impacts`} className="hover:underline">Impactos</Link>
          {' / '}<span className="truncate">{impact.title}</span>
        </nav>
        <div className="flex flex-wrap items-start gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0 text-lg"
            style={{ backgroundColor: zoneBgColor(zone) }}
            title={zoneLabel(zone)}
          >
            {impact.score}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{impact.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">{DIMENSION_LABEL[impact.dimension]}</span>
              <ImpactStatusBadge status={impact.status} size="sm" />
              <span className="text-xs text-gray-400">Sev {impact.severityScore} Ã— Ext {impact.extentScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description + Mitigation */}
      {(impact.description || impact.mitigation) && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          {impact.description && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-1">DescriÃ§Ã£o</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{impact.description}</p>
            </div>
          )}
          {impact.mitigation && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Plano de MitigaÃ§Ã£o</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{impact.mitigation}</p>
            </div>
          )}
        </section>
      )}

      {/* Heatmap â€” shown when project has multiple impacts */}
      {peers.length > 1 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">PosiÃ§Ã£o no Projeto</h2>
          <HeatmapMatrix entityType="impact" data={Array.from(cellMap.values())} size="sm" />
        </section>
      )}

      {/* Activities */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Atividades de MitigaÃ§Ã£o
          <span className="ml-2 text-gray-400 font-normal">({impact.activities.length})</span>
        </h2>
        {impact.activities.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma atividade vinculada.</p>
        ) : (
          <ul className="space-y-2">
            {impact.activities.map((a: { id: string; title: string; description: string | null; status: string }) => (
              <li key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                </div>
                <ActivityStatusForm activityId={a.id} currentStatus={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Areas */}
      {impact.areas.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ãreas Afetadas</h2>
          <div className="flex flex-wrap gap-2">
            {impact.areas.map((ia) => (
              <span key={ia.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{ia.area.nome}</span>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Timeline</h2>
          {impact.status !== 'CLOSED' && (
            <AddAcompanhamentoForm impactId={impact.id} currentStatus={impact.status} />
          )}
        </div>
        <AcompanhamentoTimeline entries={impact.acompanhamentos} />
      </section>

      <Link href={`/projects/${projectId}/impacts`} className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        â† Voltar
      </Link>
    </div>
  );
}
