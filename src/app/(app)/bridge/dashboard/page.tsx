import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { getAllProjectsHealth, type ProjectHealthData } from '@/integration/bridge/aggregators';
import { RefreshBtn } from './_refresh-btn';

export const metadata = { title: 'Dashboard Cross-Sistema — Bridge' };

// Revalidate every hour (matches cache TTL in aggregators)
export const revalidate = 3600;

const ZONE_STYLES: Record<ProjectHealthData['healthZone'], { bg: string; color: string; label: string }> = {
  verde:    { bg: '#dcfce7', color: '#15803d', label: 'Saudável'  },
  amarelo:  { bg: '#fef9c3', color: '#854d0e', label: 'Atenção'   },
  laranja:  { bg: '#fed7aa', color: '#9a3412', label: 'Risco'     },
  vermelho: { bg: '#fee2e2', color: '#dc2626', label: 'Crítico'   },
};

function Kpi({ label, value, sub }: { label: string; value: string | number | null; sub?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: value === null ? '#cbd5e1' : '#0f2244', lineHeight: 1 }}>
        {value === null ? '—' : value}
      </div>
      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>{label}</div>
      {sub && <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>{sub}</div>}
    </div>
  );
}

function HealthBar({ score }: { score: number }) {
  const zone = score >= 80 ? 'verde' : score >= 60 ? 'amarelo' : score >= 40 ? 'laranja' : 'vermelho';
  const color = ZONE_STYLES[zone].color;
  return (
    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '4px', width: `${score}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  );
}

export default async function BridgeDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Restrict to admin/manager roles
  if (session.role !== 'ADMIN' && session.role !== 'CHANGE_MANAGER' && session.role !== 'PROJECT_MANAGER') {
    redirect('/bridge');
  }

  const projects = await getAllProjectsHealth(session.tenantId);

  const summary = {
    total:    projects.length,
    saudavel: projects.filter((p) => p.healthZone === 'verde').length,
    atencao:  projects.filter((p) => p.healthZone === 'amarelo').length,
    risco:    projects.filter((p) => p.healthZone === 'laranja').length,
    critico:  projects.filter((p) => p.healthZone === 'vermelho').length,
  };

  // Sort: critical first, then by score asc
  const sorted = [...projects].sort((a, b) => a.healthScore - b.healthScore);

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1200px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ marginBottom: '4px' }}>
            <Link href="/bridge" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Bridge</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Dashboard Cross-Sistema</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 14px' }}>
            Saúde unificada — Collab:Build + Collab:Evolve + Collab:Flow (suite Collab:Engine)
          </p>
        </div>
        <RefreshBtn />
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Saudáveis',  value: summary.saudavel, zone: 'verde'    as const },
          { label: 'Atenção',    value: summary.atencao,  zone: 'amarelo'  as const },
          { label: 'Em Risco',   value: summary.risco,    zone: 'laranja'  as const },
          { label: 'Críticos',   value: summary.critico,  zone: 'vermelho' as const },
        ].map(({ label, value, zone }) => (
          <div
            key={label}
            style={{ background: ZONE_STYLES[zone].bg, borderRadius: '10px', padding: '16px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: ZONE_STYLES[zone].color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '12px', color: ZONE_STYLES[zone].color, marginTop: '4px', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Project table */}
      {projects.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Nenhum projeto ativo encontrado.<br />
            Crie projetos e os dados aparecerão aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((p) => {
            const zs = ZONE_STYLES[p.healthZone];
            return (
              <div
                key={p.projectId}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

                  {/* Health score badge */}
                  <div
                    style={{ width: '48px', height: '48px', borderRadius: '10px', background: zs.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 700, color: zs.color, lineHeight: 1 }}>{p.healthScore}</div>
                    <div style={{ fontSize: '9px', color: zs.color, fontWeight: 600, marginTop: '1px' }}>{zs.label}</div>
                  </div>

                  {/* Project name + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Link
                        href={`/projects/${p.projectId}/impacts`}
                        style={{ fontSize: '14px', fontWeight: 600, color: '#0f2244', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {p.projectName}
                      </Link>
                    </div>
                    <HealthBar score={p.healthScore} />
                  </div>

                  {/* KPI grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 64px)', gap: '8px', flexShrink: 0 }}>
                    <Kpi label="Impactos" value={p.impactosAbertos} sub="Collab" />
                    <Kpi label="Trein. atras." value={p.treinamentosAtrasados} sub="Collab" />
                    <Kpi label="Tarefas" value={p.tarefasAtrasadas} sub="SMR" />
                    <Kpi label="Riscos crit." value={p.riscosCriticos} sub="SMR" />
                    <Kpi label="Problemas" value={p.problemasAbertos} sub="SMR" />
                    <Kpi label="Proc. s/ rev." value={p.processosNaoRevisados} sub="XPROC" />
                  </div>

                </div>

                {/* Last updated */}
                <div style={{ textAlign: 'right', fontSize: '10px', color: '#cbd5e1', marginTop: '6px' }}>
                  Atualizado {new Date(p.lastUpdated).toLocaleString('pt-BR')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px' }}>
        Dados externos (SMR, XPROC) podem estar indisponíveis — exibidos como "—" quando API não responde. Cache TTL: 1h.
      </p>
    </div>
  );
}
