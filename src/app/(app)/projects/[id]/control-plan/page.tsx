import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { recordMeasurementAction as _recordMeasurementAction } from '@/modules/control-plan/control-plan.actions'

export const metadata = { title: 'Plano de Controle — Collab:Evolve' }

const RAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  GREEN: { bg: '#dcfce7', color: '#166534', label: 'Verde'     },
  AMBER: { bg: '#fef9c3', color: '#854d0e', label: 'Amarelo'   },
  RED:   { bg: '#fee2e2', color: '#991b1b', label: 'Vermelho'  },
}
const RAG_NULL = { bg: '#f1f5f9', color: '#94a3b8', label: 'Aguardando' }

const FREQUENCY_LABEL: Record<string, string> = {
  DAILY:     'Diário',
  WEEKLY:    'Semanal',
  BIWEEKLY:  'Quinzenal',
  MONTHLY:   'Mensal',
  QUARTERLY: 'Trimestral',
}

export default async function ControlPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!project) redirect('/projects')

  const items = await prisma.controlPlanItem.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  async function recordMeasurement(formData: FormData) {
    'use server'
    await _recordMeasurementAction(formData)
  }

  const total  = items.length
  const green  = items.filter(i => i.statusRag === 'GREEN').length
  const red    = items.filter(i => i.statusRag === 'RED').length

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>
            {project.name}
          </Link>
          {' / '}Plano de Controle
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Plano de Controle
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Controles permanentes de sustentação pós go-live.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total controles', value: total, color: '#0B1F3A' },
          { label: 'Verdes',          value: green, color: '#16a34a' },
          { label: 'Vermelhos',       value: red,   color: '#dc2626' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '32px', fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 400, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Link
          href={`/projects/${projectId}/control-plan/new`}
          style={{ background: '#0B1F3A', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
        >
          + Novo controle
        </Link>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
          Nenhum controle cadastrado ainda.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecf0' }}>
                {['Controle', 'Métrica', 'Frequência', 'Última medição', 'RAG', 'Faixa (low–high)', 'Registrar medição'].map(h => (
                  <th
                    key={h}
                    style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const rag = item.statusRag ? (RAG_STYLE[item.statusRag] ?? RAG_NULL) : RAG_NULL
                const thresholdDisplay =
                  item.thresholdLow !== null || item.thresholdHigh !== null
                    ? `${item.thresholdLow ?? '—'} – ${item.thresholdHigh ?? '—'}`
                    : '—'

                return (
                  <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                      <div style={{ fontWeight: 600, color: '#0B1F3A', lineHeight: 1.4 }}>
                        {item.controlName}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', maxWidth: '160px', fontSize: '12px' }}>
                      {item.metricMonitored}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {FREQUENCY_LABEL[item.frequency] ?? item.frequency}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#0B1F3A', whiteSpace: 'nowrap' }}>
                      {item.lastMeasurement !== null
                        ? <>
                            <span style={{ fontWeight: 600 }}>{item.lastMeasurement}</span>
                            {item.lastMeasuredAt && (
                              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                                {new Date(item.lastMeasuredAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </>
                        : <span style={{ color: '#cbd5e1' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: rag.bg, color: rag.color, borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {rag.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
                      {thresholdDisplay}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {/* Inline measurement form */}
                      <form action={recordMeasurement} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <input
                          name="lastMeasurement"
                          type="number"
                          step="any"
                          placeholder="Valor"
                          required
                          style={{ width: '80px', border: '1px solid #e9ecf0', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', color: '#0B1F3A' }}
                        />
                        <button
                          type="submit"
                          style={{ fontSize: '11px', background: '#1a6e8e', color: '#fff', border: 'none', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          Registrar
                        </button>
                      </form>
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
