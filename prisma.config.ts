import { defineConfig } from 'prisma/config'

// Prisma CLI auto-loads .env but not .env.local — load manually
try {
  process.loadEnvFile('.env.local')
} catch {}

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
