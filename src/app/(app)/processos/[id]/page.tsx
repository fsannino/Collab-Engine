import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const PAPEL_LABEL: Record<string, string> = {
  RESPONSIBLE: 'Responsável',
  ACCOUNTABLE: 'Aprovador',
  CONSULTED:   'Consultado',
  INFORMED:    'Informado',
};

export default async function ProcessoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const processo = await prisma.processo.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      macroprocesso: { select: { id: true, nome: true } },
      funcoes: {
        where: { deletedAt: null },
        include: { funcao: { select: { id: true, nome: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!processo) notFound();

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '900px' }}>
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          <Link href="/macroprocessos" style={{ color: '#64748b', textDecoration: 'none' }}>Macroprocessos</Link>
          {processo.macroprocesso && (
            <> / <Link href={`/macroprocessos/${processo.macroprocesso.id}`} style={{ color: '#64748b', textDecoration: 'none' }}>{processo.macroprocesso.nome}</Link></>
          )}
          {' '} / Processos
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>{processo.nome}</h1>
            {processo.descricao && <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>{processo.descricao}</p>}
            {processo.xprocProcessoId && <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0' }}>XPROC ID: {processo.xprocProcessoId}</p>}
          </div>
        </div>
        <Link
          href={`/processos/${processo.id}/edit`}
          style={{ padding: '9px 18px', background: 'transparent', color: '#0f2244', border: '1px solid #d1d5db', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Editar
        </Link>
      </div>

      <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Funções vinculadas ({processo.funcoes.length})
      </h2>

      {processo.funcoes.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Nenhuma função vinculada. Vincule via página da <Link href="/funcoes" style={{ color: '#0f2244' }}>Função</Link>.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Função</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Papel</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {processo.funcoes.map((fp) => (
                <tr key={fp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/funcoes/${fp.funcao.id}`} style={{ fontWeight: 600, color: '#0f2244', textDecoration: 'none' }}>{fp.funcao.nome}</Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{PAPEL_LABEL[fp.papel] ?? fp.papel}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>{fp.observacao ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
