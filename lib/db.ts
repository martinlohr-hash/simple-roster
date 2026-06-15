import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createClient() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

// In development: always create a fresh client so that `prisma generate`
// changes take effect without a server restart.
export const prisma = process.env.NODE_ENV === 'production'
  ? (() => {
      const g = globalThis as unknown as { prisma?: PrismaClient }
      if (!g.prisma) g.prisma = createClient()
      return g.prisma
    })()
  : createClient()
