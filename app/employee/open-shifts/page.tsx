import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { startOfWeek, addDays } from 'date-fns'
import OpenShiftsList from '@/components/employee/OpenShiftsList'

export default async function OpenShiftsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const releases = await prisma.weekRelease.findMany({ orderBy: { weekStart: 'asc' } })

  if (releases.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-gray-500 text-sm">Noch keine Wochen freigegeben.</p>
      </div>
    )
  }

  const dateRanges = releases.map((r) => {
    const monday = startOfWeek(r.weekStart, { weekStartsOn: 1 })
    return { gte: monday, lt: addDays(monday, 7) }
  })

  const shifts = await prisma.shift.findMany({
    where: {
      userId: null,
      OR: dateRanges.map((range) => ({ date: range })),
    },
    include: {
      location: true,
      applications: {
        where: { userId: session.userId },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  const shiftsJson = shifts.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    location: { id: s.location.id, name: s.location.name, color: s.location.color },
    application: s.applications[0]
      ? { id: s.applications[0].id, status: s.applications[0].status as 'PENDING' | 'ASSIGNED' | 'REJECTED' }
      : null,
  }))

  return <OpenShiftsList shifts={shiftsJson} />
}
