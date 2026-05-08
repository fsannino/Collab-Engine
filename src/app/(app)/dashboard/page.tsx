import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Dashboard — Collab Engine' }

const modules = [
  {
    href: '/people',
    label: 'Pessoas',
    description: 'Cadastro e gestão de colaboradores',
    icon: '👤',
  },
  {
    href: '/cargos',
    label: 'Cargos',
    description: 'Estrutura de cargos da organização',
    icon: '🏷️',
  },
  {
    href: '/funcoes',
    label: 'Funções',
    description: 'Funções e papéis nos processos',
    icon: '⚙️',
  },
  {
    href: '/training/plans',
    label: 'Planos de Treinamento',
    description: 'M5 — Orquestração de treinamentos e capacitação',
    icon: '📚',
  },
]

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Dashboard</h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 0 14px' }}>
          Bem-vindo, <strong style={{ color: '#0f2244' }}>{session.email}</strong>
        </p>
      </div>

      {/* Section */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
          Módulos disponíveis
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              style={{
                display: 'block',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '20px',
                textDecoration: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseOver={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.borderColor = '#c9a227'
                el.style.boxShadow = '0 4px 12px rgba(201,162,39,0.12)'
              }}
              onMouseOut={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.borderColor = '#e2e8f0'
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{mod.icon}</div>
              <div style={{ fontWeight: 600, color: '#0f2244', fontSize: '14px', marginBottom: '4px' }}>{mod.label}</div>
              <div style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5 }}>{mod.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
