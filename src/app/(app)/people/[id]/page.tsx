import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

type Props = { params: Promise<{ id: string }> };

export default async function PessoaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const pessoa = await prisma.pessoa.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      cargosHistorico: {
        include: { cargo: { select: { id: true, nome: true, nivel: true } } },
        orderBy: { dataInicio: 'desc' },
      },
      funcoesAtuais: {
        include: { funcao: { select: { id: true, nome: true, descricao: true } } },
        orderBy: { dataInicio: 'desc' },
      },
    },
  });
  if (!pessoa) notFound();

  const cargosAtivos   = pessoa.cargosHistorico.filter((c) => !c.dataFim);
  const cargosEncerrados = pessoa.cargosHistorico.filter((c) => c.dataFim);
  const funcoesAtuais  = pessoa.funcoesAtuais.filter((f) => !f.dataFim);
  const funcoesAntigas = pessoa.funcoesAtuais.filter((f) => f.dataFim);

  const fmt = (d: Date) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-1">
          <Link href="/people" className="hover:underline">Pessoas</Link>
          {' / '}{pessoa.nome}
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">{pessoa.nome}</h1>
        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
          {pessoa.email && <span>{pessoa.email}</span>}
          {pessoa.cpf   && <span>CPF: {pessoa.cpf}</span>}
          {pessoa.hrisId && <span>HRIS: {pessoa.hrisId}</span>}
        </div>
      </div>

      {/* Cargos atuais */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Cargo Atual</h2>
          <Link href={`/people/${id}/assign-cargo`} className="text-xs text-blue-600 hover:underline">+ Vincular cargo</Link>
        </div>
        {cargosAtivos.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sem cargo ativo.</p>
        ) : (
          <ul className="space-y-1">
            {cargosAtivos.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-800">{c.cargo.nome}</span>
                  {c.cargo.nivel && <span className="ml-2 text-xs text-gray-500">({c.cargo.nivel})</span>}
                </div>
                <span className="text-xs text-gray-400">desde {fmt(c.dataInicio)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Funções atuais */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Funções Atuais</h2>
          <Link href={`/people/${id}/assign-funcao`} className="text-xs text-blue-600 hover:underline">+ Vincular função</Link>
        </div>
        {funcoesAtuais.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sem funções ativas.</p>
        ) : (
          <ul className="space-y-2">
            {funcoesAtuais.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <div>
                  <Link href={`/funcoes/${f.funcao.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 hover:underline">
                    {f.funcao.nome}
                  </Link>
                  {f.funcao.descricao && <p className="text-xs text-gray-500">{f.funcao.descricao}</p>}
                </div>
                <span className="text-xs text-gray-400">desde {fmt(f.dataInicio)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Histórico de cargos */}
      {cargosEncerrados.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Cargos</h2>
          <ul className="space-y-1">
            {cargosEncerrados.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm text-gray-500">
                <span>{c.cargo.nome}</span>
                <span className="text-xs">{fmt(c.dataInicio)} – {c.dataFim ? fmt(c.dataFim) : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Histórico de funções */}
      {funcoesAntigas.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Funções</h2>
          <ul className="space-y-1">
            {funcoesAntigas.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm text-gray-500">
                <span>{f.funcao.nome}</span>
                <span className="text-xs">{fmt(f.dataInicio)} – {f.dataFim ? fmt(f.dataFim) : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/people" className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar
      </Link>
    </div>
  );
}
