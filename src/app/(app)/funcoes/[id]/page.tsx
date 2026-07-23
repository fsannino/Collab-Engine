import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { getProcessosByIds, isXprocConfigured } from '@/integration/xproc/client';
import { ProcessoLinkSection } from './_processo-link';

const PAPEL_LABEL: Record<string, string> = {
  RESPONSIBLE: 'Responsável',
  ACCOUNTABLE: 'Aprovador',
  CONSULTED:   'Consultado',
  INFORMED:    'Informado',
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

  // Resolve nomes dos processos no XPROC (best-effort; falha não quebra a página)
  const processoNomes = await getProcessosByIds(
    funcao.processos.map((fp) => fp.xprocProcessoId)
  ).catch(() => new Map());

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-1">
          <Link href="/funcoes" className="hover:underline">Funções</Link>
          {' / '}{funcao.nome}
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">{funcao.nome}</h1>
        {funcao.descricao && <p className="text-sm text-gray-500 mt-1">{funcao.descricao}</p>}
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

      {/* Processos vinculados (XPROC) — Issue 021 */}
      <ProcessoLinkSection
        funcaoId={funcao.id}
        xprocDisponivel={isXprocConfigured()}
        papelLabel={PAPEL_LABEL}
        vinculos={funcao.processos.map((fp) => ({
          id: fp.id,
          xprocProcessoId: fp.xprocProcessoId,
          processoNome: processoNomes.get(fp.xprocProcessoId)?.nome ?? null,
          papel: fp.papel,
          observacao: fp.observacao,
        }))}
      />

      <Link href="/funcoes" className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar
      </Link>
    </div>
  );
}
