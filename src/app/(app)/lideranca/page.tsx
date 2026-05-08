import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const DIMENSOES_ADKAR = ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'];

function scoreColor(avg: number | null): string {
  if (avg === null) return '#94a3b8';
  if (avg >= 7) return '#15803d';
  if (avg >= 4) return '#d97706';
  return '#dc2626';
}

export default async function LiderancaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const liderancas = await prisma.lideranca.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    include: {
      pessoa:    { select: { nome: true, email: true } },
      project:   { select: { name: true } },
      area:      { select: { nome: true } },
      avaliacoes: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Leadership Console</h1>
        </div>
        <Link href="/lideranca/new" style={{ padding: '9px 20px', background: '#0f2244', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
          + Adicionar Líder
        </Link>
      </div>

      {liderancas.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum líder cadastrado. Adicione líderes para acompanhar o engajamento ADKAR.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {liderancas.map((l) => {
            const avg = l.avaliacoes.length > 0
              ? l.avaliacoes.reduce((s, a) => s + a.pontuacao, 0) / l.avaliacoes.length
              : null;
            const preenchidas = DIMENSOES_ADKAR.filter((d) => l.avaliacoes.find((a) => a.dimensao === d));

            return (
              <Link key={l.id} href={`/lideranca/${l.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#0f2244', flexShrink: 0 }}>
                    {l.pessoa.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f2244', fontSize: '14px' }}>{l.pessoa.nome}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {l.papel}
                      {l.project && <span style={{ color: '#94a3b8' }}> · {l.project.name}</span>}
                      {l.area    && <span style={{ color: '#94a3b8' }}> · {l.area.nome}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {DIMENSOES_ADKAR.map((d) => {
                      const av = l.avaliacoes.find((a) => a.dimensao === d);
                      return (
                        <div key={d} title={d} style={{ width: '28px', height: '28px', borderRadius: '6px', background: av ? '#f0fdf4' : '#f8fafc', border: `1px solid ${av ? '#86efac' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: av ? '#15803d' : '#cbd5e1' }}>
                          {d.charAt(0)}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: scoreColor(avg) }}>
                      {avg !== null ? avg.toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{preenchidas.length}/{DIMENSOES_ADKAR.length} dims</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
