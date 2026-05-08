import { redirect } from 'next/navigation'
import { getSession } from '@/core/auth/session'
import LoginForm from './login-form'

export const metadata = { title: 'Login — Collab:Evolve' }

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M10 6L14 8.5V13.5L10 16L6 13.5V8.5L10 6Z" fill="white" fillOpacity="0.3"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Collab:Evolve</span>
        </div>

        {/* Central content */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span className="text-blue-300 text-xs font-medium tracking-wide uppercase">Framework IPCO</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Orquestre a mudança.<br />
              <span className="text-blue-400">Garanta a adoção.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Stakeholders, impactos, treinamentos e governança integrados em uma única plataforma.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['M2 Stakeholder', 'M3 Impacto', 'M5 Treinamento', 'OCM'].map((tag) => (
              <span key={tag} className="text-xs text-slate-400 border border-slate-700 rounded-full px-3 py-1">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} CollabZ Consultoria</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <span className="text-slate-900 font-semibold text-lg">Collab:Evolve</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
            <p className="text-sm text-slate-500">Entre com as suas credenciais para continuar</p>
          </div>

          <LoginForm />

          <p className="text-center text-xs text-slate-400">
            CollabZ Consultoria &middot; Uso interno
          </p>
        </div>
      </div>
    </main>
  )
}
