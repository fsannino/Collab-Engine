import { getSession } from '@/core/auth/session';
import { redirect } from 'next/navigation';
import { getProjectReadiness } from '@/modules/readiness/readiness.queries';

function ProgressBar({ pct, size = 'md' }: { pct: number; size?: 'sm' | 'md' }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const h = size === 'sm' ? 'h-2' : 'h-4';
  return (
    <div className={`w-full ${h} bg-gray-200 rounded-full overflow-hidden`}>
      <div className={`${h} ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function ReadinessPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const data = await getProjectReadiness(id, session.tenantId);
  if (!data) redirect('/projects');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Readiness — {data.projectName}</h1>
        <p className="text-gray-500 mt-1">Índice de prontidão organizacional para a mudança</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Readiness Geral</p>
          <p className="text-3xl font-bold mt-1">{data.pctReadiness}%</p>
          <ProgressBar pct={data.pctReadiness} />
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Concluídos</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{data.concluidos}</p>
          <p className="text-xs text-gray-400">de {data.totalPessoas}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Em Andamento</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{data.emAndamento}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{data.pendentes}</p>
        </div>
      </div>

      {/* Por Área */}
      {data.byArea.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Readiness por Área</h2>
          <div className="space-y-3">
            {data.byArea.map((a) => (
              <div key={a.areaId} className="flex items-center gap-4">
                <span className="w-40 text-sm truncate">{a.areaNome}</span>
                <div className="flex-1"><ProgressBar pct={a.pct} size="sm" /></div>
                <span className="w-16 text-right text-sm font-medium">{a.pct}%</span>
                <span className="w-20 text-right text-xs text-gray-400">{a.concluidos}/{a.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por Função */}
      {data.byFuncao.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Readiness por Função</h2>
          <div className="space-y-3">
            {data.byFuncao.map((f) => (
              <div key={f.funcaoId} className="flex items-center gap-4">
                <span className="w-40 text-sm truncate">{f.funcaoNome}</span>
                <div className="flex-1"><ProgressBar pct={f.pct} size="sm" /></div>
                <span className="w-16 text-right text-sm font-medium">{f.pct}%</span>
                <span className="w-20 text-right text-xs text-gray-400">{f.concluidos}/{f.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalPessoas === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-400">
          Nenhum treinamento vinculado a este projeto ainda.
        </div>
      )}
    </div>
  );
}
