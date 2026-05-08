import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { upsertExitChecklistAction as _upsertExitChecklistAction } from '@/modules/exit-checklist/exit-checklist.actions'

export const metadata = { title: 'Exit Strategy Checklist — Collab Engine' }

const STATUS_STYLE = {
  PENDING:   { bg: '#f1f5f9', color: '#475569', label: 'Pendente'    },
  IN_REVIEW: { bg: '#fef9c3', color: '#854d0e', label: 'Em revisão'  },
  APPROVED:  { bg: '#dcfce7', color: '#166534', label: 'Aprovado'    },
  WAIVED:    { bg: '#e0f2fe', color: '#0369a1', label: 'Dispensado'  },
} as const

const STATUS_OPTIONS = ['PENDING', 'IN_REVIEW', 'APPROVED', 'WAIVED'] as const

export default async function ExitChecklistPage({
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

  const items = await prisma.exitChecklistItem.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    orderBy: { order: 'asc' },
  })

  async function updateItemStatus(formData: FormData) {
    'use server'
    await _upsertExitChecklistAction(formData)
  }

  const total    = items.length
  const approved = items.filter(i => i.status === 'APPROVED').length
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>
            {project.name}
          </Link>
          {' / '}Exit Strategy Checklist
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Exit Strategy Checklist
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Critérios para encerramento formal do projeto.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0B1F3A' }}>Aprovação dos critérios</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: progress === 100 ? '#16a34a' : '#0B1F3A' }}>
            {approved} / {total} ({progress}%)
          </span>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              background: progress === 100 ? '#16a34a' : progress >= 60 ? '#c9a227' : '#1a6e8e',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Link
          href={`/projects/${projectId}/exit-checklist/new`}
          style={{ background: '#0B1F3A', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
        >
          + Adicionar critério
        </Link>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
          Nenhum critério de encerramento adicionado ainda.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecf0' }}>
                {['#', 'Critério', 'Evidência necessária', 'Status', 'Aprovado por', 'Ações'].map(h => (
                  <th
                    key={h}
                    style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const ss = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.PENDING
                return (
                  <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums', width: '40px' }}>
                      {item.order > 0 ? item.order : i + 1}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                      <div style={{ fontWeight: 500, color: '#0B1F3A', lineHeight: 1.4 }}>{item.criterion}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: '220px', fontSize: '12px' }}>
                      {item.evidenceRequired ?? '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {ss.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                      {item.approvedBy ?? '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {/* Inline status update form */}
                      <form action={updateItemStatus} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="criterion" value={item.criterion} />
                        <input type="hidden" name="order" value={item.order} />
                        {item.evidenceRequired && (
                          <input type="hidden" name="evidenceRequired" value={item.evidenceRequired} />
                        )}
                        <select
                          name="status"
                          defaultValue={item.status}
                          style={{ fontSize: '11px', border: '1px solid #e9ecf0', borderRadius: '5px', padding: '3px 6px', color: '#0B1F3A', background: '#fff' }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          style={{ fontSize: '11px', background: '#1a6e8e', color: '#fff', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          OK
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
