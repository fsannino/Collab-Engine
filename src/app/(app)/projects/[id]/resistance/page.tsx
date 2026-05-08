import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Gestão de Resistências — Collab:Evolve' }

const INTENSITY_STYLE = {
  LOW:      { bg: '#f1f5f9', color: '#475569', label: 'Baixa'    },
  MEDIUM:   { bg: '#fef9c3', color: '#854d0e', label: 'Média'    },
  HIGH:     { bg: '#ffedd5', color: '#9a3412', label: 'Alta'     },
  CRITICAL: { bg: '#fee2e2', color: '#991b1b', label: 'Crítica'  },
} as const

const STATUS_LABEL: Record<string, string> = {
  IDENTIFIED:      'Identificada',
  BEING_ADDRESSED: 'Em endereçamento',
  RESOLVED:        'Resolvida',
  ACCEPTED:        'Aceita',
}

export default async function ResistancePage({
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

  const items = await prisma.resistanceItem.findMany({
    where: { projectId, tenantId: session.tenantId, deletedAt: null },
    include: { stakeholder: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const total          = items.length
  const beingAddressed = items.filter(i => i.status === 'BEING_ADDRESSED').length
  const critical       = items.filter(i => i.intensity === 'CRITICAL').length

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>
            {project.name}
          </Link>
          {' / '}Gestão de Resistências
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Gestão de Resistências
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Registre e monitore resistências por stakeholder.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total',            value: total,          color: '#0B1F3A' },
          { label: 'Em endereçamento', value: beingAddressed, color: '#d97706' },
          { label: 'Críticos',         value: critical,       color: '#dc2626' },
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
          href={`/projects/${projectId}/resistance/new`}
          style={{ background: '#0B1F3A', color: '#fff', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
        >
          + Nova resistência
        </Link>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
          Nenhuma resistência registrada ainda.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecf0' }}>
                {['Descrição', 'Intensidade', 'Status', 'Stakeholder', 'Ações'].map(h => (
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
                const is = INTENSITY_STYLE[item.intensity as keyof typeof INTENSITY_STYLE] ?? INTENSITY_STYLE.MEDIUM
                return (
                  <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 14px', maxWidth: '340px' }}>
                      <div style={{ fontWeight: 500, color: '#0B1F3A', lineHeight: 1.4 }}>
                        {item.description.length > 90 ? item.description.slice(0, 90) + '…' : item.description}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: is.bg, color: is.color, borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {is.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12px' }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                      {item.stakeholder ? item.stakeholder.name : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link
                        href={`/projects/${projectId}/resistance/${item.id}`}
                        style={{ fontSize: '12px', color: '#1a6e8e', textDecoration: 'none', fontWeight: 500 }}
                      >
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
