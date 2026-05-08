import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { computeRiskSeverity, getRiskZone } from '@/modules/risk/risk.utils'
import { closeRiskAction } from '@/modules/risk/risk.actions'
import { CloseRiskButton } from './_close-risk-btn'

const ZONE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  GREEN:  { bg: '#dcfce7', color: '#166534', label: 'Verde'   },
  YELLOW: { bg: '#fef9c3', color: '#854d0e', label: 'Amarelo' },
  ORANGE: { bg: '#ffedd5', color: '#9a3412', label: 'Laranja' },
  RED:    { bg: '#fee2e2', color: '#991b1b', label: 'Crítico' },
}
const DEFAULT_ZONE = { bg: '#f1f5f9', color: '#475569', label: 'N/A' }

const SOURCE_LABELS: Record<string, string> = {
  HISTORY_ASSESSMENT: 'History Assessment',
  CULTURE_DIMENSION:  'Dimensão Cultural',
  GAP_ANALYSIS:       'Gap Analysis',
  CHANGE_IMPACT:      'Impacto de Mudança',
  MULTIPLE_CHANGE:    'Mudanças Múltiplas',
  PROJECT_INITIATION: 'Iniciação do Projeto',
  MANUAL:             'Manual',
}

export default async function RiskDetailPage({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id: projectId, rid: riskId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const risk = await prisma.risk.findFirst({
    where: { id: riskId, projectId, tenantId: session.tenantId, deletedAt: null },
    include: {
      sources: { orderBy: { identifiedAt: 'asc' } },
      changePlanItems: {
        where: { deletedAt: null },
        select: { id: true, description: true, status: true, pctComplete: true, lever: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!risk) redirect(`/projects/${projectId}/risks`)

  const score = computeRiskSeverity(risk.impact, risk.probability)
  const zone  = getRiskZone(score)
  const zs    = ZONE_STYLE[zone] ?? DEFAULT_ZONE

  const openItems = risk.changePlanItems.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS')

  return (
    <div style={{ padding: '40px 44px', maxWidth: '820px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '20px' }}>
        <Link href={`/projects/${projectId}/risks`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>Risk Log</Link>
        {' / '}Risco
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 8px', lineHeight: 1.3 }}>
            {risk.description}
          </h1>
          <span style={{ background: zs.bg, color: zs.color, borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700 }}>
            {zs.label} — Score {score}
          </span>
        </div>
        {risk.status !== 'CLOSED' && (
          <CloseRiskButton
            riskId={risk.id}
            projectId={projectId}
            openItemCount={openItems.length}
            openItems={openItems}
            closeAction={closeRiskAction}
          />
        )}
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Impacto',       value: `${risk.impact}/5`       },
          { label: 'Probabilidade', value: `${risk.probability}/5`  },
          { label: 'Score',         value: String(score)             },
          { label: 'Status',        value: risk.status               },
        ].map(k => (
          <div key={k.label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', border: '1px solid #e9ecf0' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '15px' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Mitigação */}
      {risk.mitigation && (
        <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', padding: '18px 20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Plano de mitigação</div>
          <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{risk.mitigation}</p>
        </div>
      )}

      {/* Origens N:M */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F3A', margin: 0 }}>
            Origens ({risk.sources.length})
          </h2>
          {risk.sources.length >= 3 && (
            <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
              Alta convergência
            </span>
          )}
        </div>
        {risk.sources.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Nenhuma origem registrada.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {risk.sources.map(s => (
              <span key={s.id} style={{
                background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px',
                padding: '5px 12px', fontSize: '12px', color: '#475569', fontWeight: 500,
              }}>
                {SOURCE_LABELS[s.sourceEntityType] ?? s.sourceEntityType}
                <span style={{ color: '#94a3b8', marginLeft: '4px' }}>({s.sourceModule})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Change Plan Items */}
      {risk.changePlanItems.length > 0 && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F3A', margin: '0 0 12px' }}>
            Ações do plano vinculadas ({risk.changePlanItems.length})
          </h2>
          <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', overflow: 'hidden' }}>
            {risk.changePlanItems.map((item, i) => (
              <div key={item.id} style={{
                padding: '12px 16px',
                borderBottom: i < risk.changePlanItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0B1F3A' }}>{item.description}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{item.lever}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '60px', height: '4px', background: '#e9ecf0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pctComplete}%`, background: '#0B1F3A', borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{item.pctComplete}%</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, borderRadius: '4px', padding: '2px 7px',
                    background: item.status === 'DONE' ? '#dcfce7' : item.status === 'CANCELLED' ? '#f1f5f9' : '#fef3c7',
                    color:      item.status === 'DONE' ? '#166534' : item.status === 'CANCELLED' ? '#94a3b8' : '#92400e',
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
