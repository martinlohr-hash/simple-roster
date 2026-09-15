import { startOfWeek, addDays, format, getISOWeek, getYear, getMonth, parseISO, startOfMonth, addMonths, setDate } from 'date-fns'
import { de } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { getBudgetStatus, calcLaborCost } from '@/lib/calculations'
import { getHamburgHolidays } from '@/lib/vacation'
import { getBookedEventsForDates } from '@/lib/notion/funnelEvents'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import { shiftDurationHours } from '@/lib/timeUtils'
import { computeDaysHours, computeDaysUserHours, getUnconfirmedDays, berlinDay } from '@/lib/dayHours'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import WeekGrid from '@/components/schedule/WeekGrid'
import WeekJumper from '@/components/schedule/WeekJumper'
import SuggestionsPanel from '@/components/schedule/SuggestionsPanel'
import { computeSuggestions } from '@/lib/suggestions'

type Props = {
  searchParams: Promise<{ week?: string; costMode?: string }>
}

export default async function SchedulePage({ searchParams }: Props) {
  const [{ week, costMode: costModeParam }, session] = await Promise.all([searchParams, getSession()])
  const costMode = costModeParam === 'billing' ? 'billing' : 'month'
  const viewerIsSuperAdmin = isSuperAdmin(session?.role ?? '')

  // Nur gültige yyyy-MM-dd akzeptieren – Müll im Query-Param würde als
  // Invalid Date bis in die Prisma-Queries durchschlagen (500er).
  const weekStart = week && /^\d{4}-\d{2}-\d{2}$/.test(week) && !isNaN(new Date(week).getTime())
    ? new Date(week)
    : startOfWeek(new Date(), { weekStartsOn: 1 })

  const weekEnd = addDays(weekStart, 7)
  const prevWeek = addDays(weekStart, -7)
  const nextWeek = addDays(weekStart, 7)

  // Nachbartage für visuelle Indikatoren (Sonntag Vorgängerwoche, Montag nächste Woche)
  const lastSunday = addDays(weekStart, -1)
  const firstMondayNextWeek = weekEnd // weekEnd ist bereits Montag der nächsten Woche
  const dayAfterMonday = addDays(firstMondayNextWeek, 1)

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return format(d, 'yyyy-MM-dd')
  })

  const weekYear = getYear(weekStart)
  const weekNumber = getISOWeek(weekStart)

  // Personalkosten-Zeitraum: Kalendermonat oder Abrechnungszeitraum (21. des
  // Vormonats – 20.), umschaltbar. Maßgeblich ist der Monat/Zyklus, in dem der
  // Donnerstag der angezeigten Woche liegt (bei Wechsel innerhalb der Woche
  // gewinnt der Monat/Zyklus mit der Mehrheit der Tage).
  const monthAnchor = addDays(weekStart, 3)
  let monthStartStr: string, monthEndStr: string, monthLabel: string, budgetYear: number, budgetMonthNum: number
  if (costMode === 'billing') {
    const day = monthAnchor.getDate()
    const cycleEndMonth = day <= 20 ? monthAnchor : addMonths(monthAnchor, 1)
    monthStartStr = format(setDate(addMonths(cycleEndMonth, -1), 21), 'yyyy-MM-dd')
    monthEndStr = format(setDate(cycleEndMonth, 21), 'yyyy-MM-dd')
    monthLabel = `21.–20. ${format(cycleEndMonth, 'MMMM', { locale: de })}`
    budgetYear = getYear(cycleEndMonth)
    budgetMonthNum = getMonth(cycleEndMonth) + 1
  } else {
    monthStartStr = format(startOfMonth(monthAnchor), 'yyyy-MM-dd')
    monthEndStr = format(addMonths(startOfMonth(monthAnchor), 1), 'yyyy-MM-dd')
    monthLabel = format(monthAnchor, 'MMMM', { locale: de })
    budgetYear = getYear(monthAnchor)
    budgetMonthNum = getMonth(monthAnchor) + 1
  }

  const [shifts, users, locations, templates, dayNotes, coverageRules, weekBudget, weekRelease, applications, vacations, timesheetReleases, dayActuals, unplannedTimeEntries, funnelEvents, unconfirmedDays, monthShifts, adjacentShiftsRaw, monthBudget, monthReleases] = await Promise.all([
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
    getBookedEventsForDates(weekDates),
    getUnconfirmedDays(),
    prisma.shift.findMany({
      where: { date: { gte: new Date(monthStartStr), lt: new Date(monthEndStr) }, userId: { not: null } },
      select: { userId: true, date: true, startTime: true, endTime: true },
    }),
    prisma.shift.findMany({
      where: {
        OR: [
          { date: { gte: lastSunday, lt: weekStart } },
          { date: { gte: firstMondayNextWeek, lt: dayAfterMonday } },
        ],
        userId: { not: null },
      },
      select: { userId: true, date: true, locationId: true, location: { select: { color: true } } },
    }),
    prisma.budget.findUnique({
      where: { period_year_weekOrMonth: { period: 'MONTHLY', year: budgetYear, weekOrMonth: budgetMonthNum } },
    }),
    prisma.timesheetRelease.findMany({ where: { day: { gte: monthStartStr, lt: monthEndStr } } }),
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

  // Monats-Personalkosten-Balken: für bereits bestätigte (freigegebene) Tage
  // zählen die Ist-Stunden je Mitarbeiter, für alle anderen Tage des Monats
  // (v.a. die Zukunft) die geplanten Schicht-Stunden – jeweils zu Lohnkosten
  // (Stundenlohn + Nebenkosten) verrechnet.
  const monthReleasedDaySet = new Set(monthReleases.map((r) => r.day))
  const confirmedUserHours = monthReleasedDaySet.size > 0
    ? await computeDaysUserHours([...monthReleasedDaySet])
    : {}
  let confirmedMonthCost = 0
  for (const dayHours of Object.values(confirmedUserHours)) {
    for (const [userId, hours] of Object.entries(dayHours)) {
      const rates = userRateMap[userId]
      if (rates) confirmedMonthCost += calcLaborCost(hours, rates.hourlyRate, rates.overheadPercent)
    }
  }
  let plannedRemainingMonthCost = 0
  for (const s of monthShifts) {
    if (!s.userId) continue
    const day = s.date.toISOString().slice(0, 10)
    if (monthReleasedDaySet.has(day)) continue
    const rates = userRateMap[s.userId]
    if (!rates) continue
    plannedRemainingMonthCost += calcLaborCost(shiftDurationHours(s.startTime, s.endTime), rates.hourlyRate, rates.overheadPercent)
  }
  const totalMonthCost = confirmedMonthCost + plannedRemainingMonthCost
  const hasMonthlyCostTarget = !!monthBudget && monthBudget.type === 'EUROS'
  const monthCostStatus = hasMonthlyCostTarget ? getBudgetStatus(totalMonthCost, monthBudget!.amount) : 'green'
  const monthCostPct = hasMonthlyCostTarget && monthBudget!.amount > 0
    ? Math.min(100, (totalMonthCost / monthBudget!.amount) * 100)
    : 0
  const monthCostRemaining = hasMonthlyCostTarget ? monthBudget!.amount - totalMonthCost : 0

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

  // Monatsstunden je MA AUSSERHALB der sichtbaren Woche – das Grid addiert die
  // Wochen-Schichten live dazu (zählt so beim Drag&Drop optimistisch mit).
  const weekDateSet = new Set(weekDates)
  const monthOutsideHours: Record<string, number> = {}
  for (const s of monthShifts) {
    if (!s.userId) continue
    const day = s.date.toISOString().slice(0, 10)
    if (weekDateSet.has(day)) continue
    monthOutsideHours[s.userId] = (monthOutsideHours[s.userId] ?? 0) + shiftDurationHours(s.startTime, s.endTime)
  }
  const usersJson = displayUsers.map((u) => ({
    id: u.id,
    name: u.name,
    maxHoursWeek: u.maxHoursWeek,
    maxHoursMonth: u.maxHoursMonth,
    hourlyRate: u.hourlyRate,
    overheadPercent: u.overheadPercent,
  }))
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

  // Nachbar-Schicht-Indikatoren (Sonntag/Montag): Map von userId → { hasSundayShift, sundayColor, hasMondayShift, mondayColor }
  const lastSundayStr = format(lastSunday, 'yyyy-MM-dd')
  const firstMondayStr = format(firstMondayNextWeek, 'yyyy-MM-dd')
  const adjacentShifts: Record<string, { hasSundayShift: boolean; sundayColor?: string; hasMondayShift: boolean; mondayColor?: string }> = {}
  for (const s of adjacentShiftsRaw) {
    if (!s.userId) continue // Nur Schichten mit userId
    const day = berlinDay(s.date)
    if (!adjacentShifts[s.userId]) {
      adjacentShifts[s.userId] = { hasSundayShift: false, hasMondayShift: false }
    }
    if (day === lastSundayStr) {
      adjacentShifts[s.userId].hasSundayShift = true
      adjacentShifts[s.userId].sundayColor = s.location.color
    }
    if (day === firstMondayStr) {
      adjacentShifts[s.userId].hasMondayShift = true
      adjacentShifts[s.userId].mondayColor = s.location.color
    }
  }

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

      <div className="mb-2 flex items-center gap-1 text-xs">
        <Link
          href={`/admin/schedule?week=${format(weekStart, 'yyyy-MM-dd')}&costMode=month`}
          className={`px-2 py-1 rounded-md transition ${
            costMode === 'month' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Monat
        </Link>
        <Link
          href={`/admin/schedule?week=${format(weekStart, 'yyyy-MM-dd')}&costMode=billing`}
          className={`px-2 py-1 rounded-md transition ${
            costMode === 'billing' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Abrechnung (21.–20.)
        </Link>
      </div>

      {hasMonthlyCostTarget ? (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">Personalkosten {monthLabel}</div>
            <Link href={`/admin/costs?period=${costMode}`} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Ziel bearbeiten
            </Link>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                monthCostStatus === 'red' ? 'bg-red-500' : monthCostStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${monthCostPct}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between mt-1.5 text-xs text-gray-500">
            <span>
              {totalMonthCost.toFixed(0)} € von {monthBudget!.amount.toFixed(0)} € ({monthCostPct.toFixed(0)} %)
            </span>
            <span className={monthCostRemaining < 0 ? 'text-red-600 font-medium' : ''}>
              {monthCostRemaining >= 0
                ? `noch ${monthCostRemaining.toFixed(0)} € übrig`
                : `${Math.abs(monthCostRemaining).toFixed(0)} € über Ziel`}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            bestätigt: {confirmedMonthCost.toFixed(0)} € · geplant: {plannedRemainingMonthCost.toFixed(0)} €
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between text-xs text-gray-400 px-1">
          <span>Kein Personalkostenziel für {monthLabel} gesetzt.</span>
          <Link href={`/admin/costs?period=${costMode}`} className="underline hover:text-gray-600">
            Ziel festlegen
          </Link>
        </div>
      )}

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
        funnelEvents={funnelEvents}
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
        adjacentShifts={adjacentShifts}
        holidays={holidaysMap}
        isSuperAdmin={viewerIsSuperAdmin}
        monthInfo={{ label: monthLabel, start: monthStartStr, end: monthEndStr, outsideHours: monthOutsideHours }}
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
