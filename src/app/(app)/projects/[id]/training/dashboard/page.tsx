// Issue 026 — Dashboard de treinamento do projeto (Sprint 4)
//
// Visões: cobertura, heatmap Função × Status, presença por turma,
// próximas turmas (14 dias) e atrasados (+30 dias sem turma agendada).
// Gráficos server-rendered com Tailwind (sem dependência de charting).

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { KpiCard } from '@/shared/components/KpiCard';
import type { TrainingStatus } from '@prisma/client';

const DIAS_ATRASO = 30;
const DIAS_PROXIMAS = 14;

const STATUS_ORDER: TrainingStatus[] = [
  'PENDENTE',
  'INSCRITO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'AUSENTE',
  'DISPENSADO',
];

const STATUS_LABEL: Record<TrainingStatus, string> = {
  PENDENTE:     'Pendente',
  INSCRITO:     'Inscrito',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO:    'Concluído',
  AUSENTE:      'Ausente',
  DISPENSADO:   'Dispensado',
};

const STATUS_CELL_COLOR: Record<TrainingStatus, string> = {
  PENDENTE:     'bg-gray-100 text-gray-700',
  INSCRITO:     'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO:    'bg-green-100 text-green-700',
  AUSENTE:      'bg-red-100 text-red-700',
  DISPENSADO:   'bg-purple-100 text-purple-700',
};

