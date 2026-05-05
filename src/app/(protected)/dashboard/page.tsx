import { redirect } from 'next/navigation'
import { getSession } from '@/core/auth/session'
import { logoutAction } from '@/actions/auth'

export const metadata = { title: 'Dashboard — Collab Engine' }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Olá, <strong>{session.email}</strong> ({session.role})
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-red-600 underline underline-offset-2"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
