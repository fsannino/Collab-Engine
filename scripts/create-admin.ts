/**
 * Cria usuário admin em produção via prompt interativo.
 * Uso: DATABASE_URL=<prod-url> tsx scripts/create-admin.ts
 */
import { createInterface } from 'readline'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hashPassword } from '../src/core/auth/password'

try {
  process.loadEnvFile('.env.local')
} catch {}

if (!process.env.DATABASE_URL) {
  console.error('Erro: DATABASE_URL não definida.')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string): Promise<string> =>
  new Promise((resolve) => rl.question(q, resolve))

async function main() {
  console.warn('\n=== Criar admin — Collab Engine ===\n')

  const tenantSlug = (await ask('Slug do tenant [collabz]: ')).trim() || 'collabz'
  const email = (await ask('E-mail do admin: ')).trim()
  const name = (await ask('Nome completo: ')).trim()
  const password = (await ask('Senha (min 8 chars): ')).trim()

  if (!email || !name || password.length < 8) {
    console.error('Dados inválidos. Abortando.')
    process.exit(1)
  }

  rl.close()

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: { name: tenantSlug, slug: tenantSlug, plan: 'INTERNAL' },
  })

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  })

  if (existing) {
    console.error(`Usuário ${email} já existe no tenant ${tenantSlug}.`)
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: { tenantId: tenant.id, email, name, passwordHash, role: 'ADMIN' },
  })

  console.warn(`\nAdmin criado com sucesso!`)
  console.warn(`  ID:     ${user.id}`)
  console.warn(`  E-mail: ${user.email}`)
  console.warn(`  Tenant: ${tenant.slug} (${tenant.id})`)
  console.warn('\nGuarde a senha em local seguro. Não há recuperação automática no MVP.\n')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect().finally(() => process.exit(1))
  })
