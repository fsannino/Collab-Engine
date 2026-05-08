import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const DIMENSOES_ADKAR = ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'];

function healthColor(score: number): string {
  if (score >= 70) return '#15803d';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function healthLabel(score: number): string {
  if (score >= 70) return 'On Track';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

type MetricChipProps = { label: string; value: string | number; sub?: string; color?: string };
function MetricChip({ label, value, sub, color = '#0f2244' }: MetricChipProps) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', minWidth: '90px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{sub}</div>}
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

export default async function CMOPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      stakeholderLinks: {
        where: { deletedAt: null },
        select: { id: true, position: true },
      },
      changeImpacts: {
        where: { deletedAt: null },
        select: { id: true, status: true },
      },
      trainingPlans: {
        where: { deletedAt: null },
        select: {
          id: true,
          items: {
            where: { deletedAt: null },
            select: {
              pessoas: { where: { deletedAt: null }, select: { status: true } },
            },
          },
        },
      },
      liderancas: {
        where: { deletedAt: null },
        select: {
          id: true,
          avaliacoes: { select: { dimensao: true, pontuacao: true } },
        },
      },
      avaliacoesCultura: {
        where: { deletedAt: null },
        select: { id: true, status: true, tipo: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = projects.map((p) => {
    // Stakeholders
    const totalStakeholders = p.stakeholderLinks.length;
    const champions = p.stakeholderLinks.filter((s) => s.position === 'CHAMPION').length;
    const resistors = p.stakeholderLinks.filter((s) => s.position === 'RESISTOR').length;
    const stakeholderScore = totalStakeholders === 0 ? 50 : pct(champions, totalStakeholders);

    // Impacts
    const totalImpacts = p.changeImpacts.length;
    const openImpacts = p.changeImpacts.filter((i) => i.status === 'DRAFT' || i.status === 'ACTIVE' || i.status === 'MITIGATING').length;
    const closedImpacts = totalImpacts - openImpacts;
    const impactScore = totalImpacts === 0 ? 100 : pct(closedImpacts, totalImpacts);

    // Training
    const allPessoaTreinamentos = p.trainingPlans.flatMap((t) => t.items.flatMap((i) => i.pessoas));
    const totalEnrolled = allPessoaTreinamentos.length;
    const completed = allPessoaTreinamentos.filter((pt) => pt.status === 'CONCLUIDO').length;
    const trainingScore = totalEnrolled === 0 ? 100 : pct(completed, totalEnrolled);

    // Leadership ADKAR
    const allAvaliacoes = p.liderancas.flatMap((l) => l.avaliacoes);
    const avgADKAR = allAvaliacoes.length > 0
      ? allAvaliacoes.reduce((s, a) => s + a.pontuacao, 0) / allAvaliacoes.length
      : null;
    const adkarScore = avgADKAR !== null ? Math.round((avgADKAR / 10) * 100) : 50;

    // Overall health (weighted average)
    const health = Math.round(stakeholderScore * 0.25 + impactScore * 0.35 + trainingScore * 0.25 + adkarScore * 0.15);

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      health,
      totalStakeholders,
      champions,
      resistors,
      totalImpacts,
      openImpacts,
      closedImpacts,
      totalEnrolled,
      completed,
      avgADKAR,
      totalLideres: p.liderancas.length,
      culturaDone: p.avaliacoesCultura[0]?.status === 'ENCERRADA',
    };
  });

  const globalHealth = summary.length === 0 ? null : Math.round(summary.reduce((s, p) => s + p.health, 0) / summary.length);

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>CMO — Change Management Office</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>M11 · Visão executiva transversal de mudança</p>
          </div>
        </div>
        {globalHealth !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: healthColor(globalHealth), lineHeight: 1 }}>{globalHealth}%</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>saúde geral · {summary.length} projeto{summary.length !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      {/* Global summary bar */}
      {summary.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <MetricChip label="Projetos ativos" value={summary.filter((p) => p.status === 'ACTIVE').length} />
          <MetricChip label="Stakeholders" value={summary.reduce((s, p) => s + p.totalStakeholders, 0)} sub={`${summary.reduce((s, p) => s + p.champions, 0)} champions`} color="#15803d" />
          <MetricChip label="Impactos abertos" value={summary.reduce((s, p) => s + p.openImpacts, 0)} color={summary.some((p) => p.openImpacts > 0) ? '#d97706' : '#15803d'} />
          <MetricChip label="Treinamentos" value={`${pct(summary.reduce((s, p) => s + p.completed, 0), Math.max(summary.reduce((s, p) => s + p.totalEnrolled, 0), 1))}%`} sub="concluídos" />
          <MetricChip label="Líderes mapeados" value={summary.reduce((s, p) => s + p.totalLideres, 0)} />
          <MetricChip label="Cultura avaliada" value={summary.filter((p) => p.culturaDone).length} sub={`de ${summary.length} projetos`} />
        </div>
      )}

      {/* Per-project cards */}
      {summary.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum projeto cadastrado. Crie um projeto para começar o acompanhamento OCM.</p>
          <Link href="/projects/new" style={{ display: 'inline-block', marginTop: '16px', padding: '9px 20px', background: '#0f2244', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
            Criar projeto
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {summary.map((p) => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/projects/${p.id}`} style={{ fontWeight: 700, color: '#0f2244', fontSize: '15px', textDecoration: 'none' }}>{p.name}</Link>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.status.replace('_', ' ')}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: healthColor(p.health), lineHeight: 1 }}>{p.health}%</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: healthColor(p.health), marginTop: '2px' }}>{healthLabel(p.health)}</div>
                </div>
              </div>

              {/* Health bar */}
              <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.health}%`, background: healthColor(p.health), borderRadius: '2px', transition: 'width 0.3s' }} />
              </div>

              {/* Metrics row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {/* Stakeholders */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Stakeholders</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f2244' }}>{p.totalStakeholders}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    <span style={{ color: '#15803d' }}>+{p.champions}</span> / <span style={{ color: '#dc2626' }}>-{p.resistors}</span>
                  </div>
                </div>

                {/* Impacts */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Impactos</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: p.openImpacts > 0 ? '#d97706' : '#15803d' }}>{p.openImpacts} abertos</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.closedImpacts} resolvidos</div>
                </div>

                {/* Training */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Treinamento</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f2244' }}>
                    {pct(p.completed, Math.max(p.totalEnrolled, 1))}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.completed}/{p.totalEnrolled} concluídos</div>
                </div>

                {/* Leadership ADKAR */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>ADKAR médio</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: p.avgADKAR !== null ? (p.avgADKAR >= 7 ? '#15803d' : p.avgADKAR >= 4 ? '#d97706' : '#dc2626') : '#94a3b8' }}>
                    {p.avgADKAR !== null ? p.avgADKAR.toFixed(1) : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.totalLideres} líderes</div>
                </div>

                {/* Culture */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Cultura OCAI</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: p.culturaDone ? '#15803d' : '#94a3b8' }}>
                    {p.culturaDone ? 'Avaliada' : 'Pendente'}
                  </div>
                  <Link href={`/cultura`} style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block', textDecoration: 'none' }}>ver diagnóstico →</Link>
                </div>
              </div>

              {/* Quick links */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                <Link href={`/projects/${p.id}`} style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}>Projeto →</Link>
                <Link href={`/lideranca`} style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}>Liderança →</Link>
                <Link href={`/training/plans`} style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}>Treinamentos →</Link>
                <a href={`/api/relatorio/${p.id}`} download style={{ fontSize: '12px', color: '#c9a227', fontWeight: 600, textDecoration: 'none' }}>⬇ Relatório PDF</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
