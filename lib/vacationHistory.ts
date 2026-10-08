import { Prisma } from '@/app/generated/prisma/client'
import { calcEntitlementForYear } from '@/lib/vacation'
import type { VacationYear } from '@/components/admin/VacationHistory'

// Include für die Urlaubshistorie (Personalakte + CSV-Export teilen sich diese Quelle).
export const vacationInclude = {
  reviewer: { select: { name: true } },
  history: {
    where: { changeType: 'UPDATED' },
    orderBy: { changedAt: 'asc' },
    include: { changedByUser: { select: { name: true } } },
  },
} satisfies Prisma.VacationRequestInclude

type VacationWithRelations = Prisma.VacationRequestGetPayload<{ include: typeof vacationInclude }>

/**
 * Urlaubshistorie pro Jahr (neuestes zuerst). Zuordnung nach Startdatum wie calcVacationUsed;
 * „Rest danach" läuft chronologisch über genehmigte Anträge. Jahre ohne Anträge fehlen.
 */
export function buildVacationYears(
  user: { vacationDaysPerYear: number; startDate: Date | null },
  vacations: VacationWithRelations[],
  balances: { year: number; entitlement: number; carryOver: number }[] = [],
): VacationYear[] {
  const balanceByYear = new Map(balances.map((b) => [b.year, b]))
  const thisYear = new Date().getFullYear()
  const byYear = new Map<number, VacationWithRelations[]>()
  // Laufendes Jahr + Jahre mit gespeichertem Stand immer zeigen (auch ohne Anträge)
  byYear.set(thisYear, [])
  for (const b of balances) if (!byYear.has(b.year)) byYear.set(b.year, [])
  for (const v of [...vacations].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())) {
    const y = v.startDate.getFullYear()
    byYear.set(y, [...(byYear.get(y) ?? []), v])
  }
  const sorted = [...byYear.entries()].sort((a, b) => b[0] - a[0])
  const remainingByYear = new Map<number, number>()
  // Vorjahres-Rest für den „Übernehmen"-Vorschlag (aufsteigend berechnen)
  for (const [year, list] of [...sorted].reverse()) {
    const bal = balanceByYear.get(year)
    const base = bal ? bal.entitlement + bal.carryOver : calcEntitlementForYear(user, year)
    const usedY = list.filter((v) => v.status === 'APPROVED').reduce((n, v) => n + v.workdays, 0)
    remainingByYear.set(year, base - usedY)
  }
  return sorted
    .map(([year, list]) => {
      const bal = balanceByYear.get(year)
      const baseEntitlement = bal ? bal.entitlement : calcEntitlementForYear(user, year)
      const carryOver = bal?.carryOver ?? 0
      const entitlement = baseEntitlement + carryOver
      let used = 0
      const entries = list.map((v) => {
        let remainingAfter: number | null = null
        if (v.status === 'APPROVED') {
          used += v.workdays
          remainingAfter = entitlement - used
        }
        return {
          id: v.id,
          startDate: v.startDate.toISOString(),
          endDate: v.endDate.toISOString(),
          workdays: v.workdays,
          status: v.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          note: v.note,
          createdAt: v.createdAt.toISOString(),
          reviewedAt: v.reviewedAt?.toISOString() ?? null,
          reviewerName: v.reviewer?.name ?? null,
          remainingAfter,
          changes: v.history.map((h) => ({
            at: h.changedAt.toISOString(),
            by: h.changedByUser.name,
            text:
              h.oldWorkdays !== null && h.newWorkdays !== null && h.oldWorkdays !== h.newWorkdays
                ? `Korrigiert: ${h.oldWorkdays} → ${h.newWorkdays} Tage`
                : 'Geändert',
          })),
        }
      })
      return {
        year,
        baseEntitlement,
        carryOver,
        saved: !!bal,
        prevRemaining: remainingByYear.get(year - 1) ?? null,
        entitlement,
        used,
        remaining: entitlement - used,
        pending: list.filter((v) => v.status === 'PENDING').reduce((n, v) => n + v.workdays, 0),
        entries,
      }
    })
}
