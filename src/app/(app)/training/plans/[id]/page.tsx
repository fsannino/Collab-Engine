import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Rascunho',
  APPROVED:  'Aprovado',
  ACTIVE:    'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const MODALITY_LABEL: Record<string, string> = {
  PRESENCIAL:  'Presencial',
  ONLINE:      'Online',
  HIBRIDO:     'Híbrido',
  AUTOESTUDO:  'Autoestudo',
};

const TURMA_STATUS_LABEL: Record<string, string> = {
  AGENDADA:     'Agendada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA:    'Concluída',
  CANCELADA:    'Cancelada',
};

const TURMA_STATUS_COLOR: Record<string, string> = {
  AGENDADA:     'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDA:    'bg-green-100 text-green-700',
  CANCELADA:    'bg-gray-100 text-gray-500',
};

function fmt(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

type Props = { params: Promise<{ id: string }> };

export default async function TrainingPlanDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const plan = await prisma.trainingPlan.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      items: {
        where: { deletedAt: null },
        include: {
          turmas: {
            where: { deletedAt: null },
            include: { _count: { select: { inscricoes: true } } },
            orderBy: { dataInicio: 'asc' },
          },
          _count: { select: { pessoas: true, funcoes: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!plan) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-1">
          <Link href="/training/plans" className="hover:underline">Planos de Treinamento</Link>
          {' / '}{plan.name}
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
            {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
          </div>
          <span className="text-xs rounded-full px-2.5 py-1 font-medium bg-blue-100 text-blue-700">
            {STATUS_LABEL[plan.status] ?? plan.status}
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          {plan.project && (
            <span>
              Projeto:{' '}
              <Link href={`/projects/${plan.project.id}`} className="text-blue-600 hover:underline">
                {plan.project.name}
              </Link>
            </span>
          )}
          {plan.startDate && <span>Início: {fmt(plan.startDate)}</span>}
          {plan.endDate && <span>Fim: {fmt(plan.endDate)}</span>}
        </div>
      </div>

      {/* Items */}
      {plan.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Nenhum item de treinamento neste plano.
        </div>
      ) : (
        <div className="space-y-4">
          {plan.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">{item.title}</h2>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    <span>{MODALITY_LABEL[item.modality] ?? item.modality}</span>
                    {item.duration && <span>{item.duration} min</span>}
                    <span>{item._count.pessoas} pessoa{item._count.pessoas !== 1 ? 's' : ''}</span>
                    <span>{item._count.funcoes} função/funções</span>
                  </div>
                </div>
              </div>

              {/* Turmas */}
              <div className="px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Turmas ({item.turmas.length})
                  </h3>
                </div>
                {item.turmas.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma turma agendada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {item.turmas.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm rounded bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/training/turmas/${t.id}`} className="font-medium text-gray-800 hover:text-blue-600 hover:underline">
                            {t.nome}
                          </Link>
                          <span className="text-xs text-gray-500">
                            {fmt(t.dataInicio)} – {fmt(t.dataFim)}
                          </span>
                          {t.local && <span className="text-xs text-gray-400">{t.local}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{t._count.inscricoes} inscritos</span>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TURMA_STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TURMA_STATUS_LABEL[t.status] ?? t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/training/plans" className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar
      </Link>
    </div>
  );
}
