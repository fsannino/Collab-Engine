import { redirect } from 'next/navigation'
import { getSession } from '@/core/auth/session'
import LoginForm from './login-form'

export const metadata = { title: 'Login — Collab Engine' }

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold">Collab Engine</h1>
        <LoginForm />
      </div>
    </main>
  )
}
