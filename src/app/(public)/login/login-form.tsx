'use client'

import { useActionState } from 'react'
import { loginAction } from '@/actions/auth'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border rounded px-3 py-2 text-sm"
        />
        {state?.issues?.email && (
          <span className="text-red-600 text-xs">{state.issues.email[0]}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border rounded px-3 py-2 text-sm"
        />
        {state?.issues?.password && (
          <span className="text-red-600 text-xs">{state.issues.password[0]}</span>
        )}
      </div>

      {state?.error && (
        <p className="text-red-600 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
