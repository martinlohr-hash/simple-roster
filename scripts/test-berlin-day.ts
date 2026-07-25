import 'dotenv/config'
import { berlinDay } from '@/lib/dayHours'
import { format } from 'date-fns'

const dates = [
  new Date('2026-07-12T00:00:00Z'),
  new Date('2026-07-13T00:00:00Z'),
  new Date('2026-07-20T00:00:00Z'),
  new Date('2026-07-21T00:00:00Z'),
]

dates.forEach(d => {
  const bd = berlinDay(d)
  console.log(`${d.toISOString()} -> berlinDay: ${bd}`)
})
