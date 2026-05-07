import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const TURMA_STATUS_LABEL: Record<string, string> = {
  AGENDADA:     'Agendada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA:    'Concluída',
  CANCELADA:    'Cancelada',
};

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function daysAgo(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function daysUntil(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

type Props = { params: Promise<{ id: string }> };

export default async function TrainingDashboardPage({ params }: Props) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const plans = await prisma.trainingPlan.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    include: {
      items: {
        where: { deletedAt: null },
        include: {
          pessoas: { where: { deletedAt: null } },
          funcoes: {
            include: { funcao: { select: { nome: true } } },
          },
          turmas: {
            where: { deletedAt: null },
            include: {
              inscricoes: {
                select: {
                  presente: true,
                  conviteEnviadoEm: true,
                  pessoaTreinamento: { select: { status: true } },
                },
              },
            },
            orderBy: { dataInicio: 'asc' },
          },
        },
      },
    },
  });

  // ── Aggregates ──────────────────────────────────────────────────────────────
  const allPessoas   = plans.flatMap((p) => p.items.flatMap((i) => i.pessoas));
  const totalDesig   = allPessoas.length;
  const totalConc    = allPessoas.filter((p) => p.status === 'CONCLUIDO').length;
  const totalAusente = allPessoas.filter((p) => p.status === 'AUSENTE').length;
  const totalPend    = allPessoas.filter((p) => p.status === 'PENDENTE').length;

  // Upcoming turmas (next 14 days)
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 86_400_000);
  const upcoming = plans
    .flatMap((p) =>
      p.items.flatMap((i) =>
        i.turmas
          .filter((t) => t.status === 'AGENDADA' && t.dataInicio >= now && t.dataInicio <= in14)
          .map((t) => ({ ...t, itemTitle: i.title, planName: p.name }))
      )
    )
    .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());

  // Overdue: designated 30+ days without any turma or all turmas cancelled
  const overdue = plans.flatMap((p) =>
    p.items
      .filter((i) => {
        const hasFutureTurma = i.turmas.some(
          (t) => t.status === 'AGENDADA' || t.status === 'EM_ANDAMENTO'
        );
        return !hasFutureTurma;
      })
      .flatMap((i) =>
        i.pessoas
          .filter((pt) => pt.status === 'PENDENTE' && daysAgo(pt.createdAt) >= 30)
          .map((pt) => ({ ...pt, itemTitle: i.title, planName: p.name }))
      )
  );

  // Per-item stats for the table
  const itemRows = plans.flatMap((plan) =>
    plan.items.map((item) => {
      const total   = item.pessoas.length;
      const conc    = item.pessoas.filter((p) => p.status === 'CONCLUIDO').length;
      const inscritos = item.pessoas.filter((p) => p.status === 'INSCRITO').length;
      const pendentes = item.pessoas.filter((p) => p.status === 'PENDENTE').length;
      const funcoes = item.funcoes.map((f) => f.funcao.nome).join(', ');
      const turmasCount = item.turmas.filter((t) => t.status !== 'CANCELADA').length;
      return { item, plan, total, conc, inscritos, pendentes, funcoes, turmasCount };
    })
  );

  // Per-turma attendance stats
  const turmaRows = plans.flatMap((plan) =>
    plan.items.flatMap((item) =>
      item.turmas.map((turma) => {
        const total     = turma.inscricoes.length;
        const presentes = turma.inscricoes.filter((i) => i.presente === true).length;
        const ausentes  = turma.inscricoes.filter((i) => i.presente === false).length;
        const convites  = turma.inscricoes.filter((i) => i.conviteEnviadoEm).length;
        return { turma, item, plan, total, presentes, ausentes, convites };
      })
    )
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-xs text-gray-400 mb-1 space-x-1">
            <Link href={`/projects/${projectId}/training`} className="hover:underline">Treinamento</Link>
            <span>/</span>
            <span>Dashboard</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Treinamento</h1>
        </div>
        <Link
          href={`/projects/${projectId}/training`}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          ← Planos
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Designados',  value: totalDesig,   color: 'text-gray-900' },
          { label: 'Concluídos',  value: `${totalConc} (${pct(totalConc, totalDesig)}%)`,  color: 'text-green-700' },
          { label: 'Pendentes',   value: `${totalPend} (${pct(totalPend, totalDesig)}%)`,  color: 'text-gray-600' },
          { label: 'Ausentes',    value: `${totalAusente} (${pct(totalAusente, totalDesig)}%)`, color: 'text-red-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      {totalDesig > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Cobertura Geral</p>
            <span className="text-sm font-bold text-green-700">{pct(totalConc, totalDesig)}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${pct(totalConc, totalDesig)}%` }} />
            <div className="h-full bg-red-400 transition-all"   style={{ width: `${pct(totalAusente, totalDesig)}%` }} />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Concluído</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Ausente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Pendente/Inscrito</span>
          </div>
        </div>
      )}

      {/* Per-item table */}
      {itemRows.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Por Treinamento</h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Treinamento</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Funções</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Turmas</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Designados</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Concluídos</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Cobertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {itemRows.map(({ item, plan, total, conc, funcoes, turmasCount }) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 leading-snug">{item.title}</p>
                      <p className="text-xs text-gray-400">{plan.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{funcoes || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{turmasCount}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{total}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium">{conc}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${pct(conc, total)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{pct(conc, total)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Per-turma attendance */}
      {turmaRows.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Taxa de Presença por Turma</h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Turma</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Inscritos</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Presentes</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Convites</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Presença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {turmaRows.map(({ turma, item, total, presentes, ausentes, convites }) => (
                  <tr key={turma.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/training/turmas/${turma.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline leading-snug"
                      >
                        {turma.nome}
                      </Link>
                      <p className="text-xs text-gray-400">{item.title} · {fmtDate(turma.dataInicio)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        turma.status === 'CONCLUIDA'    ? 'bg-green-100 text-green-700'  :
                        turma.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 text-yellow-700' :
                        turma.status === 'CANCELADA'    ? 'bg-gray-100 text-gray-500'    :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {TURMA_STATUS_LABEL[turma.status] ?? turma.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{total}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium">{presentes}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{convites}/{total}</td>
                    <td className="px-4 py-3 text-center">
                      {turma.status === 'CONCLUIDA' ? (
                        <span className="text-sm font-bold text-green-700">{pct(presentes, total)}%</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Upcoming turmas */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Próximas Turmas (14 dias)</h2>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <Link
                key={t.id}
                href={`/training/turmas/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.nome}</p>
                  <p className="text-xs text-gray-400">{t.itemTitle} · {t.planName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-blue-700">{fmtDate(t.dataInicio)}</p>
                  <p className="text-xs text-gray-400">em {daysUntil(t.dataInicio)} dia(s)</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Atrasados
            <span className="ml-2 text-xs font-normal text-red-600">{overdue.length} pessoa(s) designadas há +30 dias sem turma agendada</span>
          </h2>
          <div className="rounded-lg border border-red-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-red-50 border-b border-red-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-red-600 uppercase">Treinamento</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-red-600 uppercase">Designados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50 bg-white">
                {Object.entries(
                  overdue.reduce<Record<string, { itemTitle: string; count: number }>>((acc, p) => {
                    const key = p.trainingItemId;
                    acc[key] = acc[key] ?? { itemTitle: p.itemTitle, count: 0 };
                    acc[key].count++;
                    return acc;
                  }, {})
                ).map(([key, { itemTitle, count }]) => (
                  <tr key={key}>
                    <td className="px-4 py-3 text-gray-800">{itemTitle}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {plans.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nenhum plano de treinamento criado para este projeto ainda.
        </div>
      )}
    </div>
  );
}
