import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/core/prisma/client';
import { generateMatrixFromImpactAction } from '@/modules/training/training.actions';

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED:   'Concluído',
  CANCELLED:   'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:     'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
};

const DIM_LABEL: Record<string, string> = {
  PROCESS: 'Processo', PEOPLE: 'Pessoas', TECHNOLOGY: 'Tecnologia',
  STRUCTURE: 'Estrutura', CULTURE: 'Cultura', POLICY: 'Políticas', METRICS: 'Métricas',
};

type Props = {
  params:      Promise<{ id: string }>;
  searchParams: Promise<{ impactId?: string }>;
};

export default async function TrainingPage({ params, searchParams }: Props) {
  const { id: projectId }   = await params;
  const { impactId }        = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');

  const [matrices, planStats, impacts] = await Promise.all([
    prisma.trainingMatrix.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { plans: { where: { deletedAt: null } } } },
        impact: { select: { title: true, dimension: true } },
      },
    }),
    prisma.trainingPlan.groupBy({
      by: ['status'],
      where: {
        projectId,
        deletedAt: null,
        matrix: { tenantId: session.tenantId },
      },
      _count: { id: true },
    }),
    prisma.changeImpact.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null, status: { not: 'CLOSED' } },
      select: { id: true, title: true, dimension: true },
      orderBy: { score: 'desc' },
    }),
  ]);

  const statMap = Object.fromEntries(planStats.map((s) => [s.status, s._count.id]));
  const totalPlans = Object.values(statMap).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Treinamento</h1>
        <Link
          href={`/projects/${projectId}/training/new`}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nova Trilha
        </Link>
      </div>

      {/* Plan stats */}
      {totalPlans > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
            <div key={s} className="rounded-lg border p-3">
              <p className="text-2xl font-bold tabular-nums">{statMap[s] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Auto-generate from impact */}
      {impacts.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Gerar trilhas automaticamente a partir de um impacto:</p>
          <form action={async (fd: FormData) => {
            'use server';
            const iId = fd.get('impactId') as string;
            if (iId) await generateMatrixFromImpactAction({ projectId, impactId: iId });
          }}>
            <div className="flex gap-2">
              <select name="impactId" defaultValue={impactId ?? ''} className="border rounded px-2 py-1.5 text-sm flex-1 bg-background">
                <option value="">Selecione um impacto…</option>
                {impacts.map((imp) => (
                  <option key={imp.id} value={imp.id}>{imp.title} ({DIM_LABEL[imp.dimension]})</option>
                ))}
              </select>
              <button type="submit" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-accent">
                Gerar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Matrix list */}
      {matrices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-2">Nenhuma trilha de treinamento cadastrada.</p>
          <Link href={`/projects/${projectId}/training/new`} className="text-primary hover:underline text-sm">
            Criar primeira trilha
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matrices.map((m) => (
            <div key={m.id} className="rounded-lg border p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.title}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {m.dimension && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{DIM_LABEL[m.dimension]}</span>
                  )}
                  {m.durationH && (
                    <span className="text-xs text-muted-foreground">{m.durationH}h</span>
                  )}
                  {m.mandatory && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Obrigatório</span>
                  )}
                  {m.impact && (
                    <span className="text-xs text-muted-foreground">↳ {m.impact.title}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">{m._count.plans}</p>
                <p className="text-xs text-muted-foreground">planos</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
