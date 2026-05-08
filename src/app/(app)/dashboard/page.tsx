import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MetricCard } from './_metric-card'

export const metadata = { title: 'Painel — Collab:Evolve' }

// Accent colors cycling: navy, gold, navy, gold…
const ACCENTS = ['#0B1F3A', '#c9a227', '#0B1F3A', '#c9a227', '#0B1F3A', '#c9a227']
const BADGE_BG = ['rgba(11,31,58,0.10)', 'rgba(201,162,39,0.15)', 'rgba(11,31,58,0.10)', 'rgba(201,162,39,0.15)', 'rgba(11,31,58,0.10)', 'rgba(201,162,39,0.15)']
const BADGE_COLOR = ['#0B1F3A', '#92710f', '#0B1F3A', '#92710f', '#0B1F3A', '#92710f']

function pad(n: number) { return String(n).padStart(2, '0') }

type ModuleCard = {
  href: string
  label: string
  description: string
  count: number
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch all counts in parallel
  const [
    projetos,
    pessoas,
    impactosAbertos,
    trainingStats,
    culturais,
    liderancas,
  ] = await Promise.all([
    prisma.project.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
    prisma.pessoa.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
    prisma.changeImpact.count({ where: { tenantId: session.tenantId, deletedAt: null, status: { in: ['ACTIVE', 'MITIGATING'] } } }),
    prisma.pessoaTreinamento.groupBy({
      by: ['status'],
      where: { trainingItem: { plan: { project: { tenantId: session.tenantId }, deletedAt: null }, deletedAt: null }, deletedAt: null },
      _count: { id: true },
    }),
    prisma.avaliacaoCultura.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
    prisma.lideranca.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
  ])

  const totalTreinos = trainingStats.reduce((s, g) => s + g._count.id, 0)
  const concluidos   = trainingStats.find((g) => g.status === 'CONCLUIDO')?._count.id ?? 0
  const coveragePct  = totalTreinos > 0 ? Math.round((concluidos / totalTreinos) * 100) : 0

  const cards: ModuleCard[] = [
    { href: '/projects',       label: 'Projetos',         description: 'Projetos de mudança ativos.',        count: projetos         },
    { href: '/people',         label: 'Pessoas',           description: 'Colaboradores cadastrados.',         count: pessoas          },
    { href: '/projects',       label: 'Impactos Abertos',  description: 'Impactos em análise ou mitigação.', count: impactosAbertos  },
    { href: '/training/plans', label: 'Cobertura',         description: `Treinamentos concluídos (${concluidos}/${totalTreinos}).`, count: coveragePct },
    { href: '/cultura',        label: 'Avaliações OCAI',   description: 'Diagnósticos culturais realizados.', count: culturais        },
    { href: '/lideranca',      label: 'Líderes',           description: 'Líderes com avaliação ADKAR.',       count: liderancas       },
  ]

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1100px' }}>

      {/* ── Section header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '10px' }}>
          Visão Geral
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: '36px',
          fontWeight: 400,
          color: '#0B1F3A',
          margin: '0 0 10px',
          lineHeight: 1.15,
        }}>
          Painel de Mudança
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.6, maxWidth: '520px' }}>
          Acompanhe os indicadores-chave da gestão de mudança organizacional. Cada bloco abre o módulo correspondente.
        </p>
        {/* Gold decorative bar */}
        <div style={{ width: '120px', height: '3px', background: 'linear-gradient(90deg, #c9a227 0%, #1a6e8e 100%)', borderRadius: '2px' }} />
      </div>

      {/* ── Card grid (3 × 2) ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {cards.map((card, i) => (
          <MetricCard
            key={card.href + i}
            href={card.href}
            accent={ACCENTS[i]!}
            badgeBg={BADGE_BG[i]!}
            badgeColor={BADGE_COLOR[i]!}
            badge={pad(i + 1)}
            metric={i === 3 ? `${card.count}%` : card.count}
            label={card.label}
            description={card.description}
          />
        ))}
      </div>

      {/* ── Quick links row ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #e9ecf0', paddingTop: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '14px' }}>
          Acesso rápido
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { href: '/areas',          label: 'Áreas'          },
            { href: '/cargos',         label: 'Cargos'         },
            { href: '/funcoes',        label: 'Funções'        },
            { href: '/macroprocessos', label: 'Macroprocessos' },
            { href: '/processos',      label: 'Processos'      },
            { href: '/bridge/dashboard', label: 'Cross-Sistema' },
            { href: '/cmo',            label: 'CMO'            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#475569',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 14px',
                textDecoration: 'none',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
