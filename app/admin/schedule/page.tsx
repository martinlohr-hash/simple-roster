import { startOfWeek, addDays, format, getISOWeek, getYear } from 'date-fns'
import { de } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { getBudgetStatus } from '@/lib/calculations'
import { timeToMinutes } from '@/lib/timeUtils'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import WeekGrid from '@/components/schedule/WeekGrid'
import TemplateToolbar from '@/components/schedule/TemplateToolbar'

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function SchedulePage({ searchParams }: Props) {
  const { week } = await searchParams

  const weekStart = week
    ? new Date(week)
    : startOfWeek(new Date(), { weekStartsOn: 1 })

  const weekEnd = addDays(weekStart, 7)
  const prevWeek = addDays(weekStart, -7)
  const nextWeek = addDays(weekStart, 7)

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return format(d, 'yyyy-MM-dd')
  })

  const weekYear = getYear(weekStart)
  const weekNumber = getISOWeek(weekStart)

  const [shifts, users, locations, templates, dayNotes, coverageRules, weekBudget, weekRelease, applications] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      include: { user: true, location: true, timeEntry: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.shiftTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    }),
    prisma.dayNote.findMany({ where: { date: { in: weekDates } } }),
    prisma.coverageRule.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    prisma.budget.findUnique({
      where: { period_year_weekOrMonth: { period: 'WEEKLY', year: weekYear, weekOrMonth: weekNumber } },
    }),
    prisma.weekRelease.findUnique({ where: { weekStart } }),
    prisma.shiftApplication.findMany({
      where: { shift: { date: { gte: weekStart, lt: weekEnd } } },
      select: { id: true, shiftId: true, userId: true, status: true, user: { select: { id: true, name: true } } },
    }),
  ])

  // Auto-apply default template on empty weeks
  if (shifts.length === 0) {
    const defaultTemplate = templates.find((t) => t.isDefault)
    if (defaultTemplate) {
      const full = await prisma.shiftTemplate.findUnique({
        where: { id: defaultTemplate.id },
        include: { entries: true },
      })
      if (full && full.entries.length > 0) {
        await prisma.shift.createMany({
          data: full.entries.map((e) => ({
            userId: e.userId ?? null,
            locationId: e.locationId,
            date: new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + e.dayOfWeek)),
            startTime: e.startTime,
            endTime: e.endTime,
            status: 'PLANNED' as const,
          })),
        })
        redirect(`/admin/schedule?week=${format(weekStart, 'yyyy-MM-dd')}`)
      }
    }
  }

  // Budget banner calculation
  const plannedHours = shifts.reduce((sum, s) => {
    return sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) / 60
  }, 0)
  const userRateMap = Object.fromEntries(users.map((u) => [u.id, { hourlyRate: u.hourlyRate, overheadPercent: u.overheadPercent }]))
  const plannedCost = shifts.reduce((sum, s) => {
    const h = (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) / 60
    const rates = s.userId ? userRateMap[s.userId] : null
    return sum + (rates ? h * rates.hourlyRate * (1 + rates.overheadPercent / 100) : 0)
  }, 0)
  const budgetActual = weekBudget?.type === 'HOURS' ? plannedHours : plannedCost
  const budgetStatus = weekBudget ? getBudgetStatus(budgetActual, weekBudget.amount) : 'green'

  const shiftsJson = shifts.map((s) => ({
    id: s.id,
    userId: s.userId ?? null,
    locationId: s.locationId,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    user: s.user
      ? { id: s.user.id, name: s.user.name, maxHoursWeek: s.user.maxHoursWeek, maxHoursMonth: s.user.maxHoursMonth }
      : null,
    location: { id: s.location.id, name: s.location.name, color: s.location.color },
    timeEntry: s.timeEntry
      ? { checkinAt: s.timeEntry.checkinAt.toISOString(), checkoutAt: s.timeEntry.checkoutAt?.toISOString() ?? null }
      : null,
  }))

  const usersJson = users.map((u) => ({ id: u.id, name: u.name, maxHoursWeek: u.maxHoursWeek, maxHoursMonth: u.maxHoursMonth }))
  const locationsJson = locations.map((l) => ({ id: l.id, name: l.name, color: l.color }))
  const templatesJson = templates.map((t) => ({ id: t.id, name: t.name, isDefault: t.isDefault, _count: { entries: t._count.entries } }))
  const dayNotesMap = Object.fromEntries(dayNotes.map((n) => [n.date, n.content]))
  const coverageRulesJson = coverageRules.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    minStaff: r.minStaff,
    locationId: r.locationId,
    label: r.label,
  }))

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dienstplan</h1>
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 select-none">
            {format(weekStart, 'd. MMMM', { locale: de })} – {format(addDays(weekStart, 6), 'd. MMMM yyyy', { locale: de })}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <TemplateToolbar weekStart={format(weekStart, 'yyyy-MM-dd')} templates={templatesJson} />
      </div>

      {weekBudget && budgetStatus !== 'green' && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
          budgetStatus === 'red'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-amber-50 border border-amber-200 text-amber-700'
        }`}>
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {budgetStatus === 'red' ? 'Wochenbudget überschritten' : 'Wochenbudget zu 90 % ausgeschöpft'}{' '}
          ({weekBudget.type === 'HOURS' ? `${plannedHours.toFixed(1)} h` : `${plannedCost.toFixed(2)} €`} von{' '}
          {weekBudget.type === 'HOURS' ? `${weekBudget.amount} h` : `${weekBudget.amount.toFixed(2)} €`})
        </div>
      )}

      <WeekGrid
        shifts={shiftsJson}
        users={usersJson}
        locations={locationsJson}
        weekStart={weekStart}
        dayNotes={dayNotesMap}
        coverageRules={coverageRulesJson}
        prevWeekHref={`/admin/schedule?week=${format(prevWeek, 'yyyy-MM-dd')}`}
        nextWeekHref={`/admin/schedule?week=${format(nextWeek, 'yyyy-MM-dd')}`}
        isWeekReleased={!!weekRelease}
        weekStartStr={format(weekStart, 'yyyy-MM-dd')}
        applications={applications.map((a) => ({
          id: a.id,
          shiftId: a.shiftId,
          userId: a.userId,
          status: a.status as 'PENDING' | 'ASSIGNED' | 'REJECTED',
          user: a.user,
        }))}
      />
    </div>
  )
}
