import { VacationStatus } from '@/app/generated/prisma/client'

export type VacationRequestLike = {
  workdays: number
  status: VacationStatus
  startDate: Date | string
  endDate: Date | string
}

export function calcWorkdays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(0, 0, 0, 0)
  while (cur <= endDay) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
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
