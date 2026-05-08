import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import AreaForm from '../new/_form';

export const metadata = { title: 'Área — Collab:Evolve' };

type Props = { params: Promise<{ id: string }> };

export default async function AreaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const [area, allAreas] = await Promise.all([
    prisma.area.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      include: {
        parent: { select: { id: true, nome: true } },
        children: {
          where: { deletedAt: null },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true },
        },
        pessoas: {
          where: { deletedAt: null },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, email: true },
        },
        cargos: {
          where: { deletedAt: null },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, nivel: true },
        },
      },
    }),
    prisma.area.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  if (!area) notFound();

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '960px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '8px' }}>
        <Link href="/areas" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Áreas</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>{area.nome}</h1>
          </div>
          {area.parent && (
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 14px' }}>
              Pai: <Link href={`/areas/${area.parent.id}`} style={{ color: '#0f2244', textDecoration: 'none', fontWeight: 600 }}>{area.parent.nome}</Link>
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {/* Subáreas */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>
            Subáreas ({area.children.length})
          </h2>
          {area.children.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nenhuma subárea.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {area.children.map((c) => (
                <li key={c.id}>
                  <Link href={`/areas/${c.id}`} style={{ color: '#0f2244', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>{c.nome}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cargos */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>
            Cargos ({area.cargos.length})
          </h2>
          {area.cargos.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nenhum cargo nesta área.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {area.cargos.map((c) => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link href={`/cargos/${c.id}`} style={{ color: '#0f2244', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>{c.nome}</Link>
                  {c.nivel && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.nivel}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Pessoas */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Pessoas ({area.pessoas.length})
        </h2>
        {area.pessoas.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nenhuma pessoa nesta área.</p>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {area.pessoas.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                <Link href={`/people/${p.id}`} style={{ color: '#0f2244', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>{p.nome}</Link>
                {p.email && <span style={{ color: '#64748b', fontSize: '12px' }}>{p.email}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit form */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f2244', margin: '0 0 20px' }}>Editar Área</h2>
        <AreaForm
          areas={allAreas}
          editId={id}
          defaultValues={{ nome: area.nome, descricao: area.descricao, parentId: area.parentId }}
        />
      </div>
    </div>
  );
}
