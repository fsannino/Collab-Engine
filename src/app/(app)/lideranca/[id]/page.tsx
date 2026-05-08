import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { excluirLiderancaAction } from '@/modules/lideranca/lideranca.actions';
import AvaliacaoLiderancaForm from './_avaliacao-form';

const DIMENSOES_ADKAR = ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'];

function scoreColor(avg: number | null): string {
  if (avg === null) return '#94a3b8';
  if (avg >= 7) return '#15803d';
  if (avg >= 4) return '#d97706';
  return '#dc2626';
}

export default async function LiderancaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const lideranca = await prisma.lideranca.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      pessoa:    { select: { nome: true, email: true } },
      project:   { select: { name: true } },
      area:      { select: { nome: true } },
      avaliacoes: true,
    },
  });

  if (!lideranca) notFound();

  const avg = lideranca.avaliacoes.length > 0
    ? lideranca.avaliacoes.reduce((s, a) => s + a.pontuacao, 0) / lideranca.avaliacoes.length
    : null;

  const preenchidas = DIMENSOES_ADKAR.filter((d) => lideranca.avaliacoes.find((a) => a.dimensao === d));

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '760px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link href="/lideranca" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
          ← Leadership Console
        </Link>
      </div>

      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#0f2244', flexShrink: 0 }}>
            {lideranca.pessoa.nome.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: '0 0 4px 0' }}>{lideranca.pessoa.nome}</h1>
            {lideranca.pessoa.email && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{lideranca.pessoa.email}</div>}
            <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{lideranca.papel}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {lideranca.project && <span>{lideranca.project.name}</span>}
              {lideranca.project && lideranca.area && <span> · </span>}
              {lideranca.area && <span>{lideranca.area.nome}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: scoreColor(avg), lineHeight: 1 }}>
              {avg !== null ? avg.toFixed(1) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{preenchidas.length}/{DIMENSOES_ADKAR.length} dimensões</div>
          </div>
        </div>

        {/* ADKAR summary chips */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
          {DIMENSOES_ADKAR.map((d) => {
            const av = lideranca.avaliacoes.find((a) => a.dimensao === d);
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '6px', background: av ? '#f0fdf4' : '#f8fafc', border: `1px solid ${av ? '#86efac' : '#e2e8f0'}` }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: av ? scoreColor(av.pontuacao) : '#94a3b8' }}>{d.charAt(0)}</span>
                <span style={{ fontSize: '12px', color: av ? '#374151' : '#94a3b8' }}>{d}</span>
                {av && <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor(av.pontuacao) }}>{av.pontuacao.toFixed(1)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ADKAR scoring form */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '3px', height: '18px', background: '#c9a227', borderRadius: '2px' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Avaliação ADKAR</h2>
        </div>
        <AvaliacaoLiderancaForm liderancaId={lideranca.id} avaliacoes={lideranca.avaliacoes} />
      </div>

      {/* Danger zone */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
        <form action={async () => {
          'use server';
          await excluirLiderancaAction(id);
          redirect('/lideranca');
        }}>
          <button type="submit" style={{ padding: '8px 16px', background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Remover líder
          </button>
        </form>
      </div>
    </div>
  );
}
