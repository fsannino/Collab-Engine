import { type NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/core/prisma/client'
import { env } from '@/core/config/env'

const userSyncSchema = z.object({
  event: z.enum(['user.created', 'user.updated', 'user.deleted']),
  userId: z.string().uuid(),
  data: z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    tenantId: z.string().uuid(),
    passwordHash: z.string().optional(),
    active: z.boolean(),
  }),
})

function verifyHmac(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = req.headers.get('x-webhook-signature') ?? ''
  const body = await req.text()

  if (!verifyHmac(body, signature, env.WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const parsed = userSyncSchema.safeParse(JSON.parse(body))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { event, userId, data } = parsed.data

  try {
    if (event === 'user.created' || event === 'user.updated') {
      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          tenantId: data.tenantId,
          email: data.email,
          name: data.name,
          role: data.role as never,
          passwordHash: data.passwordHash,
          active: data.active,
        },
        update: {
          email: data.email,
          name: data.name,
          role: data.role as never,
          passwordHash: data.passwordHash,
          active: data.active,
        },
      })
    }

    if (event === 'user.deleted') {
      await prisma.user.update({
        where: { id: userId },
        data: { active: false, deletedAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user-sync webhook]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
