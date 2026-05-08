import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Dashboard — Collab Engine' }

const modules = [
  { href: '/people', label: 'Pessoas', description: 'Cadastro de pessoas e colaboradores' },
  { href: '/cargos', label: 'Cargos', description: 'Estrutura de cargos da organização' },
  { href: '/funcoes', label: 'Funções', description: 'Funções e papéis nos processos' },
  { href: '/training/plans', label: 'Planos de Treinamento', description: 'M5 — Orquestração de treinamentos' },
]

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bem-vindo, <strong>{session.email}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <h2 className="font-semibold text-slate-800 mb-1">{mod.label}</h2>
            <p className="text-sm text-slate-500">{mod.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
