import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) })

const LOC = 'loc-a' // Weidenallee
const M = 'cmqevjqiy0002kv8ofba4wjzk' // Martin Lohr (Küche)
const S = 'cmqevjqna0006kv8oeltoap2g' // Stephan Kolba

// Woche 27 – nur Mo 29. + Di 30. Juni haben Schichten ("Freier Tag" übersprungen)
const plan: [string, string, string, string][] = [
  ['2026-06-29', '12:00', '19:30', M], // Martin Lohr
  ['2026-06-29', '11:00', '17:00', S], // Stephan Kolba
  ['2026-06-30', '11:00', '19:30', S], // Stephan Kolba
]

async function main() {
  const del = await prisma.shift.deleteMany({
    where: {
      locationId: LOC,
      date: { gte: new Date('2026-06-29T00:00:00.000Z'), lt: new Date('2026-07-06T00:00:00.000Z') },
    },
  })
  console.log(`🗑️  ${del.count} bestehende Weidenallee-Schichten (KW27) gelöscht`)

  const res = await prisma.shift.createMany({
    data: plan.map(([date, startTime, endTime, userId]) => ({
      userId,
      locationId: LOC,
      date: new Date(date + 'T00:00:00.000Z'),
      startTime,
      endTime,
      status: 'PLANNED' as const,
    })),
  })
  console.log(`✅ ${res.count} Schichten (KW27) angelegt`)

  const check = await prisma.shift.findMany({
    where: { date: { gte: new Date('2026-06-29T00:00:00.000Z'), lt: new Date('2026-07-06T00:00:00.000Z') } },
    include: { user: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
  for (const s of check) console.log(`  ${s.date.toISOString().slice(0, 10)} ${s.startTime}-${s.endTime} | ${s.user?.name ?? '(frei)'}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
