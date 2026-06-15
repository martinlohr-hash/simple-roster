import { format, startOfDay, endOfDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import CheckInButton from '@/components/employee/CheckInButton'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)

  const [activeEntry, todayShift, locations, user] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId: session.userId, checkoutAt: null },
      include: { location: true },
    }),
    prisma.shift.findFirst({
      where: {
        userId: session.userId,
        date: { gte: dayStart, lte: dayEnd },
      },
      include: { location: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ])

  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 text-balance">
          {greeting}, {session.name.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(now, "EEEE, d. MMMM yyyy", { locale: de })}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <CheckInButton
          activeEntry={
            activeEntry
              ? {
                  id: activeEntry.id,
                  checkinAt: activeEntry.checkinAt.toISOString(),
                  locationId: activeEntry.locationId,
                  locationName: activeEntry.location.name,
                }
              : null
          }
          todayShift={
            todayShift
              ? {
                  id: todayShift.id,
                  startTime: todayShift.startTime,
                  endTime: todayShift.endTime,
                  locationId: todayShift.locationId,
                  location: { name: todayShift.location.name },
                }
              : null
          }
          locations={locations.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
          noShiftToday={!todayShift && !activeEntry}
        />
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 17) return 'Guten Tag'
  return 'Guten Abend'
}
