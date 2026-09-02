import { cache } from 'react'
import type { Locale } from 'date-fns'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { prisma } from '@/lib/db'
import { calcHours } from '@/lib/calculations'
import { timeToMinutes, shiftDurationHours } from '@/lib/timeUtils'

/** Folgetag eines "yyyy-MM-dd"-Strings. */
function nextDayStr(day: string): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Formatiert einen Zeitstempel in Berliner Ortszeit (DST-sicher). Ersetzt
 * date-fns `format()`, das die Server-Zeitzone nutzt (Vercel = UTC, zeigt
 * sonst falsche Uhrzeiten/Daten in Prod).
 */
export function formatBerlin(
  d: Date,
  fmt: string,
  options?: { locale?: Locale },
): string {
  return formatInTimeZone(d, 'Europe/Berlin', fmt, options)
}

/** UTC-Grenzen [start, end] eines Berliner Kalendertags ("yyyy-MM-dd"). */
export function berlinDayBounds(day: string): { start: Date; end: Date } {
  return {
    start: fromZonedTime(`${day}T00:00:00`, 'Europe/Berlin'),
    end: fromZonedTime(`${day}T23:59:59.999`, 'Europe/Berlin'),
  }
}

/** ISO-Wochentag (1=Mo…7=So) eines "yyyy-MM-dd"-Tags, DST-unabhängig. */
function isoWeekday(day: string): number {
  const wd = new Date(`${day}T00:00:00Z`).getUTCDay()
  return wd === 0 ? 7 : wd
}

