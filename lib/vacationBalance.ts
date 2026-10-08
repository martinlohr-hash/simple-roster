import 'server-only'
import { prisma } from '@/lib/db'
import { calcEntitlementForYear, type YearBalance } from '@/lib/vacation'

/** Gespeicherter Stand des laufenden Jahres (oder null → berechneter Anspruch). */
export async function getCurrentBalance(userId: string): Promise<YearBalance> {
  const row = await prisma.vacationYearBalance.findUnique({
    where: { userId_year: { userId, year: new Date().getFullYear() } },
    select: { entitlement: true, carryOver: true },
  })
  return row
}

/**
 * Friert den Anspruch aller VERGANGENEN Jahre mit Urlaubsanträgen ein (nur wo noch keine Zeile
 * existiert). Aufruf VOR dem Ändern von vacationDaysPerYear/startDate, damit die Historie stabil bleibt.
 */
export async function freezePastYears(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vacationDaysPerYear: true, startDate: true },
  })
  if (!user) return
  const thisYear = new Date().getFullYear()
  const [requests, existing] = await Promise.all([
    prisma.vacationRequest.findMany({ where: { userId }, select: { startDate: true } }),
    prisma.vacationYearBalance.findMany({ where: { userId }, select: { year: true } }),
  ])
  const have = new Set(existing.map((e) => e.year))
  const years = new Set(requests.map((r) => r.startDate.getFullYear()).filter((y) => y < thisYear && !have.has(y)))
  for (const year of years) {
    await prisma.vacationYearBalance.create({
      data: { userId, year, entitlement: calcEntitlementForYear(user, year) },
    })
  }
}
