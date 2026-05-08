import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Cultura Organizacional — Collab Engine' };

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:  'Rascunho',
  ATIVA:     'Ativa',
  ENCERRADA: 'Encerrada',
};
const STATUS_COLOR: Record<string, string> = {
  RASCUNHO:  'background:#f1f5f9;color:#64748b',
  ATIVA:     'background:#dcfce7;color:#15803d',
  ENCERRADA: 'background:#f0fdf4;color:#166534',
};
const TIPO_LABEL: Record<string, string> = {
  PROJETO: 'Projeto',
  AREA:    'Área',
  LIVRE:   'Livre',
};

export default async function CulturaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const avaliacoes = await prisma.avaliacaoCultura.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: {
      project: { select: { name: true } },
      area:    { select: { nome: true } },
      _count:  { select: { convites: true, respostas: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Cultura Organizacional</h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '2px 0 0' }}>Diagnósticos OCAI — atual vs. desejada</p>
          </div>
        </div>
        <Link href="/cultura/new" style={{ padding: '9px 18px', background: '#0f2244', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          + Nova Avaliação
        </Link>
      </div>

      {avaliacoes.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 12px' }}>Nenhuma avaliação de cultura criada.</p>
          <Link href="/cultura/new" style={{ color: '#0f2244', fontWeight: 600, fontSize: '13px' }}>Criar primeira avaliação</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {avaliacoes.map((av) => (
            <Link
              key={av.id}
              href={`/cultura/${av.id}`}
              style={{ display: 'block', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#0f2244', fontSize: '15px', marginBottom: '3px' }}>{av.nome}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>
                    {TIPO_LABEL[av.tipo]}
                    {av.project && ` — ${av.project.name}`}
                    {av.area    && ` — ${av.area.nome}`}
                    {' · '}
                    {av._count.respostas}/{av._count.convites} respostas
                  </div>
                </div>
                <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, borderRadius: '20px', padding: '3px 10px', ...Object.fromEntries((STATUS_COLOR[av.status] ?? '').split(';').filter(Boolean).map((s) => s.split(':') as [string, string])) }}>
                  {STATUS_LABEL[av.status] ?? av.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