function addDaysStr(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Montag–Sonntag-Woche eines Berliner Kalendertags, als UTC-Grenzen [start, end). */
export function berlinWeekBounds(day: string): { start: Date; end: Date } {
  const startStr = addDaysStr(day, 1 - isoWeekday(day))
  const endStr = addDaysStr(startStr, 7)
  return {
    start: fromZonedTime(`${startStr}T00:00:00`, 'Europe/Berlin'),
    end: fromZonedTime(`${endStr}T00:00:00`, 'Europe/Berlin'),
  }
}

/** Kalendermonat eines Berliner Kalendertags, als UTC-Grenzen [start, end). */
export function berlinMonthBounds(day: string): { start: Date; end: Date } {
  const [y, m] = day.split('-').map(Number)
  const startStr = `${y}-${String(m).padStart(2, '0')}-01`
  const endStr = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return {
    start: fromZonedTime(`${startStr}T00:00:00`, 'Europe/Berlin'),
    end: fromZonedTime(`${endStr}T00:00:00`, 'Europe/Berlin'),
  }
}

/** Berliner Kalendertag eines Zeitstempels als "yyyy-MM-dd" (DST-sicher via Intl). */
export function berlinDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Aktuelle Berliner Uhrzeit als "HH:MM" (für Vergleich mit Schicht-Endzeiten). */
export function berlinTime(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function isAdminRole(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export type DayStat = { actual: number; open: number; entries: number }

/**
 * Ist-Stunden je Berliner Kalendertag für eine Liste von Tagen ("yyyy-MM-dd").
 *
 * Pro Mitarbeiter (Admins ausgenommen) und Tag gilt:
 *  - Abgeschlossener Stempel vorhanden  → Summe der Stempelzeiten zählt.
 *  - Kein abgeschlossener Stempel, aber eine geplante Schicht, deren Ende bereits
 *    vorbei ist → die geplanten Schichtstunden zählen (Fallback, weil Aushilfen
 *    unzuverlässig stempeln; der Admin korrigiert bei Bedarf).
 *  - Aktuell eingestempelt (offener Stempel) → kein Fallback, zählt als `open`.
 *
 * `actual` = summierte Ist-Stunden, `open` = Anzahl offener Stempel,
 * `entries` = Anzahl beitragender Mitarbeiter (Stempel oder Fallback-Schicht).
 */
/** Ist-Stunden je Tag + Mitarbeiter (nur Tage/User mit Stunden > 0), für Kostenberechnung mit individuellem Stundenlohn. */
export type DayUserHours = Record<string, Record<string, number>>

export async function computeDaysStats(days: string[]): Promise<Record<string, DayStat>> {
  const { perDay } = await computeDaysStatsDetailed(days)
  return perDay
}

export async function computeDaysUserHours(days: string[]): Promise<DayUserHours> {
  const { perUser } = await computeDaysStatsDetailed(days)
  return perUser
}

async function computeDaysStatsDetailed(
  days: string[],
): Promise<{ perDay: Record<string, DayStat>; perUser: DayUserHours }> {
  const out: Record<string, DayStat> = {}
  const perUser: DayUserHours = {}
  for (const d of days) {
    out[d] = { actual: 0, open: 0, entries: 0 }
    perUser[d] = {}
  }
  if (days.length === 0) return { perDay: out, perUser }

  const now = new Date()
  const todayStr = berlinDay(now)
  const nowTime = berlinTime(now)

  const sorted = [...days].sort()
  const windowStart = new Date(`${sorted[0]}T00:00:00Z`)
  windowStart.setUTCDate(windowStart.getUTCDate() - 1)
  const windowEnd = new Date(`${sorted[sorted.length - 1]}T00:00:00Z`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 2)

  const [entries, shifts] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { checkinAt: { gte: windowStart, lt: windowEnd } },
      select: {
        userId: true,
        checkinAt: true,
        checkoutAt: true,
        user: { select: { role: true } },
      },
    }),
    prisma.shift.findMany({
      where: {
        date: { in: days.map((d) => new Date(`${d}T00:00:00Z`)) },
        status: { not: 'CANCELLED' },
        userId: { not: null },
      },
      select: {
        userId: true,
        date: true,
        startTime: true,
        endTime: true,
        user: { select: { role: true } },
      },
    }),
  ])

  // Pro Tag + Mitarbeiter: abgeschlossene Stempelstunden und offene Stempel.
  const stamp: Record<string, Map<string, { hours: number; open: number }>> = {}
  for (const d of days) stamp[d] = new Map()
  for (const e of entries) {
    if (isAdminRole(e.user.role)) continue
    const day = berlinDay(e.checkinAt)
    if (!stamp[day]) continue
    const cur = stamp[day].get(e.userId) ?? { hours: 0, open: 0 }
    if (e.checkoutAt) cur.hours += calcHours(e.checkinAt, e.checkoutAt)
    else cur.open += 1
    stamp[day].set(e.userId, cur)
  }

  for (const d of days) {
    for (const [userId, v] of stamp[d]) {
      if (v.hours > 0) {
        out[d].actual += v.hours
        out[d].entries += 1
        perUser[d][userId] = (perUser[d][userId] ?? 0) + v.hours
      }
      out[d].open += v.open
    }
  }

  // Fallback: geplante (beendete) Schichten für MA ohne Stempel zählen.
  for (const s of shifts) {
    if (!s.userId || !s.user || isAdminRole(s.user.role)) continue
    const day = s.date.toISOString().slice(0, 10)
    if (!out[day]) continue
    // Über-Mitternacht-Schichten (Ende <= Start) enden erst am Folgetag.
    const endDay = timeToMinutes(s.endTime) <= timeToMinutes(s.startTime) ? nextDayStr(day) : day
    const ended = endDay < todayStr || (endDay === todayStr && s.endTime <= nowTime)
    if (!ended) continue
    const existing = stamp[day].get(s.userId)
    // Nur einspringen, wenn der MA an dem Tag weder gestempelt hat noch gerade
    // eingestempelt ist (dann zählt der Stempel bzw. der offene Status).
    if (existing && (existing.hours > 0 || existing.open > 0)) continue
    const h = shiftDurationHours(s.startTime, s.endTime)
    out[day].actual += h
    out[day].entries += 1
    perUser[day][s.userId] = (perUser[day][s.userId] ?? 0) + h
  }

  for (const d of days) out[d].actual = Math.round(out[d].actual * 100) / 100
  return { perDay: out, perUser }
}

