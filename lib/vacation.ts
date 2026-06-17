import { VacationStatus } from '@/app/generated/prisma/client'

export type VacationRequestLike = {
  workdays: number
  status: VacationStatus
  startDate: Date | string
  endDate: Date | string
}

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function shift(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Gesetzliche Feiertage Hamburg
function hamburgHolidays(year: number): Set<string> {
  const easter = easterSunday(year)
  return new Set([
    toKey(new Date(year, 0, 1)),   // Neujahr
    toKey(shift(easter, -2)),       // Karfreitag
    toKey(shift(easter, 1)),        // Ostermontag
    toKey(new Date(year, 4, 1)),   // Tag der Arbeit
    toKey(shift(easter, 39)),       // Christi Himmelfahrt
    toKey(shift(easter, 50)),       // Pfingstmontag
    toKey(new Date(year, 9, 3)),   // Tag der Deutschen Einheit
    toKey(new Date(year, 9, 31)),  // Reformationstag
    toKey(new Date(year, 11, 25)), // 1. Weihnachtstag
    toKey(new Date(year, 11, 26)), // 2. Weihnachtstag
  ])
}

const holidayCache = new Map<number, Set<string>>()

function isHoliday(date: Date): boolean {
  const year = date.getFullYear()
  if (!holidayCache.has(year)) holidayCache.set(year, hamburgHolidays(year))
  return holidayCache.get(year)!.has(toKey(date))
}

export function calcWorkdays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(0, 0, 0, 0)
  while (cur <= endDay) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6 && !isHoliday(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function calcVacationEntitlement(user: {
  vacationDaysPerYear: number
  startDate: Date | string | null
}): number {
  if (user.vacationDaysPerYear === 0) return 0
  const now = new Date()
  const currentYear = now.getFullYear()

  if (!user.startDate) return user.vacationDaysPerYear

  const start = new Date(user.startDate)
  if (start.getFullYear() !== currentYear) return user.vacationDaysPerYear

  // Pro-rating: months remaining from start month (inclusive)
  const monthsRemaining = 12 - start.getMonth()
  return Math.ceil((user.vacationDaysPerYear * monthsRemaining) / 12)
}

export function calcVacationUsed(vacations: VacationRequestLike[]): number {
  const currentYear = new Date().getFullYear()
  return vacations
    .filter((v) => {
      if (v.status !== 'APPROVED') return false
      const start = new Date(v.startDate)
      return start.getFullYear() === currentYear
    })
    .reduce((sum, v) => sum + v.workdays, 0)
}

export function calcVacationRemaining(
  user: { vacationDaysPerYear: number; startDate: Date | string | null },
  vacations: VacationRequestLike[],
): number {
  return calcVacationEntitlement(user) - calcVacationUsed(vacations)
}
