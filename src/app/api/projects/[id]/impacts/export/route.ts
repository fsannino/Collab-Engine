import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { calculateZone, zoneLabel } from '@/shared/governance/scoring';

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

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map((c) => escapeCsv(c == null ? '' : String(c))).join(',');
}

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const impacts = await prisma.changeImpact.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    include: {
      areas:      { where: { deletedAt: null }, include: { area: { select: { nome: true } } } },
      activities: { where: { deletedAt: null }, select: { title: true } },
    },
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
  });

  const header = row([
    'Título',
    'Dimensão',
    'Status',
    'Zona',
    'Severidade (1-5)',
    'Abrangência (1-5)',
    'Score (1-25)',
    'Mitigação',
    'Áreas Afetadas',
    'Atividades Vinculadas',
    'Criado Em',
    'Atualizado Em',
  ]);

  const lines = impacts.map((i) => {
    const zone = calculateZone(i.score);
    const areas = i.areas.map((a) => a.area.nome).join('; ');
    const activities = i.activities.map((a) => a.title).join('; ');
    return row([
      i.title,
      DIMENSION_LABEL[i.dimension] ?? i.dimension,
      STATUS_LABEL[i.status] ?? i.status,
      zoneLabel(zone),
      i.severityScore,
      i.extentScore,
      i.score,
      i.mitigation,
      areas,
      activities,
      new Date(i.createdAt).toLocaleDateString('pt-BR'),
      new Date(i.updatedAt).toLocaleDateString('pt-BR'),
    ]);
  });

  const csv = [header, ...lines].join('\r\n');
  const filename = `impactos-${project.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
