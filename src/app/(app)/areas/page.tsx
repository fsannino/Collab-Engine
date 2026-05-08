import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Áreas — Collab:Evolve' };

export default async function AreasPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const areas = await prisma.area.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: {
      parent: { select: { id: true, nome: true } },
      _count: {
        select: {
          pessoas: true,
          cargos:  true,
          children: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { nome: 'asc' },
  });

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Áreas</h1>
        </div>
        <Link
          href="/areas/new"
          style={{ padding: '9px 18px', background: '#0f2244', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
        >
          + Nova Área
        </Link>
      </div>

      {areas.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 16px' }}>Nenhuma área cadastrada.</p>
          <Link href="/areas/new" style={{ color: '#0f2244', fontWeight: 600, fontSize: '13px' }}>Criar primeira área</Link>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Área pai</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pessoas</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cargos</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subáreas</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/areas/${a.id}`} style={{ fontWeight: 600, color: '#0f2244', textDecoration: 'none' }}>{a.nome}</Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                    {a.parent ? (
                      <Link href={`/areas/${a.parent.id}`} style={{ color: '#475569', textDecoration: 'none' }}>{a.parent.nome}</Link>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{a._count.pessoas}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{a._count.cargos}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{a._count.children}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
