import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { computeRiskSeverity, getRiskZone } from '@/modules/risk/risk.actions'

export const metadata = { title: 'Risk Log — Collab Engine' }

const ZONE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  GREEN:  { bg: '#dcfce7', color: '#166534', label: 'Verde'    },
  YELLOW: { bg: '#fef9c3', color: '#854d0e', label: 'Amarelo'  },
  ORANGE: { bg: '#ffedd5', color: '#9a3412', label: 'Laranja'  },
  RED:    { bg: '#fee2e2', color: '#991b1b', label: 'Crítico'  },
}
const DEFAULT_ZONE = { bg: '#f1f5f9', color: '#475569', label: 'N/A' }

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberto', MITIGATING: 'Mitigando', CLOSED: 'Fechado', ACCEPTED: 'Aceito',
}

export default async function RiskLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!project) redirect('/projects')

  const risks = await prisma.risk.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    include: { sources: { select: { id: true, sourceModule: true, sourceEntityType: true } } },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  // Agregar KPIs no servidor
  const open      = risks.filter(r => r.status !== 'CLOSED').length
  const critical  = risks.filter(r => getRiskZone(computeRiskSeverity(r.impact, r.probability)) === 'RED' && r.status !== 'CLOSED').length
  const mitigating = risks.filter(r => r.status === 'MITIGATING').length

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>{project.name}</Link>
          {' / '}Risk Log
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Risk Log
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Registro central de riscos do projeto com rastreamento de origens (N:M).
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Em aberto', value: open,       color: '#0B1F3A' },
          { label: 'Mitigando', value: mitigating,  color: '#d97706' },
          { label: 'Críticos',  value: critical,    color: '#dc2626' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '32px', fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 400, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Link href={`/projects/${projectId}/risks/new`} style={{
          background: '#0B1F3A', color: '#fff', padding: '8px 18px', borderRadius: '7px',
          fontSize: '13px', fontWeight: 600, textDecoration: 'none',
        }}>
          + Novo risco
        </Link>
      </div>

      {/* Table */}
      {risks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
          Nenhum risco registrado ainda.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecf0' }}>
                {['Risco', 'Imp × Prob', 'Score', 'Zona', 'Origens', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.map((risk, i) => {
                const score = computeRiskSeverity(risk.impact, risk.probability)
                const zone  = getRiskZone(score)
                const zs    = ZONE_STYLE[zone] ?? DEFAULT_ZONE
                return (
                  <tr key={risk.id} style={{ borderBottom: i < risks.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 14px', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 500, color: '#0B1F3A', lineHeight: 1.4 }}>{risk.description.slice(0, 80)}{risk.description.length > 80 ? '…' : ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace' }}>{risk.impact} × {risk.probability}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0B1F3A', fontFamily: 'monospace' }}>{score}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: zs.bg, color: zs.color, borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {zs.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      <span title={risk.sources.map(s => s.sourceEntityType).join(', ')}>
                        {risk.sources.length} origem{risk.sources.length !== 1 ? 'ns' : ''}
                        {risk.sources.length >= 3 && <span style={{ marginLeft: '6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>alta convergência</span>}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{STATUS_LABEL[risk.status] ?? risk.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/projects/${projectId}/risks/${risk.id}`} style={{ fontSize: '12px', color: '#1a6e8e', textDecoration: 'none', fontWeight: 500 }}>
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
