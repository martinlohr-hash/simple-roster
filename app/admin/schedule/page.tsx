import { startOfWeek, addDays, format, getISOWeek, getYear, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { getBudgetStatus } from '@/lib/calculations'
import { getHamburgHolidays } from '@/lib/vacation'
import { getAllDayEventsForDates } from '@/lib/google/calendar'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import { shiftDurationHours } from '@/lib/timeUtils'
import { computeDaysHours, getUnconfirmedDays, berlinDay } from '@/lib/dayHours'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import WeekGrid from '@/components/schedule/WeekGrid'
import WeekJumper from '@/components/schedule/WeekJumper'
import SuggestionsPanel from '@/components/schedule/SuggestionsPanel'
import { computeSuggestions } from '@/lib/suggestions'

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function SchedulePage({ searchParams }: Props) {
  const [{ week }, session] = await Promise.all([searchParams, getSession()])
  const viewerIsSuperAdmin = isSuperAdmin(session?.role ?? '')

  // Nur gültige yyyy-MM-dd akzeptieren – Müll im Query-Param würde als
  // Invalid Date bis in die Prisma-Queries durchschlagen (500er).
  const weekStart = week && /^\d{4}-\d{2}-\d{2}$/.test(week) && !isNaN(new Date(week).getTime())
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

  const [shifts, users, locations, templates, dayNotes, coverageRules, weekBudget, weekRelease, applications, vacations, timesheetReleases, dayActuals, unplannedTimeEntries, calendarEvents, unconfirmedDays] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      include: { user: true, location: true, timeEntry: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.user.findMany({
      where: { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { name: 'asc' },
    }),
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
    prisma.vacationRequest.findMany({
      where: { status: 'APPROVED', startDate: { lte: weekEnd }, endDate: { gte: weekStart } },
      select: { id: true, userId: true, startDate: true, endDate: true },
    }),
    prisma.timesheetRelease.findMany({ where: { day: { in: weekDates } } }),
    computeDaysHours(weekDates),
    prisma.timeEntry.findMany({
      where: { shiftId: null, checkinAt: { gte: weekStart, lt: weekEnd } },
      include: { location: true, user: true },
      orderBy: { checkinAt: 'asc' },
    }),
    getAllDayEventsForDates(weekDates),
    getUnconfirmedDays(),
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
    return sum + shiftDurationHours(s.startTime, s.endTime)
  }, 0)
  const userRateMap = Object.fromEntries(users.map((u) => [u.id, { hourlyRate: u.hourlyRate, overheadPercent: u.overheadPercent }]))
  const plannedCost = shifts.reduce((sum, s) => {
    const h = shiftDurationHours(s.startTime, s.endTime)
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
      ? { id: s.timeEntry.id, checkinAt: s.timeEntry.checkinAt.toISOString(), checkoutAt: s.timeEntry.checkoutAt?.toISOString() ?? null }
      : null,
  }))

  // Auch MA, die diese Woche ungeplant gestempelt haben aber NICHT (mehr) in der
  // aktiven Liste sind (z. B. ehemalige), bekommen eine Zeile – sonst wäre ihr
  // Stempel im Grid unsichtbar, obwohl die Ist-Summe ihn zählt.
  const knownUserIds = new Set(users.map((u) => u.id))
  const extraUsers: typeof users = []
  const seenExtra = new Set<string>()
  for (const e of unplannedTimeEntries) {
    if (!knownUserIds.has(e.userId) && !seenExtra.has(e.userId)) {
      seenExtra.add(e.userId)
      extraUsers.push(e.user)
    }
  }
  const displayUsers = [...users, ...extraUsers]
  const usersJson = displayUsers.map((u) => ({ id: u.id, name: u.name, maxHoursWeek: u.maxHoursWeek, maxHoursMonth: u.maxHoursMonth }))
  const locationsJson = locations.map((l) => ({ id: l.id, name: l.name, color: l.color }))
  const dayNotesMap = Object.fromEntries(dayNotes.map((n) => [n.date, n.content]))

  // Pro Tag: geplante Stunden (aus Schichten) für den Vergleich in der Fußzeile
  const plannedPerDay: Record<string, number> = {}
  for (const d of weekDates) plannedPerDay[d] = 0
  for (const s of shifts) {
    const day = s.date.toISOString().slice(0, 10)
    if (plannedPerDay[day] != null) {
      plannedPerDay[day] += shiftDurationHours(s.startTime, s.endTime)
    }
  }
  // Unbestätigte vergangene Tage – für Banner-Hinweis + Sprung zur ältesten offenen Woche
  const unconfirmedThisWeek = unconfirmedDays.filter((d) => weekDates.includes(d))
  const oldestUnconfirmed = unconfirmedDays[0]
  const oldestWeekMonday = oldestUnconfirmed
    ? format(startOfWeek(parseISO(oldestUnconfirmed), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : null
  const oldestInView = oldestUnconfirmed ? weekDates.includes(oldestUnconfirmed) : false

  const dayStats = Object.fromEntries(
    weekDates.map((d) => {
      const rel = timesheetReleases.find((r) => r.day === d)
      const act = dayActuals[d] ?? { actual: 0, open: 0 }
      return [
        d,
        {
          actual: act.actual,
          open: act.open,
          planned: Math.round((plannedPerDay[d] ?? 0) * 100) / 100,
          releasedHours: rel ? rel.hours : null,
          releasedAt: rel ? rel.releasedAt.toISOString() : null,
        },
      ]
    }),
  )

  const holidaysMap: Record<string, string> = {}
  const years = [...new Set(weekDates.map((d) => new Date(d).getFullYear()))]
  for (const y of years) {
    for (const [key, name] of getHamburgHolidays(y)) holidaysMap[key] = name
  }
  const coverageRulesJson = coverageRules.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    minStaff: r.minStaff,
    locationId: r.locationId,
    label: r.label,
  }))

  const unplannedEntries = unplannedTimeEntries.map((e) => ({
    id: e.id,
    userId: e.userId,
    locationId: e.locationId,
    locationName: e.location.name,
    locationColor: e.location.color,
    date: berlinDay(e.checkinAt),
    checkinAt: e.checkinAt.toISOString(),
    checkoutAt: e.checkoutAt?.toISOString() ?? null,
  }))

  const suggestions = computeSuggestions({
    shifts: shifts.map((s) => ({
      id: s.id,
      userId: s.userId ?? null,
      locationId: s.locationId,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    })),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      maxHoursWeek: u.maxHoursWeek,
      primaryLocationId: u.primaryLocationId,
      unavailableDays: u.unavailableDays,
      preferredDays: u.preferredDays,
      earliestStart: u.earliestStart,
      latestEnd: u.latestEnd,
    })),
    vacations: vacations.map((v) => ({
      userId: v.userId,
      startDate: v.startDate.toISOString(),
      endDate: v.endDate.toISOString(),
    })),
    coverageRules: coverageRulesJson,
    locations: locationsJson,
    weekDates,
  })

  return (
    <div className="md:p-6 md:max-w-[1400px]">
      <div className="hidden md:flex items-baseline gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dienstplan</h1>
        <WeekJumper weekStart={format(weekStart, 'yyyy-MM-dd')} />
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

      {unconfirmedDays.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-white text-xs font-bold">
            {unconfirmedDays.length}
          </span>
          <span className="font-medium">
            {unconfirmedDays.length === 1 ? 'vergangener Tag noch nicht bestätigt' : 'vergangene Tage noch nicht bestätigt'}
          </span>
          {unconfirmedThisWeek.length > 0 && (
            <span className="text-amber-700">
              · Diese Woche: {unconfirmedThisWeek.map((d) => format(parseISO(d), 'EE d.', { locale: de })).join(', ')} — unten mit ✓ bestätigen
            </span>
          )}
          {oldestWeekMonday && !oldestInView && (
            <Link href={`/admin/schedule?week=${oldestWeekMonday}`} className="underline font-medium hover:text-amber-900">
              → {unconfirmedThisWeek.length > 0 ? 'ältere offene Woche' : 'Zur ältesten offenen Woche'} ({format(parseISO(oldestUnconfirmed), 'd. MMM', { locale: de })})
            </Link>
          )}
        </div>
      )}

      <SuggestionsPanel suggestions={suggestions} />

      <WeekGrid
        shifts={shiftsJson}
        users={usersJson}
        locations={locationsJson}
        weekStart={weekStart}
        dayNotes={dayNotesMap}
        calendarEvents={calendarEvents}
        coverageRules={coverageRulesJson}
        prevWeekHref={`/admin/schedule?week=${format(prevWeek, 'yyyy-MM-dd')}`}
        nextWeekHref={`/admin/schedule?week=${format(nextWeek, 'yyyy-MM-dd')}`}
        isWeekReleased={!!weekRelease}
        weekStartStr={format(weekStart, 'yyyy-MM-dd')}
        dayStats={dayStats}
        unplannedEntries={unplannedEntries}
        applications={applications.map((a) => ({
          id: a.id,
          shiftId: a.shiftId,
          userId: a.userId,
          status: a.status as 'PENDING' | 'ASSIGNED' | 'REJECTED',
          user: a.user,
        }))}
        holidays={holidaysMap}
        isSuperAdmin={viewerIsSuperAdmin}
        vacations={vacations.map((v) => ({
          id: v.id,
          userId: v.userId,
          startDate: v.startDate.toISOString(),
          endDate: v.endDate.toISOString(),
        }))}
      />
    </div>
  )
}
