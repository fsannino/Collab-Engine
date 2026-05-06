import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { env } from '@/core/config/env'
import type { UserRole } from '@prisma/client'

export type SessionPayload = {
  userId: string
  tenantId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

const SECRET = new TextEncoder().encode(env.JWT_SECRET)
const SESSION_DURATION_HOURS = 8

export async function createSession(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
): Promise<void> {
  const token = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(env.COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(env.COOKIE_NAME)
}