/** Echte Tages-Gesamtstunden eines Berliner Kalendertags (Stempel + Schicht-Fallback). */
export async function computeDayHours(day: string): Promise<{ hours: number; entries: number }> {
  const stats = await computeDaysStats([day])
  const s = stats[day]
  return { hours: s.actual, entries: s.entries }
}

export type MissingStampShift = { userId: string; name: string; hours: number }

/**
 * Beendete Schichten eines Tages ohne jeden Stempel (offen oder abgeschlossen),
 * Admins ausgenommen. computeDaysStats() zählt solche Schichten zwar als
 * Fallback in die ANGEZEIGTEN Ist-Stunden (Dienstplan-Footer, Freigabe-Snapshot),
 * aber der Lohn-Export liest ausschließlich echte TimeEntry-Zeilen aus der DB –
 * ohne echten Stempel fehlen die Stunden dort komplett. Für die Freigabe-Warnung.
 */
export async function getMissingStampShifts(day: string): Promise<MissingStampShift[]> {
  const now = new Date()
  const todayStr = berlinDay(now)
  const nowTime = berlinTime(now)

  const windowStart = new Date(`${day}T00:00:00Z`)
  windowStart.setUTCDate(windowStart.getUTCDate() - 1)
  const windowEnd = new Date(`${day}T00:00:00Z`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 2)

  const [entries, shifts] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { checkinAt: { gte: windowStart, lt: windowEnd } },
      select: { userId: true, checkinAt: true, user: { select: { role: true } } },
    }),
    prisma.shift.findMany({
      where: { date: new Date(`${day}T00:00:00Z`), status: { not: 'CANCELLED' }, userId: { not: null } },
      select: {
        userId: true,
        startTime: true,
        endTime: true,
        user: { select: { name: true, role: true } },
      },
    }),
  ])

  const stampedUserIds = new Set(
    entries.filter((e) => !isAdminRole(e.user.role) && berlinDay(e.checkinAt) === day).map((e) => e.userId),
  )

  const byUser = new Map<string, MissingStampShift>()
  for (const s of shifts) {
    if (!s.userId || !s.user || isAdminRole(s.user.role)) continue
    if (stampedUserIds.has(s.userId)) continue
    // Über-Mitternacht-Schichten (Ende <= Start) enden erst am Folgetag.
    const endDay = timeToMinutes(s.endTime) <= timeToMinutes(s.startTime) ? nextDayStr(day) : day
    const ended = endDay < todayStr || (endDay === todayStr && s.endTime <= nowTime)
    if (!ended) continue
    const cur = byUser.get(s.userId) ?? { userId: s.userId, name: s.user.name, hours: 0 }
    cur.hours += shiftDurationHours(s.startTime, s.endTime)
    byUser.set(s.userId, cur)
  }

  return [...byUser.values()]
}

/**
 * Anzahl vergangener Arbeitstage (mit Schichten oder Stempeln) der letzten
 * `lookbackDays` Tage, die noch NICHT freigegeben/bestätigt sind. Für den
 * roten Hinweis-Badge im Dienstplan. Heute zählt nicht (Tag noch nicht vorbei).
 */
// cache(): AdminLayout (Badge) und Schedule-Page rufen das im selben Request auf –
// so laufen die 3 Queries nur einmal.
export const getUnconfirmedDays = cache(async (lookbackDays = 14): Promise<string[]> => {
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
})

export async function countUnconfirmedDays(lookbackDays = 14): Promise<number> {
  return (await getUnconfirmedDays(lookbackDays)).length
}

/**
 * Ist-Stunden je Berliner Kalendertag für eine Liste von Tagen ("yyyy-MM-dd").
 * `actual` = Ist-Stunden (Stempel + Schicht-Fallback), `open` = Anzahl offener.
 */
export async function computeDaysHours(
  days: string[],
): Promise<Record<string, { actual: number; open: number }>> {
  const stats = await computeDaysStats(days)
  const out: Record<string, { actual: number; open: number }> = {}
  for (const d of days) out[d] = { actual: stats[d].actual, open: stats[d].open }
  return out
}
