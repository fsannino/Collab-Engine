import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Processos — Collab Engine' };

export default async function ProcessosPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const processos = await prisma.processo.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: {
      macroprocesso: { select: { id: true, nome: true } },
      _count: { select: { funcoes: { where: { deletedAt: null } } } },
    },
    orderBy: [{ macroprocesso: { nome: 'asc' } }, { nome: 'asc' }],
  });

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Processos</h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '2px 0 0' }}>{processos.length} cadastrado{processos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/processos/new" style={{ padding: '9px 18px', background: '#0f2244', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          + Novo Processo
        </Link>
      </div>

      {processos.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 12px' }}>Nenhum processo cadastrado.</p>
          <Link href="/processos/new" style={{ color: '#0f2244', fontWeight: 600, fontSize: '13px' }}>Cadastrar primeiro</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {processos.map((p) => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#0f2244', fontSize: '14px' }}>{p.nome}</div>
                {p.macroprocesso && (
                  <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                    {p.macroprocesso.nome}
                  </div>
                )}
                {p.descricao && <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao}</div>}
              </div>
              <span style={{ flexShrink: 0, fontSize: '11px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', padding: '2px 10px', marginLeft: '12px' }}>
                {p._count.funcoes} função{p._count.funcoes !== 1 ? 'ões' : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
