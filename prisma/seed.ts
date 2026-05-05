import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hashPassword } from '../src/core/auth/password'

try {
  process.loadEnvFile('.env.local')
} catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'collabz' },
    update: {},
    create: {
      name: 'CollabZ Consultoria',
      slug: 'collabz',
      plan: 'INTERNAL',
    },
  })

  const passwordHash = await hashPassword('admin123')

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@collabz.com.br' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@collabz.com.br',
      name: 'Admin CollabZ',
      passwordHash,
      role: 'ADMIN',
    },
  })

  console.warn('Seed concluído: admin@collabz.com.br / admin123')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect().finally(() => process.exit(1))
  })
