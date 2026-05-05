import { NextResponse } from 'next/server'
import { prisma } from '@/core/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  let db: 'connected' | 'error' = 'error'

  try {
    await prisma.$queryRaw`SELECT 1`
    db = 'connected'
  } catch {}

  const status = db === 'connected' ? 'ok' : 'degraded'
  const httpStatus = db === 'connected' ? 200 : 503

  return NextResponse.json(
    { status, version: '0.1.0', db },
    { status: httpStatus },
  )
}
