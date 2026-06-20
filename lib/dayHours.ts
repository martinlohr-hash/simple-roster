import { prisma } from '@/lib/db'
import { calcHours } from '@/lib/calculations'

/** Berliner Kalendertag eines Zeitstempels als "yyyy-MM-dd" (DST-sicher via Intl). */
export function berlinDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Echte Tages-Gesamtstunden (Summe abgeschlossener Stempel-Einträge) eines Berliner Kalendertags. */
export async function computeDayHours(day: string): Promise<{ hours: number; entries: number }> {
  const windowStart = new Date(`${day}T00:00:00Z`)
  windowStart.setUTCDate(windowStart.getUTCDate() - 1)
  const windowEnd = new Date(`${day}T00:00:00Z`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 2)

  const entries = await prisma.timeEntry.findMany({
    where: { checkinAt: { gte: windowStart, lt: windowEnd }, checkoutAt: { not: null } },
    select: { checkinAt: true, checkoutAt: true },
  })

  let hours = 0
  let count = 0
  for (const e of entries) {
    if (berlinDay(e.checkinAt) !== day) continue
    hours += calcHours(e.checkinAt, e.checkoutAt!)
    count += 1
  }
  return { hours: Math.round(hours * 100) / 100, entries: count }
}

/**
 * Anzahl vergangener Arbeitstage (mit Schichten oder Stempeln) der letzten
 * `lookbackDays` Tage, die noch NICHT freigegeben/bestätigt sind. Für den
 * roten Hinweis-Badge im Dienstplan. Heute zählt nicht (Tag noch nicht vorbei).
 */
export async function getUnconfirmedDays(lookbackDays = 14): Promise<string[]> {
  const todayStr = berlinDay(new Date())
  const todayMidnightUtc = new Date(`${todayStr}T00:00:00Z`)
  const startUtc = new Date(todayMidnightUtc)
  startUtc.setUTCDate(startUtc.getUTCDate() - lookbackDays)
  const startStr = berlinDay(startUtc)

  const [shiftDays, entries, releases] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: startUtc, lt: todayMidnightUtc }, status: { not: 'CANCELLED' } },
      select: { date: true },
    }),
    prisma.timeEntry.findMany({
      where: { checkinAt: { gte: startUtc, lt: todayMidnightUtc } },
      select: { checkinAt: true },
    }),
    prisma.timesheetRelease.findMany({
      where: { day: { gte: startStr, lt: todayStr } },
      select: { day: true },
    }),
  ])

  const released = new Set(releases.map((r) => r.day))
  const candidate = new Set<string>()
  for (const s of shiftDays) candidate.add(s.date.toISOString().slice(0, 10))
  for (const e of entries) {
    const d = berlinDay(e.checkinAt)
    if (d < todayStr) candidate.add(d)
  }

  return [...candidate].filter((d) => !released.has(d)).sort()
}

export async function countUnconfirmedDays(lookbackDays = 14): Promise<number> {
  return (await getUnconfirmedDays(lookbackDays)).length
}

/**
 * Ist-Stunden je Berliner Kalendertag für eine Liste von Tagen ("yyyy-MM-dd").
 * `actual` = Summe abgeschlossener Stempel-Einträge, `open` = Anzahl noch offener.
 */
export async function computeDaysHours(
  days: string[],
): Promise<Record<string, { actual: number; open: number }>> {
  const out: Record<string, { actual: number; open: number }> = {}
  for (const d of days) out[d] = { actual: 0, open: 0 }
  if (days.length === 0) return out

  const sorted = [...days].sort()
  const windowStart = new Date(`${sorted[0]}T00:00:00Z`)
  windowStart.setUTCDate(windowStart.getUTCDate() - 1)
  const windowEnd = new Date(`${sorted[sorted.length - 1]}T00:00:00Z`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 2)

  const entries = await prisma.timeEntry.findMany({
    where: { checkinAt: { gte: windowStart, lt: windowEnd } },
    select: { checkinAt: true, checkoutAt: true },
  })

  for (const e of entries) {
    const day = berlinDay(e.checkinAt)
    if (!out[day]) continue
    if (e.checkoutAt) out[day].actual += calcHours(e.checkinAt, e.checkoutAt)
    else out[day].open += 1
  }
  for (const d of days) out[d].actual = Math.round(out[d].actual * 100) / 100
  return out
}
