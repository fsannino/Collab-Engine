'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { loginSchema } from '@/lib/definitions'
import { prisma } from '@/core/prisma/client'
import { verifyPassword } from '@/core/auth/password'
import { createSession, destroySession } from '@/core/auth/session'
import { checkRateLimit, recordLoginAttempt } from '@/core/auth/rate-limit'

type LoginState = {
  ok: boolean
  error?: string
  issues?: Record<string, string[]>
}

export async function loginAction(_prev: unknown, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors }
  }

  const { email, password } = parsed.data
  const headerStore = await headers()
  const ipAddress = headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? undefined
  const userAgent = headerStore.get('user-agent') ?? undefined

  const allowed = await checkRateLimit(email)
  if (!allowed) {
    return { ok: false, error: 'Muitas tentativas. Tente novamente em 5 minutos.' }
  }

  const user = await prisma.user.findFirst({
    where: { email, active: true, deletedAt: null },
  })

  if (!user?.passwordHash) {
    await recordLoginAttempt(email, false, undefined, ipAddress, userAgent)
    return { ok: false, error: 'Credenciais inválidas' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await recordLoginAttempt(email, false, user.id, ipAddress, userAgent)
    return { ok: false, error: 'Credenciais inválidas' }
  }

  await recordLoginAttempt(email, true, user.id, ipAddress, userAgent)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession({ userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role })

  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/login')
}
