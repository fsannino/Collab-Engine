import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export default async function PeoplePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const pessoas = await prisma.pessoa.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: {
      funcoesAtuais: {
        where: { dataFim: null },
        include: { funcao: { select: { nome: true } } },
      },
      cargosHistorico: {
        where: { dataFim: null },
        include: { cargo: { select: { nome: true } } },
      },
    },
    orderBy: { nome: 'asc' },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pessoas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pessoas.length} cadastrada{pessoas.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/people/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          + Nova Pessoa
        </Link>
      </div>

      {pessoas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nenhuma pessoa cadastrada ainda.{' '}
          <Link href="/people/new" className="text-blue-600 hover:underline">Cadastrar primeira pessoa</Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Cargo Atual</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Funções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pessoas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/people/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.cargosHistorico[0]?.cargo.nome ?? <span className="text-gray-400 italic">sem cargo</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.funcoesAtuais.length === 0 ? (
                        <span className="text-gray-400 italic text-xs">sem função</span>
                      ) : (
                        p.funcoesAtuais.slice(0, 3).map((f) => (
                          <span key={f.id} className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">{f.funcao.nome}</span>
                        ))
                      )}
                      {p.funcoesAtuais.length > 3 && (
                        <span className="text-xs text-gray-400">+{p.funcoesAtuais.length - 3}</span>
                      )}
                    </div>
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
