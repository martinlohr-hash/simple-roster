import { prisma } from '@/lib/db'
import { calcVacationEntitlement, calcVacationUsed } from '@/lib/vacation'
import VacationsClient from './VacationsClient'

export default async function VacationsPage() {
  const [vacationRequests, users] = await Promise.all([
    prisma.vacationRequest.findMany({
      include: { user: { select: { id: true, name: true, vacationDaysPerYear: true, startDate: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  // Pre-compute remaining days per user using all non-rejected requests
  const allByUser = new Map<string, typeof vacationRequests>()
  for (const v of vacationRequests) {
    const list = allByUser.get(v.userId) ?? []
    list.push(v)
    allByUser.set(v.userId, list)
  }

  const vacations = vacationRequests.map((v) => {
    const userVacations = allByUser.get(v.userId) ?? []
    const entitlement = calcVacationEntitlement(v.user)
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
    }
  })

  return (
    <div className="p-6 max-w-5xl">
      <VacationsClient vacations={vacations} employees={users} />
    </div>
  )
}
