import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { AttendanceForm } from './_attendance-form';
import { SendInvitesButton } from './_send-invites-button';

const MODALITY_LABEL: Record<string, string> = {
  PRESENCIAL:  'Presencial',
  ONLINE:      'Online',
  HIBRIDO:     'Híbrido',
  AUTOESTUDO:  'Autoestudo',
};

const STATUS_LABEL: Record<string, string> = {
  AGENDADA:     'Agendada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA:    'Concluída',
  CANCELADA:    'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  AGENDADA:     'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDA:    'bg-green-100 text-green-700',
  CANCELADA:    'bg-gray-100 text-gray-500',
};

function fmt(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

type Props = { params: Promise<{ id: string }> };

export default async function TurmaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const turma = await prisma.turma.findFirst({
    where: { id, deletedAt: null },
    include: {
      trainingItem: {
        select: {
          id: true,
          title: true,
          plan: { select: { id: true, name: true, tenantId: true } },
        },
      },
      inscricoes: {
        include: {
          pessoaTreinamento: {
            include: {
              pessoa: { select: { id: true, nome: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        // include conviteEnviadoEm for invite tracking
      },
    },
  });

  if (!turma) notFound();
  if (turma.trainingItem.plan.tenantId !== session.tenantId) notFound();

  const isConcluida = turma.status === 'CONCLUIDA';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-1 space-x-1">
          <Link href="/training/plans" className="hover:underline">Planos</Link>
          <span>/</span>
          <Link href={`/training/plans/${turma.trainingItem.plan.id}`} className="hover:underline">
            {turma.trainingItem.plan.name}
          </Link>
          <span>/</span>
          <span>{turma.nome}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{turma.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{turma.trainingItem.title}</p>
          </div>
          <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${STATUS_COLOR[turma.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[turma.status] ?? turma.status}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>{MODALITY_LABEL[turma.modality] ?? turma.modality}</span>
          <span>{fmt(turma.dataInicio)} – {fmt(turma.dataFim)}</span>
          {turma.local && <span>Local: {turma.local}</span>}
          {turma.capacidade && <span>Capacidade: {turma.capacidade}</span>}
          <span>{turma.inscricoes.length} inscritos</span>
        </div>
      </div>

      {/* Invites */}
      {!isConcluida && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Convites por e-mail</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {turma.inscricoes.filter((i) => !i.conviteEnviadoEm).length} de {turma.inscricoes.length} ainda não notificados
            </p>
          </div>
          <SendInvitesButton
            turmaId={turma.id}
            pendingCount={turma.inscricoes.filter((i) => !i.conviteEnviadoEm).length}
          />
        </div>
      )}

      {/* Attendance section */}
      <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Lista de Presença</h2>
          {isConcluida && (
            <p className="text-xs text-green-600 mt-0.5">Turma encerrada — presença registrada.</p>
          )}
        </div>

        {turma.inscricoes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400 italic">
            Nenhuma pessoa inscrita nesta turma.
          </div>
        ) : (
          <AttendanceForm
            turmaId={turma.id}
            inscricoes={turma.inscricoes.map((i) => ({
              id: i.id,
              presente: i.presente,
              notaAvaliacao: i.notaAvaliacao,
              observacao: i.observacao ?? '',
              pessoa: i.pessoaTreinamento.pessoa,
            }))}
            isConcluida={isConcluida}
          />
        )}
      </section>

      <Link href={`/training/plans/${turma.trainingItem.plan.id}`} className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar ao Plano
      </Link>
    </div>
  );
}
