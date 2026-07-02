import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from 'date-fns'
import WeekPlanView from '@/components/employee/WeekPlanView'

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function SchedulePage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const weekStart = params.week
    ? parseISO(params.week)
    : startOfWeek(new Date(), { weekStartsOn: 1 })

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  const [myShifts, allShifts, myVacations] = await Promise.all([
    prisma.shift.findMany({
      where: {
        userId: session.userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: { location: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.shift.findMany({
      where: {
        userId: { not: null },
        date: { gte: weekStart, lte: weekEnd },
      },
      include: { user: { select: { name: true } }, location: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.vacationRequest.findMany({
      where: {
        userId: session.userId,
        status: 'APPROVED',
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
    }),
  ])

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    // Alle eigenen Schichten des Tages (Doppelschichten möglich)
    const dayShifts = myShifts.filter((s) => format(s.date, 'yyyy-MM-dd') === dateStr)

    const isVacation = myVacations.some((v) => {
      const start = new Date(v.startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(v.endDate)
      end.setHours(23, 59, 59, 999)
      return day >= start && day <= end
    })

    return {
      date: dateStr,
      isVacation,
      shifts: dayShifts.map((shift) => ({
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: { name: shift.location.name, color: shift.location.color },
        colleagues: allShifts
          .filter(
            (s) =>
              format(s.date, 'yyyy-MM-dd') === dateStr &&
              s.locationId === shift.locationId &&
              s.userId !== session.userId &&
              s.user != null,
          )
          .map((s) => ({ name: s.user!.name })),
      })),
    }
  })

  return (
    <WeekPlanView weekStart={format(weekStart, 'yyyy-MM-dd')} days={days} userName={session.name} />
  )
}
