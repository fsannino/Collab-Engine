import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { calculateZone } from '@/shared/governance/scoring';

export const metadata = { title: 'Leadership Console' };

type Params = Promise<{ id: string }>;

// ─── Status computation ──────────────────────────────────────────────────────

type ProjectStatus = 'NO_CAMINHO' | 'EM_RISCO' | 'CRITICO';

function computeStatus(
  criticalImpacts: number,
  stakeholderBalance: number, // positivo = mais aliados; negativo = mais resistentes
  trainingCoverage: number,   // 0-100
): ProjectStatus {
  if (criticalImpacts >= 3 || stakeholderBalance <= -3) return 'CRITICO';
  if (criticalImpacts >= 1 || stakeholderBalance < 0 || trainingCoverage < 50) return 'EM_RISCO';
  return 'NO_CAMINHO';
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; bg: string; color: string; icon: string }> = {
  NO_CAMINHO: { label: 'No Caminho',  bg: '#dcfce7', color: '#15803d', icon: '✓' },
  EM_RISCO:   { label: 'Em Risco',    bg: '#fef9c3', color: '#854d0e', icon: '!' },
  CRITICO:    { label: 'Crítico',     bg: '#fee2e2', color: '#dc2626', icon: '✕' },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LeadershipConsolePage({ params }: { params: Params }) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [impacts, stakeholders, trainingStats, liderancas, topActions] = await Promise.all([
    // All non-closed impacts
    prisma.changeImpact.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null, status: { not: 'CLOSED' } },
      select: { id: true, title: true, score: true, status: true, severityScore: true, dimension: true },
      orderBy: { score: 'desc' },
    }),
    // All stakeholder links
    prisma.projectStakeholder.findMany({
      where: { projectId, deletedAt: null },
      select: { position: true, stakeholder: { select: { name: true } } },
    }),
    // Training coverage aggregation
    prisma.pessoaTreinamento.groupBy({
      by: ['status'],
      where: { trainingItem: { plan: { projectId, deletedAt: null }, deletedAt: null }, deletedAt: null },
      _count: { id: true },
    }),
    // Leaders for this project (ADKAR)
    prisma.lideranca.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null },
      include: { pessoa: { select: { nome: true } }, avaliacoes: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Top 3 high-score impacts as "next actions" for the leader
    prisma.changeImpact.findMany({
      where: {
        projectId,
        tenantId: session.tenantId,
        deletedAt: null,
        status: { in: ['ACTIVE', 'MITIGATING'] },
        score: { gte: 10 },
      },
      orderBy: { score: 'desc' },
      take: 3,
      select: { id: true, title: true, score: true, dimension: true, status: true },
    }),
  ]);

  // ── KPI computations ────────────────────────────────────────────────────────

  const criticalImpacts = impacts.filter((i) => calculateZone(i.score) === 'RED').length;
  const openImpacts     = impacts.filter((i) => i.status === 'ACTIVE' || i.status === 'MITIGATING').length;
  const resolvedImpacts = impacts.filter((i) => i.status === 'RESOLVED').length;

  const aliados     = stakeholders.filter((s) => s.position === 'CHAMPION' || s.position === 'SUPPORTER').length;
  const resistentes = stakeholders.filter((s) => s.position === 'RESISTOR' || s.position === 'ANTAGONIST').length;
  const neutros     = stakeholders.filter((s) => s.position === 'NEUTRAL').length;
  const stakeholderBalance = aliados - resistentes;

  const trainingTotal    = trainingStats.reduce((s, g) => s + g._count.id, 0);
  const trainingConcluido = trainingStats.find((g) => g.status === 'CONCLUIDO')?._count.id ?? 0;
  const trainingCoverage = trainingTotal > 0 ? Math.round((trainingConcluido / trainingTotal) * 100) : 0;

  // ADKAR average across all leaders in the project
  const adkarAvg = (() => {
    const all = liderancas.flatMap((l) => l.avaliacoes.map((a) => a.pontuacao));
    return all.length > 0 ? Math.round(all.reduce((s, v) => s + v, 0) / all.length) : null;
  })();

  const status = computeStatus(criticalImpacts, stakeholderBalance, trainingCoverage);
  const sc     = STATUS_CONFIG[status];

  // ── Decisions pendentes: critical red-zone impacts ─────────────────────────
  const decisoesPendentes = impacts
    .filter((i) => calculateZone(i.score) === 'RED' && i.status === 'ACTIVE')
    .slice(0, 5);

  const DIMENSION_LABEL: Record<string, string> = {
    PROCESS: 'Processo', PEOPLE: 'Pessoas', TECHNOLOGY: 'Tecnologia',
    STRUCTURE: 'Estrutura', CULTURE: 'Cultura',
  };

  return (
    <div style={{
      padding: '24px 20px',
      fontFamily: 'system-ui,-apple-system,sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {/* Back */}
      <div style={{ marginBottom: '16px' }}>
        <Link href={`/projects/${projectId}/dashboard`} style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
          ← {project.name}
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Leadership Console
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f2244', margin: 0, lineHeight: 1.2 }}>
          {project.name}
        </h1>
      </div>

      {/* Status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: sc.bg, borderRadius: '14px', padding: '16px 20px', marginBottom: '20px',
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 700, flexShrink: 0 }}>
          {sc.icon}
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: sc.color }}>{sc.label}</div>
          <div style={{ fontSize: '12px', color: sc.color, opacity: 0.8 }}>
            {status === 'NO_CAMINHO'
              ? 'Projeto dentro do esperado'
              : status === 'EM_RISCO'
              ? 'Atenção necessária em alguns indicadores'
              : 'Indicadores críticos requerem ação imediata'}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {/* Stakeholders */}
        <KpiBlock
          label="Stakeholders"
          value={stakeholderBalance >= 0 ? `+${stakeholderBalance}` : `${stakeholderBalance}`}
          sub={`${aliados} aliados · ${resistentes} resistentes · ${neutros} neutros`}
          color={stakeholderBalance > 0 ? '#15803d' : stakeholderBalance < 0 ? '#dc2626' : '#64748b'}
          href={`/projects/${projectId}/stakeholders`}
        />
        {/* Impactos */}
        <KpiBlock
          label="Impactos abertos"
          value={openImpacts}
          sub={`${criticalImpacts} crítico${criticalImpacts !== 1 ? 's' : ''} · ${resolvedImpacts} resolvido${resolvedImpacts !== 1 ? 's' : ''}`}
          color={criticalImpacts > 0 ? '#dc2626' : openImpacts > 0 ? '#d97706' : '#15803d'}
          href={`/projects/${projectId}/impacts`}
        />
        {/* Treinamento */}
        <KpiBlock
          label="Cobertura de treinamento"
          value={`${trainingCoverage}%`}
          sub={`${trainingConcluido} de ${trainingTotal} concluído${trainingConcluido !== 1 ? 's' : ''}`}
          color={trainingCoverage >= 80 ? '#15803d' : trainingCoverage >= 50 ? '#d97706' : '#dc2626'}
          href={`/projects/${projectId}/training`}
        />
        {/* ADKAR */}
        {adkarAvg !== null ? (
          <KpiBlock
            label="ADKAR médio"
            value={`${adkarAvg}/10`}
            sub={`${liderancas.length} líder${liderancas.length !== 1 ? 'es' : ''} avaliado${liderancas.length !== 1 ? 's' : ''}`}
            color={adkarAvg >= 7 ? '#15803d' : adkarAvg >= 4 ? '#d97706' : '#dc2626'}
            href="/lideranca"
          />
        ) : (
          <KpiBlock
            label="ADKAR médio"
            value="—"
            sub="Nenhuma avaliação"
            color="#94a3b8"
            href="/lideranca"
          />
        )}
      </div>

      {/* Próximas ações */}
      {topActions.length > 0 && (
        <Section title="Próximas ações">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topActions.map((a, i) => (
              <Link
                key={a.id}
                href={`/projects/${projectId}/impacts/${a.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f2244', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {DIMENSION_LABEL[a.dimension] ?? a.dimension} · Score {a.score}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>›</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Decisões pendentes */}
      {decisoesPendentes.length > 0 && (
        <Section title={`Decisões pendentes (${decisoesPendentes.length})`} accent="#dc2626">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {decisoesPendentes.map((d) => (
              <Link
                key={d.id}
                href={`/projects/${projectId}/impacts/${d.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>
                      Risco crítico · Score {d.score} · {DIMENSION_LABEL[d.dimension] ?? d.dimension}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', color: '#fca5a5', flexShrink: 0 }}>›</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Leaders */}
      {liderancas.length > 0 && (
        <Section title="Líderes do Projeto">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {liderancas.map((l) => {
              const avg = l.avaliacoes.length > 0
                ? Math.round(l.avaliacoes.reduce((s, a) => s + a.pontuacao, 0) / l.avaliacoes.length)
                : null;
              const color = avg === null ? '#94a3b8' : avg >= 7 ? '#15803d' : avg >= 4 ? '#d97706' : '#dc2626';
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0f2244', color: '#c9a227', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                    {l.pessoa.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.pessoa.nome}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{l.papel}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color }}>{avg !== null ? `${avg}/10` : '—'}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>ADKAR</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {topActions.length === 0 && decisoesPendentes.length === 0 && liderancas.length === 0 && (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Nenhum dado disponível ainda.<br />
            Cadastre impactos, stakeholders e treinamentos para visualizar indicadores.
          </p>
        </div>
      )}

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/projects/${projectId}/dashboard`} style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}>
          Dashboard completo →
        </Link>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiBlock({
  label, value, sub, color, href,
}: {
  label: string; value: string | number; sub: string; color: string; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f2244', margin: '4px 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.4 }}>{sub}</div>
      </div>
    </Link>
  );
}

function Section({ title, children, accent = '#0f2244' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '3px', height: '16px', background: accent, borderRadius: '2px' }} />
        <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
