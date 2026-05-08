import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export default async function MacroprocessoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const mp = await prisma.macroprocesso.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      processos: {
        where: { deletedAt: null },
        include: { _count: { select: { funcoes: { where: { deletedAt: null } } } } },
        orderBy: { nome: 'asc' },
      },
    },
  });

  if (!mp) notFound();

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Link href="/macroprocessos" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Macroprocessos</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>{mp.nome}</h1>
          </div>
          {mp.descricao && <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 0 14px' }}>{mp.descricao}</p>}
          {mp.xprocMacroprocessoId && (
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 14px' }}>XPROC ID: {mp.xprocMacroprocessoId}</p>
          )}
        </div>
        <Link
          href={`/processos/new?macroprocessoId=${mp.id}`}
          style={{ padding: '9px 18px', background: '#0f2244', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          + Novo Processo
        </Link>
      </div>

      <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Processos ({mp.processos.length})
      </h2>

      {mp.processos.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 12px' }}>Nenhum processo cadastrado neste macroprocesso.</p>
          <Link href={`/processos/new?macroprocessoId=${mp.id}`} style={{ color: '#0f2244', fontWeight: 600, fontSize: '13px' }}>Cadastrar primeiro processo</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {mp.processos.map((p) => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px', textDecoration: 'none' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#0f2244', fontSize: '14px' }}>{p.nome}</div>
                {p.descricao && <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao}</div>}
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
