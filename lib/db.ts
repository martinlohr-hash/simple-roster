import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createClient() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

// Auch im Development auf globalThis cachen: sonst legt jeder Hot-Reload einen
// neuen Client samt pg-Pool an, ohne den alten zu schließen, und die
// Supabase-Pooler-Connections laufen voll. Nach `prisma generate` einmal den
// Dev-Server neu starten.
const g = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = g.prisma ?? (g.prisma = createClient())
