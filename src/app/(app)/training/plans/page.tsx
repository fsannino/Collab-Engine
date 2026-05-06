import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:  'Rascunho',
  ATIVO:     'Ativo',
  CONCLUIDO: 'Concluído',
  ARQUIVADO: 'Arquivado',
};

const STATUS_COLOR: Record<string, string> = {
  RASCUNHO:  'bg-gray-100 text-gray-600',
  ATIVO:     'bg-blue-100 text-blue-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  ARQUIVADO: 'bg-yellow-100 text-yellow-700',
};

export default async function TrainingPlansPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const plans = await prisma.trainingPlan.findMany({
    where: { tenantId: session.tenantId },
    include: {
      project: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos de Treinamento</h1>
          <p className="text-sm text-gray-500 mt-0.5">{plans.length} plano{plans.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/training/plans/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Novo Plano
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nenhum plano de treinamento cadastrado.{' '}
          <Link href="/training/plans/new" className="text-blue-600 hover:underline">Criar primeiro</Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Projeto</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Itens</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/training/plans/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.project?.name ?? <span className="text-gray-400 italic">Sem projeto</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{p._count.items}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