function fmt(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

type Props = { params: Promise<{ id: string }> };

export default async function TrainingDashboardPage({ params }: Props) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const items = await prisma.trainingItem.findMany({
    where: { deletedAt: null, plan: { projectId, tenantId: session.tenantId, deletedAt: null } },
    select: {
      id: true,
      title: true,
      funcoes: { select: { funcaoId: true, funcao: { select: { nome: true } } } },
      pessoas: {
        where: { deletedAt: null },
        select: {
          id: true,
          pessoaId: true,
          status: true,
          createdAt: true,
          pessoa: { select: { nome: true } },
          inscricoes: { select: { id: true } },
        },
      },
      turmas: {
        where: { deletedAt: null },
        select: {
          id: true,
          nome: true,
          dataInicio: true,
          dataFim: true,
          status: true,
          inscricoes: { select: { presente: true } },
        },
      },
    },
  });

  const designados = items.flatMap((i) => i.pessoas);
  const totalDesignados = designados.length;
  const concluidos = designados.filter(
    (p) => p.status === 'CONCLUIDO' || p.status === 'DISPENSADO'
  ).length;
  const cobertura = totalDesignados > 0 ? Math.round((concluidos / totalDesignados) * 100) : 0;

  // ── Heatmap Função × Status ──
  // Funções ativas das pessoas designadas, restritas às funções-alvo do item.
  const pessoaIds = [...new Set(designados.map((p) => p.pessoaId))];
  const pessoaFuncoes = await prisma.pessoaFuncao.findMany({
    where: { pessoaId: { in: pessoaIds }, dataFim: null },
    select: { pessoaId: true, funcaoId: true },
  });
  const funcoesPorPessoa = new Map<string, Set<string>>();
  for (const pf of pessoaFuncoes) {
    const set = funcoesPorPessoa.get(pf.pessoaId) ?? new Set<string>();
    set.add(pf.funcaoId);
    funcoesPorPessoa.set(pf.pessoaId, set);
  }

  const heatmap = new Map<string, { nome: string; counts: Record<TrainingStatus, number> }>();
  for (const item of items) {
    const targetFuncoes = new Map(item.funcoes.map((f) => [f.funcaoId, f.funcao.nome]));
    for (const p of item.pessoas) {
      const funcoesAtivas = funcoesPorPessoa.get(p.pessoaId) ?? new Set<string>();
      for (const [funcaoId, nome] of targetFuncoes) {
        if (!funcoesAtivas.has(funcaoId)) continue;
        let row = heatmap.get(funcaoId);
        if (!row) {
          row = {
            nome,
            counts: { PENDENTE: 0, INSCRITO: 0, EM_ANDAMENTO: 0, CONCLUIDO: 0, AUSENTE: 0, DISPENSADO: 0 },
          };
          heatmap.set(funcaoId, row);
        }
        row.counts[p.status]++;
      }
    }
  }
  const heatmapRows = [...heatmap.values()].sort((a, b) => a.nome.localeCompare(b.nome));

  // ── Turmas: presença + próximas ──
  const turmas = items.flatMap((i) => i.turmas.map((t) => ({ ...t, itemTitle: i.title })));

  const agora = new Date();
  const limite = new Date(agora.getTime() + DIAS_PROXIMAS * 24 * 60 * 60 * 1000);
  const proximas = turmas
    .filter((t) => t.status === 'AGENDADA' && t.dataInicio >= agora && t.dataInicio <= limite)
    .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());

  // ── Atrasados: PENDENTE sem inscrição há mais de X dias ──
  const corte = new Date(agora.getTime() - DIAS_ATRASO * 24 * 60 * 60 * 1000);
  const atrasados = items.flatMap((i) =>
    i.pessoas
      .filter((p) => p.status === 'PENDENTE' && p.inscricoes.length === 0 && p.createdAt < corte)
      .map((p) => ({ pessoaNome: p.pessoa.nome, itemTitle: i.title, desde: p.createdAt }))
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-1 space-x-1">
          <Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link>
          <span>/</span>
          <Link href={`/projects/${project.id}/training`} className="hover:underline">Treinamento</Link>
          <span>/</span>
          <span>Dashboard</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Treinamento</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Cobertura" value={cobertura} sub={`% concluído/dispensado (${concluidos}/${totalDesignados})`} borderColor="#16a34a" />
        <KpiCard label="Pessoas designadas" value={totalDesignados} />
        <KpiCard label="Próximas turmas (14 dias)" value={proximas.length} borderColor="#2563eb" />
        <KpiCard label="Atrasados (+30 dias)" value={atrasados.length} borderColor={atrasados.length > 0 ? '#dc2626' : undefined} />
      </div>

      {/* Barra de cobertura */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Cobertura geral</h2>
        <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${cobertura}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {concluidos} de {totalDesignados} pessoas designadas concluíram (ou foram dispensadas).
        </p>
      </div>

      {/* Heatmap Função × Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Função × Status</h2>
        {heatmapRows.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Sem dados — nenhuma pessoa designada está em função-alvo de treinamento.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                {STATUS_ORDER.map((s) => (
                  <th key={s} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    {STATUS_LABEL[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {heatmapRows.map((row) => (
                <tr key={row.nome}>
                  <td className="px-3 py-2 font-medium text-gray-800">{row.nome}</td>
                  {STATUS_ORDER.map((s) => (
                    <td key={s} className="px-1.5 py-1.5 text-center">
                      <span
                        className={`inline-block min-w-9 rounded px-2 py-1 text-xs font-semibold tabular-nums ${
                          row.counts[s] > 0 ? STATUS_CELL_COLOR[s] : 'bg-gray-50 text-gray-300'
                        }`}
                      >
                        {row.counts[s]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Presença por turma */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Presença por turma</h2>
        {turmas.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma turma criada.</p>
        ) : (
          <div className="space-y-2">
            {turmas.map((t) => {
              const total = t.inscricoes.length;
              const presentes = t.inscricoes.filter((i) => i.presente === true).length;
              const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;
              return (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/training/turmas/${t.id}`}
                    className="w-56 shrink-0 truncate font-medium text-gray-800 hover:text-blue-600 hover:underline"
                    title={`${t.nome} — ${t.itemTitle}`}
                  >
                    {t.nome}
                  </Link>
                  <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${taxa}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-gray-500 tabular-nums">
                    {presentes}/{total} ({taxa}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximas turmas */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Próximas turmas ({DIAS_PROXIMAS} dias)
          </h2>
          {proximas.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nenhuma turma agendada no período.</p>
          ) : (
            <ul className="space-y-1.5">
              {proximas.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <Link href={`/training/turmas/${t.id}`} className="font-medium text-gray-800 hover:text-blue-600 hover:underline truncate">
                    {t.nome}
                  </Link>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{fmt(t.dataInicio)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Atrasados */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Atrasados (designados há +{DIAS_ATRASO} dias sem turma)
          </h2>
          {atrasados.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nenhuma pessoa atrasada. 👍</p>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {atrasados.map((a, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium text-gray-800 truncate">{a.pessoaNome}</span>
                  <span className="text-xs text-gray-500 shrink-0 truncate max-w-40" title={a.itemTitle}>
                    {a.itemTitle}
                  </span>
                  <span className="text-xs text-red-500 shrink-0">desde {fmt(a.desde)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        href={`/projects/${project.id}/training`}
        className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        ← Voltar
      </Link>
    </div>
  );
}
