import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers before importing session
const mockCookies = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}))

// Mock env
vi.mock('@/core/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-that-is-32-chars-long!!',
    COOKIE_NAME: 'collab_session',
    COOKIE_DOMAIN: '',
    NODE_ENV: 'test',
  },
}))

import { createSession, getSession, destroySession } from '@/core/auth/session'
import { SignJWT } from 'jose'

const SECRET = new TextEncoder().encode('test-secret-that-is-32-chars-long!!')

const basePayload = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  email: 'test@example.com',
  role: 'ADMIN' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSession', () => {
  it('sets an httpOnly cookie with a signed JWT', async () => {
    await createSession(basePayload)
    expect(mockCookies.set).toHaveBeenCalledOnce()
    const call = mockCookies.set.mock.calls[0]!
    const [name, , options] = call
    expect(name).toBe('collab_session')
    expect(options.httpOnly).toBe(true)
    expect(options.path).toBe('/')
  })
})

describe('getSession', () => {
  it('returns payload for a valid token', async () => {
    const token = await new SignJWT(basePayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(SECRET)

    mockCookies.get.mockReturnValue({ value: token })

    const session = await getSession()
    expect(session?.userId).toBe('user-1')
    expect(session?.email).toBe('test@example.com')
  })

  it('returns null when cookie is missing', async () => {
    mockCookies.get.mockReturnValue(undefined)
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const token = await new SignJWT(basePayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('-1s')
      .sign(SECRET)

    mockCookies.get.mockReturnValue({ value: token })

    const session = await getSession()
    expect(session).toBeNull()
  })

  it('returns null for an invalid token', async () => {
    mockCookies.get.mockReturnValue({ value: 'not.a.jwt' })
    const session = await getSession()
    expect(session).toBeNull()
  })
})

describe('destroySession', () => {
  it('deletes the session cookie', async () => {
    await destroySession()
    expect(mockCookies.delete).toHaveBeenCalledWith('collab_session')
  })
})
