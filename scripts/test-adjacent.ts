import 'dotenv/config'
import { prisma } from '@/lib/db'
import { addDays, format } from 'date-fns'

async function main() {
  // Woche 29 (13.-19. Juli 2026)
  const weekStart = new Date('2026-07-13T00:00:00Z')
  const weekEnd = addDays(weekStart, 7)
  const lastSunday = addDays(weekStart, -1)
  const firstMondayNextWeek = weekEnd
  const dayAfterMonday = addDays(firstMondayNextWeek, 1)

  console.log('weekStart:', format(weekStart, 'yyyy-MM-dd'))
  console.log('lastSunday:', format(lastSunday, 'yyyy-MM-dd'))
  console.log('firstMondayNextWeek:', format(firstMondayNextWeek, 'yyyy-MM-dd'))
  console.log('dayAfterMonday:', format(dayAfterMonday, 'yyyy-MM-dd'))

  const result = await prisma.shift.findMany({
    where: {
      OR: [
        { date: { gte: lastSunday, lt: weekStart } },
        { date: { gte: firstMondayNextWeek, lt: dayAfterMonday } },
      ],
      userId: { not: null },
    },
    select: { id: true, userId: true, date: true, user: { select: { name: true } } },
  })

  console.log('Adjacent shifts found:', result.length)
  result.forEach(s => {
    console.log(`  ${s.user.name}: ${s.date.toISOString().slice(0, 10)}`)
  })
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
