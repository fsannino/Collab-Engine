import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Macroprocessos — Collab:Evolve' };

export default async function MacroprocessosPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const macroprocessos = await prisma.macroprocesso.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: { _count: { select: { processos: { where: { deletedAt: null } } } } },
    orderBy: { nome: 'asc' },
  });

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Macroprocessos</h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '2px 0 0' }}>{macroprocessos.length} cadastrado{macroprocessos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/macroprocessos/new" style={{ padding: '9px 18px', background: '#0f2244', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          + Novo Macroprocesso
        </Link>
      </div>

      {macroprocessos.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 12px' }}>Nenhum macroprocesso cadastrado.</p>
          <Link href="/macroprocessos/new" style={{ color: '#0f2244', fontWeight: 600, fontSize: '13px' }}>Cadastrar primeiro</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {macroprocessos.map((mp) => (
            <Link
              key={mp.id}
              href={`/macroprocessos/${mp.id}`}
              style={{ display: 'block', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#0f2244', fontSize: '15px' }}>{mp.nome}</div>
                  {mp.descricao && <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mp.descricao}</div>}
                </div>
                <span style={{ flexShrink: 0, fontSize: '12px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', padding: '3px 10px', fontWeight: 600 }}>
                  {mp._count.processos} processo{mp._count.processos !== 1 ? 's' : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
