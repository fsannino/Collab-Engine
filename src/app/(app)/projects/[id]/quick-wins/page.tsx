import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Quick Wins — Collab Engine' }

type QuickWinStatus = 'BACKLOG' | 'IN_PROGRESS' | 'DONE' | 'DROPPED'

const COLUMNS: { key: QuickWinStatus; label: string; headerBg: string; headerColor: string }[] = [
  { key: 'BACKLOG',     label: 'Backlog',      headerBg: '#f1f5f9', headerColor: '#475569' },
  { key: 'IN_PROGRESS', label: 'Em andamento', headerBg: '#fef3c7', headerColor: '#92400e' },
  { key: 'DONE',        label: 'Concluídas',   headerBg: '#dcfce7', headerColor: '#166534' },
]

function Stars({ count }: { count: number }) {
  return (
    <span style={{ color: '#c9a227', fontSize: '13px' }}>
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  )
}

export default async function QuickWinsPage({
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

  const items = await prisma.quickWin.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    orderBy: [{ status: 'asc' }, { impact: 'desc' }],
  })

  const total      = items.length
  const done       = items.filter(i => i.status === 'DONE').length
  const inProgress = items.filter(i => i.status === 'IN_PROGRESS').length

  const grouped: Record<QuickWinStatus, typeof items> = {
    BACKLOG:     items.filter(i => i.status === 'BACKLOG'),
    IN_PROGRESS: items.filter(i => i.status === 'IN_PROGRESS'),
    DONE:        items.filter(i => i.status === 'DONE'),
    DROPPED:     items.filter(i => i.status === 'DROPPED'),
  }

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>
            {project.name}
          </Link>
          {' / '}Quick Wins
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Quick Wins
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Vitórias rápidas para gerar momentum na mudança.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total',         value: total,      color: '#0B1F3A' },
          { label: 'Concluídas',    value: done,       color: '#16a34a' },
          { label: 'Em andamento',  value: inProgress, color: '#d97706' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '32px', fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 400, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <Link
          href={`/projects/${projectId}/quick-wins/new`}
          style={{ background: '#0B1F3A', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
        >
          + Nova quick win
        </Link>
      </div>

      {/* Kanban grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {COLUMNS.map(col => {
          const colItems = grouped[col.key]
          return (
            <div key={col.key} style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Column header */}
              <div style={{ background: col.headerBg, color: col.headerColor, padding: '10px 16px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{col.label}</span>
                <span style={{ background: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>{colItems.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '120px' }}>
                {colItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#cbd5e1', fontSize: '13px' }}>
                    Nenhum item
                  </div>
                ) : (
                  colItems.map(item => (
                    <div
                      key={item.id}
                      style={{ background: '#f8fafc', border: '1px solid #e9ecf0', borderRadius: '8px', padding: '12px 14px' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0B1F3A', marginBottom: '8px', lineHeight: 1.4 }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: item.targetDate ? '6px' : '0' }}>
                        <Stars count={item.impact} />
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          esforço: {item.effort}/5
                        </span>
                      </div>
                      {item.targetDate && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          Prazo: {new Date(item.targetDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
