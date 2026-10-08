import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { calcVacationEntitlement, calcVacationUsed } from '@/lib/vacation'
import VacationsClient from './VacationsClient'

export default async function VacationsPage() {
  const session = await getSession()

  const [vacationRequests, users, balances] = await Promise.all([
    prisma.vacationRequest.findMany({
      include: {
        user: { select: { id: true, name: true, vacationDaysPerYear: true, startDate: true } },
        history: { orderBy: { changedAt: 'desc' }, include: { changedByUser: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.vacationYearBalance.findMany({
      where: { year: new Date().getFullYear() },
      select: { userId: true, entitlement: true, carryOver: true },
    }),
  ])
  const balanceByUser = new Map(balances.map((b) => [b.userId, b]))

  // Pre-compute remaining days per user using all non-rejected requests
  const allByUser = new Map<string, typeof vacationRequests>()
  for (const v of vacationRequests) {
    const list = allByUser.get(v.userId) ?? []
    list.push(v)
    allByUser.set(v.userId, list)
  }

  const vacations = vacationRequests.map((v) => {
    const userVacations = allByUser.get(v.userId) ?? []
    const entitlement = calcVacationEntitlement(v.user, balanceByUser.get(v.userId))
    const used = calcVacationUsed(userVacations.filter((x) => x.status === 'APPROVED'))
    const remaining = entitlement - used
    return {
      id: v.id,
      userId: v.userId,
      userName: v.user.name,
      startDate: v.startDate.toISOString(),
      endDate: v.endDate.toISOString(),
      workdays: v.workdays,
      status: v.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      note: v.note,
      createdAt: v.createdAt.toISOString(),
      remaining,
      history: v.history.map((h) => ({
        id: h.id,
        changeType: h.changeType,
        oldWorkdays: h.oldWorkdays,
        newWorkdays: h.newWorkdays,
        oldStartDate: h.oldStartDate?.toISOString() ?? null,
        newStartDate: h.newStartDate?.toISOString() ?? null,
        oldEndDate: h.oldEndDate?.toISOString() ?? null,
        newEndDate: h.newEndDate?.toISOString() ?? null,
        changedByName: h.changedByUser.name,
        changedAt: h.changedAt.toISOString(),
      })),
    }
  })

  return (
    <div className="p-6 max-w-5xl">
      <VacationsClient
        vacations={vacations}
        employees={users}
        isSuperAdmin={session?.role === 'SUPER_ADMIN'}
      />
    </div>
  )
}
