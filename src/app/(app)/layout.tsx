import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/core/auth/session'
import { logoutAction } from '@/actions/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/people', label: 'Pessoas' },
  { href: '/cargos', label: 'Cargos' },
  { href: '/funcoes', label: 'Funções' },
  { href: '/training/plans', label: 'Treinamentos' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f9' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: '#0f2244',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '28px', height: '28px',
            background: '#c9a227',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M10 6L14 8.5V13.5L10 16L6 13.5V8.5L10 6Z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', lineHeight: 1.2 }}>Collab Engine</div>
            <div style={{ color: '#c9a227', fontSize: '10px', letterSpacing: '0.05em', marginTop: '2px' }}>CollabZ</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '9px 12px',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.72)',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                marginBottom: '2px',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,162,39,0.12)'
                ;(e.currentTarget as HTMLAnchorElement).style.color = '#fff'
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.72)'
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 20px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.email}
          </div>
          <div style={{ color: '#c9a227', fontSize: '10px', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px' }}>
            {session.role}
          </div>
          <form action={logoutAction}>
            <button type="submit" style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
