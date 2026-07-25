import 'dotenv/config'
import { prisma } from '@/lib/db'
import { berlinDay } from '@/lib/dayHours'
import { addDays, format } from 'date-fns'

async function main() {
  const weekStart = new Date('2026-07-13T00:00:00Z')
  const weekEnd = addDays(weekStart, 7)
  const lastSunday = addDays(weekStart, -1)
  const firstMondayNextWeek = weekEnd
  const dayAfterMonday = addDays(firstMondayNextWeek, 1)

  const lastSundayStr = format(lastSunday, 'yyyy-MM-dd')
  const firstMondayStr = format(firstMondayNextWeek, 'yyyy-MM-dd')

  const result = await prisma.shift.findMany({
    where: {
      OR: [
        { date: { gte: lastSunday, lt: weekStart } },
        { date: { gte: firstMondayNextWeek, lt: dayAfterMonday } },
      ],
      userId: { not: null },
    },
    select: { userId: true, date: true, user: { select: { name: true } } },
  })

  console.log('Expected strings:', { lastSundayStr, firstMondayStr })
  console.log('\nRaw results:')
  result.forEach(s => {
    const bd = berlinDay(s.date)
    const iso = s.date.toISOString().slice(0, 10)
    const match = bd === lastSundayStr || bd === firstMondayStr ? '✓' : '✗'
    console.log(`  ${s.user.name}: ${iso} -> berlinDay: ${bd} ${match}`)
  })
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
