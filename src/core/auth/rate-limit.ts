import { prisma } from '@/core/prisma/client'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export async function checkRateLimit(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS)
  const recentFailed = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: windowStart },
    },
  })
  return recentFailed < MAX_ATTEMPTS
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, success, userId, ipAddress, userAgent },
  })
}
