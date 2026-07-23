import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { AttendanceForm } from './_attendance-form';
import { SendInvitesButton } from './_send-invites-button';
import { InstrutoresForm } from './_instrutores-form';
import { EnrollPanel } from './_enroll-panel';

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
      },
      instrutores: {
        include: {
          pessoa: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!turma) notFound();
  if (turma.trainingItem.plan.tenantId !== session.tenantId) notFound();

  const isConcluida = turma.status === 'CONCLUIDA';

  // Fetch available pessoas for instructor selector
  const pessoas = await prisma.pessoa.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  // Pessoas designadas ao item que ainda não estão inscritas nesta turma
  const inscritosPtIds = turma.inscricoes.map((i) => i.pessoaTreinamentoId);
  const candidatos = isConcluida
    ? []
    : await prisma.pessoaTreinamento.findMany({
        where: {
          trainingItemId: turma.trainingItemId,
          deletedAt: null,
          id: { notIn: inscritosPtIds },
        },
        include: { pessoa: { select: { nome: true, email: true } } },
        orderBy: { pessoa: { nome: 'asc' } },
      });

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
          {turma.notaLimiteAprovacao && <span>Nota mín.: {turma.notaLimiteAprovacao}</span>}
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

      {/* Instrutores */}
      <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Instrutores
            <span className="ml-2 font-normal text-gray-400">({turma.instrutores.length})</span>
          </h2>
        </div>
        <InstrutoresForm
          turmaId={turma.id}
          instrutores={turma.instrutores}
          pessoas={pessoas}
        />
      </section>

      {/* Inscrições */}
      {!isConcluida && (
        <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Inscrever pessoas
              <span className="ml-2 font-normal text-gray-400">({candidatos.length} disponíveis)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pessoas designadas ao item de treinamento que ainda não estão nesta turma.
            </p>
          </div>
          <EnrollPanel
            turmaId={turma.id}
            candidatos={candidatos.map((c) => ({
              ptId:  c.id,
              nome:  c.pessoa.nome,
              email: c.pessoa.email,
            }))}
          />
        </section>
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
              notaExame: i.notaExame,
              observacao: i.observacao ?? '',
              pessoa: i.pessoaTreinamento.pessoa,
            }))}
            isConcluida={isConcluida}
            notaLimiteAprovacao={turma.notaLimiteAprovacao ?? null}
          />
        )}
      </section>

      <Link href={`/training/plans/${turma.trainingItem.plan.id}`} className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar ao Plano
      </Link>
    </div>
  );
}
