import { redirect } from 'next/navigation'
import { getSession } from '@/core/auth/session'
import { logoutAction } from '@/actions/auth'
import { SidebarNav } from './_sidebar-nav'

// 4-square logo matching XPROC style
function BrandMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1"  y="1"  width="13" height="13" rx="2" fill="#0f2244" />
      <rect x="17" y="1"  width="13" height="13" rx="2" fill="#1a4a7a" />
      <rect x="1"  y="17" width="13" height="13" rx="2" fill="#c9a227" />
      <rect x="17" y="17" width="13" height="13" rx="2" fill="rgba(201,162,39,0.45)" />
    </svg>
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const initials = (session.email ?? '?').charAt(0).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f9', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: '248px',
        flexShrink: 0,
        background: '#0B1F3A',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BrandMark />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>Collab:Evolve</div>
            <div style={{ color: '#c9a227', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '3px', fontWeight: 600 }}>Mudança &amp; Governança</div>
          </div>
        </div>

        {/* Nav — client component for active state */}
        <SidebarNav />

        {/* User + logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#c9a227', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#0B1F3A', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.email}
              </div>
              <div style={{ color: '#c9a227', fontSize: '10px', letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase', marginTop: '1px' }}>
                {session.role}
              </div>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)', borderRadius: '5px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'all 0.15s' }}
            >
              Sair
            </button>
          </form>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', textAlign: 'center', marginTop: '12px' }}>© 2026 CollabZ</div>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <header style={{
          height: '52px',
          background: '#fff',
          borderBottom: '1px solid #e9ecf0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 32px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Olá, <strong style={{ color: '#0B1F3A' }}>{session.email?.split('@')[0] ?? 'usuário'}</strong></span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0B1F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#c9a227' }}>
              {initials}
            </div>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
