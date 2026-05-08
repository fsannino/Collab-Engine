import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Cargo — Collab Engine' };

type Props = { params: Promise<{ id: string }> };

export default async function CargoDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const cargo = await prisma.cargo.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      area: { select: { id: true, nome: true } },
      pessoas: {
        where: { dataFim: null },
        include: { pessoa: { select: { id: true, nome: true, email: true } } },
        orderBy: { dataInicio: 'asc' },
      },
    },
  });

  if (!cargo) notFound();

  const fmt = (d: Date) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '900px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '8px' }}>
        <Link href="/cargos" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Cargos</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>{cargo.nome}</h1>
            {cargo.nivel && (
              <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', padding: '3px 10px' }}>{cargo.nivel}</span>
            )}
          </div>
          {cargo.descricao && (
            <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 0 14px' }}>{cargo.descricao}</p>
          )}
          {cargo.area && (
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 14px' }}>
              Área: <Link href={`/areas/${cargo.area.id}`} style={{ color: '#0f2244', textDecoration: 'none', fontWeight: 600 }}>{cargo.area.nome}</Link>
            </p>
          )}
        </div>
        <Link
          href={`/cargos/${id}/edit`}
          style={{ padding: '9px 18px', background: 'transparent', color: '#0f2244', border: '1px solid #d1d5db', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Editar
        </Link>
      </div>

      {/* Pessoas com este cargo */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Pessoas com este Cargo ({cargo.pessoas.length})
        </h2>
        {cargo.pessoas.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nenhuma pessoa ativa com este cargo.</p>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {cargo.pessoas.map((pc) => (
              <div key={pc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <div>
                  <Link href={`/people/${pc.pessoa.id}`} style={{ color: '#0f2244', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>{pc.pessoa.nome}</Link>
                  {pc.pessoa.email && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>{pc.pessoa.email}</span>}
                </div>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>desde {fmt(pc.dataInicio)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
