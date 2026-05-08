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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800">
          <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M10 6L14 8.5V13.5L10 16L6 13.5V8.5L10 6Z" fill="white" fillOpacity="0.3"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">Collab Engine</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-slate-800 px-4 py-4 space-y-1">
          <p className="text-xs text-slate-400 truncate">{session.email}</p>
          <p className="text-xs text-slate-600 uppercase tracking-wide">{session.role}</p>
          <form action={logoutAction} className="pt-1">
            <button
              type="submit"
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
