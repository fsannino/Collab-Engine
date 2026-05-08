import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createRiskAction } from '@/modules/risk/risk.actions'
import Link from 'next/link'

export const metadata = { title: 'Novo Risco — Collab:Evolve' }

export default async function NewRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!project) redirect('/projects')

  async function action(formData: FormData) {
    'use server'
    formData.set('projectId', projectId)
    const result = await createRiskAction(formData)
    if ('riskId' in result) {
      redirect(`/projects/${projectId}/risks/${result.riskId}`)
    }
  }

  const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' } as const
  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '7px', padding: '8px 12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' } as const

  return (
    <div style={{ padding: '40px 44px', maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}/risks`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>Risk Log</Link> / Novo
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '28px', fontWeight: 400, color: '#0B1F3A', margin: 0 }}>
          Registrar risco
        </h1>
      </div>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label htmlFor="description" style={labelStyle}>Descrição do risco *</label>
          <textarea
            id="description" name="description" required rows={4}
            placeholder="Descreva o risco de forma clara e objetiva…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label htmlFor="impact" style={labelStyle}>Impacto (1–5) *</label>
            <select id="impact" name="impact" required style={inputStyle}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Mínimo','Baixo','Médio','Alto','Crítico'][n-1]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="probability" style={labelStyle}>Probabilidade (1–5) *</label>
            <select id="probability" name="probability" required style={inputStyle}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Muito baixa','Baixa','Média','Alta','Muito alta'][n-1]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="mitigation" style={labelStyle}>Plano de mitigação</label>
          <textarea
            id="mitigation" name="mitigation" rows={3}
            placeholder="Como o risco será mitigado ou monitorado…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label htmlFor="sourceEntityType" style={labelStyle}>Origem</label>
            <select id="sourceEntityType" name="sourceEntityType" style={inputStyle}>
              <option value="MANUAL">Manual</option>
              <option value="HISTORY_ASSESSMENT">History Assessment</option>
              <option value="CULTURE_DIMENSION">Dimensão Cultural</option>
              <option value="GAP_ANALYSIS">Gap Analysis</option>
              <option value="CHANGE_IMPACT">Impacto de Mudança</option>
              <option value="PROJECT_INITIATION">Iniciação do Projeto</option>
            </select>
          </div>
          <div>
            <label htmlFor="dueAt" style={labelStyle}>Prazo limite</label>
            <input id="dueAt" name="dueAt" type="date" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button type="submit" style={{
            background: '#0B1F3A', color: '#fff', border: 'none', borderRadius: '7px',
            padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>
            Registrar risco
          </button>
          <Link href={`/projects/${projectId}/risks`} style={{
            color: '#64748b', textDecoration: 'none', padding: '10px 16px', fontSize: '14px',
          }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
