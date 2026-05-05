import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HeatmapMatrix } from '@/shared/components/HeatmapMatrix';

type Props = { params: Promise<{ id: string }> };

export default async function ImpactsHeatmapPage({ params }: Props) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const groups = await prisma.changeImpact.groupBy({
    by: ['severityScore', 'extentScore'],
    where: {
      projectId,
      deletedAt: null,
      project: { tenantId: session.tenantId },
      status: { not: 'CLOSED' },
    },
    _count: { id: true },
  });

  const data = groups.map((g) => ({
    severity:    g.severityScore,
    probability: g.extentScore,
    count:       g._count.id,
  }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Heatmap de Impactos</h1>
        <Link href={`/projects/${projectId}/impacts`} className="text-sm text-gray-500 hover:underline">← Lista</Link>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <HeatmapMatrix entityType="impact" data={data} size="lg" />
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Exclui impactos encerrados. Eixo X = Severidade, Eixo Y = Extensão (alcance).
      </p>
    </div>
  );
}
