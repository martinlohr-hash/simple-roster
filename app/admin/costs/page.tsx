import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, parseISO, getISOWeek, getMonth, getYear } from 'date-fns'
import { de } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { calcHours, calcLaborCost, calcGrossHourlyCost, getTrafficLight } from '@/lib/calculations'
import { shiftDurationHours } from '@/lib/timeUtils'
import { formatBerlin, getBreakMinutesByUser } from '@/lib/dayHours'
import CostsFilter from '@/components/admin/CostsFilter'
import BudgetProgress from '@/components/admin/BudgetProgress'

type Props = {
  searchParams: Promise<{ from?: string; to?: string; period?: string; locationId?: string }>
}

export default async function CostsPage({ searchParams }: Props) {
  const sp = await searchParams
  const period = sp.period || 'month'
  const now = new Date()

  let from: Date, to: Date
  if (period === 'week') {
    from = startOfWeek(now, { weekStartsOn: 1 })
    to = endOfWeek(now, { weekStartsOn: 1 })
  } else if (period === 'nextmonth') {
    const next = addMonths(now, 1)
    from = startOfMonth(next)
    to = endOfMonth(next)
  } else if (period === 'custom' && sp.from && sp.to) {
    from = parseISO(sp.from)
    to = parseISO(sp.to)
  } else {
    from = startOfMonth(now)
    to = endOfMonth(now)
  }

  const showBudget = period === 'week' || period === 'month' || period === 'nextmonth'
  const budgetPeriod: 'WEEKLY' | 'MONTHLY' = period === 'week' ? 'WEEKLY' : 'MONTHLY'
  const budgetYear = getYear(from)
  const budgetWeekOrMonth = period === 'week' ? getISOWeek(from) : getMonth(from) + 1

  const [entries, shifts, users, locations, budget, breakMinutesByUser] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        checkinAt: { gte: from, lte: to },
        checkoutAt: { not: null },
        ...(sp.locationId ? { locationId: sp.locationId } : {}),
      },
      include: { user: true, location: true },
    }),
    prisma.shift.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
        userId: { not: null },
        ...(sp.locationId ? { locationId: sp.locationId } : {}),
      },
      select: { userId: true, startTime: true, endTime: true },
    }),
    prisma.user.findMany({
      where: { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    showBudget
      ? prisma.budget.findUnique({
          where: {
            period_year_weekOrMonth: {
              period: budgetPeriod,
              year: budgetYear,
              weekOrMonth: budgetWeekOrMonth,
            },
          },
        })
      : Promise.resolve(null),
    getBreakMinutesByUser(formatBerlin(from, 'yyyy-MM-dd'), formatBerlin(to, 'yyyy-MM-dd')),
  ])

  type UserStats = {
    name: string
    plannedHours: number
    plannedCost: number
    hours: number
    cost: number
    light: 'green' | 'yellow' | 'red'
  }
  const byUser: Record<string, UserStats> = {}
  for (const user of users) {
    byUser[user.id] = { name: user.name, plannedHours: 0, plannedCost: 0, hours: 0, cost: 0, light: 'green' }
  }
  for (const e of entries) {
    const h = calcHours(e.checkinAt, e.checkoutAt!)
    if (byUser[e.userId]) {
      byUser[e.userId].hours += h
      byUser[e.userId].cost += calcLaborCost(h, e.user.hourlyRate, e.user.overheadPercent)
    }
  }
  const rateById = new Map(users.map((u) => [u.id, { rate: u.hourlyRate, overhead: u.overheadPercent }]))
  // Gesetzliche Pausenabzüge (§4 ArbZG, per "Tag freigeben" bestätigt) reduzieren
  // die Ist-Stunden/-Kosten auch hier, konsistent mit Dienstplan und Export.
  for (const [userId, minutes] of Object.entries(breakMinutesByUser)) {
    const stats = byUser[userId]
    const rates = rateById.get(userId)
    if (!stats || !rates) continue
    const dedHours = Math.min(stats.hours, minutes / 60)
    stats.hours -= dedHours
    stats.cost -= dedHours * calcGrossHourlyCost(rates.rate, rates.overhead)
  }
  for (const s of shifts) {
    if (!s.userId || !byUser[s.userId]) continue
    const h = shiftDurationHours(s.startTime, s.endTime)
    const r = rateById.get(s.userId)
    byUser[s.userId].plannedHours += h
    if (r) byUser[s.userId].plannedCost += calcLaborCost(h, r.rate, r.overhead)
  }
  for (const [id, stats] of Object.entries(byUser)) {
    const user = users.find((u) => u.id === id)
    // Ampel auf Basis der höheren Belastung (Plan oder Ist) – beim Planen zählt der Plan.
    stats.light = getTrafficLight(Math.max(stats.plannedHours, stats.hours), user?.maxHoursMonth)
  }

  const totalPlannedHours = Object.values(byUser).reduce((s, u) => s + u.plannedHours, 0)
  const totalPlannedCost = Object.values(byUser).reduce((s, u) => s + u.plannedCost, 0)
  const totalHours = Object.values(byUser).reduce((s, u) => s + u.hours, 0)
  const totalCost = Object.values(byUser).reduce((s, u) => s + u.cost, 0)
  const lightDot = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Lohnkosten</h1>

      <CostsFilter
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        defaults={{
          period,
          from: sp.from || format(from, 'yyyy-MM-dd'),
          to: sp.to || format(to, 'yyyy-MM-dd'),
          locationId: sp.locationId || '',
        }}
      />

      <p className="text-sm text-gray-500 mb-4">
        {format(from, 'd. MMM', { locale: de })} – {format(to, 'd. MMM yyyy', { locale: de })}
      </p>

      {showBudget && (
        <BudgetProgress
          budget={budget}
          actualHours={totalHours}
          actualEuros={totalCost}
          plannedHours={totalPlannedHours}
          plannedEuros={totalPlannedCost}
          period={budgetPeriod}
          year={budgetYear}
          weekOrMonth={budgetWeekOrMonth}
        />
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">Stunden</div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-2xl font-semibold text-gray-900">{totalPlannedHours.toFixed(1)}h</div>
              <div className="text-xs text-gray-400">geplant</div>
            </div>
            <div className="text-gray-300">/</div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{totalHours.toFixed(1)}h</div>
              <div className="text-xs text-gray-400">Ist</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">Lohnkosten</div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-2xl font-semibold text-gray-900">{totalPlannedCost.toFixed(2)} €</div>
              <div className="text-xs text-gray-400">geplant</div>
            </div>
            <div className="text-gray-300">/</div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{totalCost.toFixed(2)} €</div>
              <div className="text-xs text-gray-400">Ist</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Mitarbeiter</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Plan-Std</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ist-Std</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Plan-Kosten</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ist-Kosten</th>
              <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Ampel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.values(byUser).map((u) => (
              <tr key={u.name} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right">{u.plannedHours.toFixed(2)}h</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right">{u.hours.toFixed(2)}h</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right">{u.plannedCost.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{u.cost.toFixed(2)} €</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${lightDot[u.light]}`}
                    title={u.light === 'green' ? 'Im grünen Bereich' : u.light === 'yellow' ? 'Nahe dem Limit' : 'Limit überschritten'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">Gesamt</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{totalPlannedHours.toFixed(2)}h</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{totalHours.toFixed(2)}h</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{totalPlannedCost.toFixed(2)} €</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{totalCost.toFixed(2)} €</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
