import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Portfolio — Collab Engine' }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PLANNING:   { bg: '#f1f5f9', color: '#475569', label: 'Planejamento' },
  ACTIVE:     { bg: '#dcfce7', color: '#166534', label: 'Ativo'        },
  ON_HOLD:    { bg: '#fef3c7', color: '#92400e', label: 'Em espera'    },
  CLOSING:    { bg: '#dbeafe', color: '#1e40af', label: 'Encerrando'   },
  COMPLETED:  { bg: '#e0f2fe', color: '#075985', label: 'Concluído'    },
  ARCHIVED:   { bg: '#f1f5f9', color: '#94a3b8', label: 'Arquivado'    },
}
const DEFAULT_STATUS = { bg: '#f1f5f9', color: '#475569', label: '—' }

function getRagColor(score: number) {
  if (score >= 75) return { color: '#166534', bg: '#dcfce7', label: 'Saudável' }
  if (score >= 50) return { color: '#92400e', bg: '#fef3c7', label: 'Atenção'  }
  return           { color: '#991b1b', bg: '#fee2e2', label: 'Crítico'  }
}

export default async function PortfolioDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Todos os projetos do tenant (não arquivados)
  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId, deletedAt: null, status: { not: 'ARCHIVED' } },
    select: {
      id: true, name: true, status: true, startDate: true, targetEndDate: true,
      _count: {
        select: {
          changeImpacts: { where: { deletedAt: null, status: { in: ['ACTIVE', 'MITIGATING'] } } },
          risks:         { where: { deletedAt: null, status: { not: 'CLOSED' } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Busca treinamentos por projeto
  const trainingByProject = await prisma.pessoaTreinamento.groupBy({
    by: ['status'],
    where: {
      trainingItem: {
        plan: { project: { tenantId: session.tenantId }, deletedAt: null },
        deletedAt: null,
      },
      deletedAt: null,
    },
    _count: { id: true },
  })

  const totalTreinos  = trainingByProject.reduce((s, g) => s + g._count.id, 0)
  const concluidosTre = trainingByProject.find(g => g.status === 'CONCLUIDO')?._count.id ?? 0
  const coveragePct   = totalTreinos > 0 ? Math.round((concluidosTre / totalTreinos) * 100) : 0

  // KPIs globais (servidor computa, nunca cliente)
  const totalProjects   = projects.length
  const activeProjects  = projects.filter(p => p.status === 'ACTIVE').length
  const totalOpenRisks  = projects.reduce((s, p) => s + p._count.risks, 0)
  const totalOpenImpacts = projects.reduce((s, p) => s + p._count.changeImpacts, 0)

  // Health score simplificado por projeto (servidor):
  // 100 - 5 por impacto aberto (max -30) - 5 por risco aberto (max -25)
  function projectHealth(openImpacts: number, openRisks: number) {
    return Math.max(0, 100 - Math.min(openImpacts * 5, 30) - Math.min(openRisks * 5, 25))
  }

  const today = new Date()
  function daysToGo(date: Date | null) {
    if (!date) return null
    return Math.ceil((date.getTime() - today.getTime()) / 86400000)
  }

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          Portfolio
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          Portfolio de Mudança
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>
          Visão consolidada de todos os projetos ativos do tenant.
        </p>
        <div style={{ width: '100px', height: '3px', background: 'linear-gradient(90deg, #c9a227 0%, #1a6e8e 100%)', borderRadius: '2px' }} />
      </div>

      {/* KPIs globais — calculados no servidor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '36px' }}>
        {[
          { label: 'Projetos ativos',   value: activeProjects,    sub: `de ${totalProjects} total`   },
          { label: 'Riscos em aberto',  value: totalOpenRisks,    sub: 'cross-projeto'                },
          { label: 'Impactos abertos',  value: totalOpenImpacts,  sub: 'ACTIVE ou MITIGATING'         },
          { label: 'Cobertura treino',  value: `${coveragePct}%`, sub: `${concluidosTre}/${totalTreinos} concluídos` },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '36px', fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 400, color: '#0B1F3A', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B1F3A', marginTop: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabela de projetos */}
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
          Nenhum projeto ativo. <Link href="/projects/new" style={{ color: '#1a6e8e' }}>Criar projeto →</Link>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecf0' }}>
                {['Projeto', 'Status', 'Health', 'Riscos', 'Impactos', 'Prazo', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const health = projectHealth(p._count.changeImpacts, p._count.risks)
                const rag    = getRagColor(health)
                const ss     = STATUS_STYLE[p.status] ?? DEFAULT_STATUS
                const days   = daysToGo(p.targetEndDate)
                return (
                  <tr key={p.id} style={{ borderBottom: i < projects.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0B1F3A', maxWidth: '260px' }}>
                      <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {p.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>{ss.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e9ecf0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${health}%`, background: rag.color.replace('1b', 'a0'), borderRadius: '3px' }} />
                        </div>
                        <span style={{ background: rag.bg, color: rag.color, borderRadius: '5px', padding: '2px 7px', fontSize: '11px', fontWeight: 600 }}>{health}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: p._count.risks > 0 ? '#dc2626' : '#166534', fontWeight: 600 }}>{p._count.risks}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: p._count.changeImpacts > 0 ? '#d97706' : '#166534', fontWeight: 600 }}>{p._count.changeImpacts}</td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: days !== null && days < 14 ? '#dc2626' : '#64748b' }}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)}d atraso` : `${days}d`}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/projects/${p.id}`} style={{ fontSize: '12px', color: '#1a6e8e', textDecoration: 'none', fontWeight: 500 }}>Abrir →</Link>
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
