import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export default async function CargosPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const cargos = await prisma.cargo.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: { _count: { select: { pessoas: { where: { dataFim: null } } } } },
    orderBy: { nome: 'asc' },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cargos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cargos.length} cargo{cargos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/cargos/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          + Novo Cargo
        </Link>
      </div>

      {cargos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nenhum cargo cadastrado.{' '}
          <Link href="/cargos/new" className="text-blue-600 hover:underline">Cadastrar primeiro</Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nível</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Pessoas Ativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {cargos.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.nome}</p>
                    {c.descricao && <p className="text-xs text-gray-500 mt-0.5">{c.descricao}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.nivel ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.pessoas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
