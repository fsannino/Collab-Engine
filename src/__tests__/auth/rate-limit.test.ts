import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCount, mockCreate } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
}))

vi.mock('@/core/prisma/client', () => ({
  prisma: {
    loginAttempt: {
      count: mockCount,
      create: mockCreate,
    },
  },
}))

import { checkRateLimit, recordLoginAttempt } from '@/core/auth/rate-limit'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkRateLimit', () => {
  it('allows when fewer than 5 failed attempts', async () => {
    mockCount.mockResolvedValue(4)
    expect(await checkRateLimit('user@example.com')).toBe(true)
  })

  it('blocks when 5 or more failed attempts in window', async () => {
    mockCount.mockResolvedValue(5)
    expect(await checkRateLimit('user@example.com')).toBe(false)
  })

  it('queries only failed attempts within 5-minute window', async () => {
    mockCount.mockResolvedValue(0)
    await checkRateLimit('user@example.com')

    const call = mockCount.mock.calls[0]![0]
    expect(call.where.email).toBe('user@example.com')
    expect(call.where.success).toBe(false)
    expect(call.where.createdAt.gte).toBeInstanceOf(Date)

    const windowMs = Date.now() - call.where.createdAt.gte.getTime()
    expect(windowMs).toBeLessThan(5 * 60 * 1000 + 100)
  })
})

describe('recordLoginAttempt', () => {
  it('records a failed attempt', async () => {
    mockCreate.mockResolvedValue({})
    await recordLoginAttempt('user@example.com', false)
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'user@example.com', success: false }),
    })
  })

  it('records a successful attempt with userId', async () => {
    mockCreate.mockResolvedValue({})
    await recordLoginAttempt('user@example.com', true, 'user-123')
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: true, userId: 'user-123' }),
    })
  })
})
