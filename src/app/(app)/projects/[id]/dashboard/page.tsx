import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/shared/auth/session';
import { prisma } from '@/shared/lib/prisma';
import { calculateZone, zoneBgColor, zoneLabel } from '@/shared/governance/scoring';
import { HeatmapMatrix, type HeatmapCellData } from '@/shared/components/HeatmapMatrix';
import { StakeholderMatrix, type StakeholderPoint } from '@/shared/components/StakeholderMatrix';
import { KpiCard } from '@/shared/components/KpiCard';

type Params = Promise<{ id: string }>;

const POSITION_LABEL: Record<string, string> = {
  CHAMPION:   'Campeão',
  SUPPORTER:  'Apoiador',
  NEUTRAL:    'Neutro',
  RESISTOR:   'Resistente',
  ANTAGONIST: 'Antagonista',
};

const POSITION_COLOR: Record<string, string> = {
  CHAMPION:   '#22c55e',
  SUPPORTER:  '#84cc16',
  NEUTRAL:    '#6b7280',
  RESISTOR:   '#f97316',
  ANTAGONIST: '#ef4444',
};

export default async function ProjectDashboardPage({ params }: { params: Params }) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  const [
    allImpacts,
    impactHeatmapRaw,
    allStakeholderLinks,
    recentAcompanhamentos,
  ] = await Promise.all([
    prisma.changeImpact.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null },
      select: { score: true, status: true },
    }),
    prisma.changeImpact.groupBy({
      by: ['severityScore', 'extentScore'],
      where: {
        projectId,
        tenantId: session.tenantId,
        deletedAt: null,
        status: { not: 'CLOSED' },
      },
      _count: { id: true },
    }),
    prisma.projectStakeholder.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        position: true,
        influence: true,
        interest: true,
        stakeholder: { select: { name: true } },
      },
    }),
    prisma.impactAcompanhamento.findMany({
      where: { impact: { projectId, tenantId: session.tenantId, deletedAt: null } },
      orderBy: { changedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        changedAt: true,
        previousStatus: true,
        newStatus: true,
        previousScore: true,
        newScore: true,
        note: true,
        impact: { select: { id: true, title: true } },
      },
    }),
  ]);

  // Zone KPIs
  const zoneCounts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
  let closedCount = 0;
  for (const imp of allImpacts) {
    if (imp.status === 'CLOSED') { closedCount++; continue; }
    zoneCounts[calculateZone(imp.score)]++;
  }
  const activeImpacts = allImpacts.length - closedCount;

  // Heatmap cells (severityScore=X, extentScore=Y)
  const heatmapCells: HeatmapCellData[] = impactHeatmapRaw.map((r: { severityScore: number; extentScore: number; _count: { id: number } }) => ({
    severity: r.severityScore,
    probability: r.extentScore,
    count: r._count.id,
  }));

  // Stakeholder KPIs + matrix points
  const positionCounts: Record<string, number> = {};
  const stakeholderPoints: StakeholderPoint[] = [];
  for (const s of allStakeholderLinks) {
    positionCounts[s.position] = (positionCounts[s.position] ?? 0) + 1;
    stakeholderPoints.push({ id: s.id, name: s.stakeholder.name, influence: s.influence, interest: s.interest });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{project.name} — Dashboard</h1>
        <nav className="flex gap-3 text-sm">
          <Link href={`/projects/${projectId}/impacts`} className="text-primary hover:underline">Impactos</Link>
          <span className="text-muted-foreground">·</span>
          <Link href={`/projects/${projectId}/stakeholders`} className="text-primary hover:underline">Partes Interessadas</Link>
          <span className="text-muted-foreground">·</span>
          <a href={`/api/relatorio/${projectId}`} download style={{ color: '#c9a227', fontWeight: 600 }}>⬇ Relatório PDF</a>
        </nav>
      </div>

      {/* Impact KPIs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Análise de Impacto</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Total Ativos"
            value={activeImpacts}
            href={`/projects/${projectId}/impacts`}
          />
          <KpiCard label={zoneLabel('GREEN')}  value={zoneCounts.GREEN}  borderColor={zoneBgColor('GREEN')}  href={`/projects/${projectId}/impacts`} />
          <KpiCard label={zoneLabel('YELLOW')} value={zoneCounts.YELLOW} borderColor={zoneBgColor('YELLOW')} href={`/projects/${projectId}/impacts`} />
          <KpiCard label={zoneLabel('ORANGE')} value={zoneCounts.ORANGE} borderColor={zoneBgColor('ORANGE')} href={`/projects/${projectId}/impacts`} />
          <KpiCard label={zoneLabel('RED')}    value={zoneCounts.RED}    borderColor={zoneBgColor('RED')}    href={`/projects/${projectId}/impacts`} />
          <KpiCard label="Encerrados" value={closedCount} borderColor="#6b7280" href={`/projects/${projectId}/impacts`} />
        </div>
      </section>

      {/* Stakeholder KPIs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Partes Interessadas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(POSITION_LABEL).map(([pos, label]) => (
            <KpiCard
              key={pos}
              label={label}
              value={positionCounts[pos] ?? 0}
              borderColor={POSITION_COLOR[pos]}
              href={`/projects/${projectId}/stakeholders?position=${pos}`}
            />
          ))}
        </div>
      </section>

      {/* Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Mapa de Calor — Impactos</h2>
            <Link href={`/projects/${projectId}/impacts/heatmap`} className="text-sm text-primary hover:underline">Ver completo</Link>
          </div>
          {heatmapCells.length > 0 ? (
            <HeatmapMatrix data={heatmapCells} entityType="impact" size="sm" />
          ) : (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground text-center">
              Nenhum impacto ativo registrado.
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Matriz de Partes Interessadas</h2>
            <Link href={`/projects/${projectId}/stakeholders/matrix`} className="text-sm text-primary hover:underline">Ver completo</Link>
          </div>
          {stakeholderPoints.length > 0 ? (
            <StakeholderMatrix stakeholders={stakeholderPoints} projectId={projectId} />
          ) : (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground text-center">
              Nenhuma parte interessada mapeada.
            </div>
          )}
        </section>
      </div>

      {/* Recent acompanhamentos */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Últimos Acompanhamentos</h2>
        {recentAcompanhamentos.length === 0 ? (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground text-center">
            Nenhum acompanhamento registrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {recentAcompanhamentos.map((a: { id: string; changedAt: Date; previousStatus: string | null; newStatus: string; previousScore: number | null; newScore: number; note: string | null; impact: { id: string; title: string } }) => (
              <div key={a.id} className="rounded-lg border p-3 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/projects/${projectId}/impacts/${a.impact.id}`}
                    className="font-medium text-sm hover:underline line-clamp-1"
                  >
                    {a.impact.title}
                  </Link>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(a.changedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {a.note && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.note}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {a.previousStatus && a.previousStatus !== a.newStatus && (
                    <span>{a.previousStatus} → {a.newStatus}</span>
                  )}
                  {a.previousScore !== null && a.previousScore !== a.newScore && (
                    <span>Score: {a.previousScore} → {a.newScore}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/projects/${projectId}/impacts/new`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            + Novo Impacto
          </Link>
          <Link
            href={`/projects/${projectId}/stakeholders/new`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            + Nova Parte Interessada
          </Link>
          <Link
            href={`/projects/${projectId}/impacts/heatmap`}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-accent transition-colors"
          >
            Mapa de Calor
          </Link>
          <Link
            href={`/projects/${projectId}/impacts/report`}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-accent transition-colors"
          >
            Relatório de Impacto
          </Link>
          <Link
            href={`/projects/${projectId}/stakeholders/import`}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-accent transition-colors"
          >
            Importar Partes Interessadas
          </Link>
        </div>
      </section>
    </div>
  );
}
