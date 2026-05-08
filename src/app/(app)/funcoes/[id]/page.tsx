import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const PAPEL_LABEL: Record<string, string> = {
  RESPONSAVEL: 'Responsável',
  APROVADOR:   'Aprovador',
  CONSULTADO:  'Consultado',
  INFORMADO:   'Informado',
};

type Props = { params: Promise<{ id: string }> };

export default async function FuncaoDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const funcao = await prisma.funcao.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      pessoas: {
        where: { dataFim: null },
        include: { pessoa: { select: { id: true, nome: true, email: true } } },
        orderBy: { dataInicio: 'asc' },
      },
      processos: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!funcao) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <nav className="text-xs text-gray-400 mb-1">
            <Link href="/funcoes" className="hover:underline">Funções</Link>
            {' / '}{funcao.nome}
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{funcao.nome}</h1>
          {funcao.descricao && <p className="text-sm text-gray-500 mt-1">{funcao.descricao}</p>}
        </div>
        <Link
          href={`/funcoes/${id}/edit`}
          style={{ padding: '7px 16px', background: 'transparent', color: '#0f2244', border: '1px solid #d1d5db', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Editar
        </Link>
      </div>

      {/* Pessoas com esta função */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Pessoas com esta Função
          <span className="ml-2 font-normal text-gray-400">({funcao.pessoas.length})</span>
        </h2>
        {funcao.pessoas.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma pessoa ativa nesta função.</p>
        ) : (
          <ul className="space-y-1">
            {funcao.pessoas.map((pf) => (
              <li key={pf.id} className="flex items-center justify-between text-sm">
                <Link href={`/people/${pf.pessoa.id}`} className="font-medium text-gray-800 hover:text-blue-600 hover:underline">
                  {pf.pessoa.nome}
                </Link>
                <span className="text-xs text-gray-400">{pf.pessoa.email ?? ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Processos vinculados (XPROC) */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Processos Vinculados (XPROC)
            <span className="ml-2 font-normal text-gray-400">({funcao.processos.length})</span>
          </h2>
        </div>
        {funcao.processos.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Nenhum processo vinculado. Integração com XPROC disponível no Sprint 4 (Issue 021).
          </p>
        ) : (
          <ul className="space-y-1">
            {funcao.processos.map((fp) => (
              <li key={fp.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">Processo {fp.xprocProcessoId}</span>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  {PAPEL_LABEL[fp.papel] ?? fp.papel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/funcoes" className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar
      </Link>
    </div>
  );
}
