import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) })

// Wiederherstellung der versehentlich gelöschten freien Schichten 1.–3. Juli
const dates = ['2026-07-01', '2026-07-02', '2026-07-03']

async function main() {
  const res = await prisma.shift.createMany({
    data: dates.map((date) => ({
      userId: null,
      locationId: 'loc-a', // Weidenallee
      date: new Date(date + 'T00:00:00.000Z'),
      startTime: '11:00',
      endTime: '19:30',
      status: 'PLANNED' as const,
    })),
  })
  console.log(`✅ ${res.count} freie Schichten (1.–3. Juli) wiederhergestellt`)

  const check = await prisma.shift.findMany({
    where: { date: { gte: new Date('2026-06-29T00:00:00.000Z'), lt: new Date('2026-07-06T00:00:00.000Z') } },
    include: { user: { select: { name: true } }, location: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
  console.log('Stand KW27 jetzt:')
  for (const s of check) console.log(`  ${s.date.toISOString().slice(0,10)} ${s.startTime}-${s.endTime} | ${s.user?.name ?? '(frei)'} @ ${s.location.name}`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
