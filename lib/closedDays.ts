import { prisma } from '@/lib/db'

/** Datum (yyyy-MM-dd oder Date) → geschlossen? */
export async function isClosedDay(date: string | Date): Promise<boolean> {
  const key = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10)
  return (await prisma.closedDay.count({ where: { date: key } })) > 0
}

/** Menge der geschlossenen Tage aus einer Liste von yyyy-MM-dd-Daten */
export async function getClosedDaySet(dates: string[]): Promise<Set<string>> {
  const rows = await prisma.closedDay.findMany({ where: { date: { in: dates } }, select: { date: true } })
  return new Set(rows.map((r) => r.date))
}

export const CLOSED_DAY_ERROR = 'An diesem Tag ist geschlossen – keine Schichten möglich.'
