import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { computeProjectRoi, upsertFinancialAction } from '@/modules/financial/financial.actions'

export const metadata = { title: 'ROI do Projeto — Collab Engine' }

function fmt(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

const CATEGORY_LABELS: Record<string, string> = {
  CONSULTING: 'Consultoria', LICENSE: 'Licenças', INTERNAL_HOURS: 'Horas internas',
  COMMUNICATION: 'Comunicação', INFRASTRUCTURE: 'Infraestrutura',
  OPPORTUNITY_COST: 'Custo de oportunidade', PRODUCTIVITY_GAIN: 'Ganho de produtividade',
  TURNOVER_REDUCTION: 'Redução de turnover', REVENUE_INCREASE: 'Aumento de receita',
  REWORK_REDUCTION: 'Redução de retrabalho', OTHER: 'Outro',
}

export default async function RoiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!project) redirect('/projects')

  const [roi, entries] = await Promise.all([
    computeProjectRoi(projectId, session.tenantId),
    prisma.financialAction.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null },
      orderBy: [{ type: 'asc' }, { occurredAt: 'desc' }],
    }),
  ])

  async function addEntryAction(formData: FormData) {
    'use server'
    formData.set('projectId', projectId)
    await upsertFinancialAction(formData)
  }

  const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' } as const
  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' } as const

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>{project.name}</Link> / ROI
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Retorno sobre Investimento
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Custos e benefícios da gestão de mudança — calculados no servidor.
        </p>
      </div>

      {/* KPIs ROI — calculados no servidor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
        {[
          {
            label: 'Custo total (projetado)',
            value: fmt(roi.totalCost),
            sub: `Realizado: ${fmt(roi.realizedCost)}`,
            color: '#dc2626',
          },
          {
            label: 'Benefício total (projetado)',
            value: fmt(roi.totalBenefit),
            sub: `Realizado: ${fmt(roi.realizedBenefit)}`,
            color: '#166534',
          },
          {
            label: 'ROI projetado',
            value: roi.roiPct !== null ? `${roi.roiPct.toFixed(1)}%` : 'N/A',
            sub: roi.realizedRoiPct !== null ? `Realizado: ${roi.realizedRoiPct.toFixed(1)}%` : 'Sem dados realizados',
            color: (roi.roiPct ?? 0) >= 0 ? '#166534' : '#dc2626',
          },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '32px', fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 400, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B1F3A', marginTop: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Valor líquido */}
      {roi.entriesCount > 0 && (
        <div style={{
          background: (roi.netValue >= 0) ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${roi.netValue >= 0 ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '10px', padding: '16px 20px', marginBottom: '32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: roi.netValue >= 0 ? '#166534' : '#991b1b' }}>
            Valor líquido projetado
          </span>
          <span style={{ fontSize: '24px', fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 400, color: roi.netValue >= 0 ? '#166534' : '#991b1b' }}>
            {fmt(roi.netValue)}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
        {/* Formulário de nova entrada */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F3A', margin: '0 0 16px' }}>Registrar entrada</h2>
          <form action={addEntryAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', padding: '20px' }}>
            <div>
              <label style={labelStyle}>Tipo *</label>
              <select name="type" required style={inputStyle}>
                <option value="COST">Custo</option>
                <option value="BENEFIT">Benefício</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Categoria *</label>
              <select name="category" required style={inputStyle}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Valor (BRL) *</label>
                <input name="amount" type="number" step="0.01" min="0" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Data *</label>
                <input name="occurredAt" type="date" required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Probabilidade de realização (%)</label>
              <input name="probabilityPct" type="number" min="0" max="100" placeholder="100" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Descrição</label>
              <input name="description" type="text" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="isBudgeted" value="false" id="realized" />
              <label htmlFor="realized" style={{ fontSize: '12px', color: '#374151' }}>Valor já realizado (não orçado)</label>
            </div>
            <button type="submit" style={{
              background: '#0B1F3A', color: '#fff', border: 'none', borderRadius: '7px',
              padding: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
              Adicionar entrada
            </button>
          </form>
        </div>

        {/* Tabela de entradas */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F3A', margin: '0 0 16px' }}>
            Entradas ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Nenhuma entrada registrada ainda.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', overflow: 'hidden', maxHeight: '480px', overflowY: 'auto' }}>
              {entries.map((e, i) => (
                <div key={e.id} style={{
                  padding: '10px 14px',
                  borderBottom: i < entries.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#0B1F3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {CATEGORY_LABELS[e.category] ?? e.category}
                    </div>
                    {e.description && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{e.description.slice(0, 40)}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: e.type === 'COST' ? '#dc2626' : '#166534' }}>
                      {e.type === 'COST' ? '−' : '+'}{fmt(e.amount, e.currency)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{!e.isBudgeted ? 'realizado' : 'orçado'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
