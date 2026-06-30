import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, parseISO, getISOWeek, getMonth, getYear } from 'date-fns'
import { de } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { calcHours, calcLaborCost, getTrafficLight } from '@/lib/calculations'
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

  const [entries, users, locations, budget] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        checkinAt: { gte: from, lte: to },
        checkoutAt: { not: null },
        ...(sp.locationId ? { locationId: sp.locationId } : {}),
      },
      include: { user: true, location: true },
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
  ])

  type UserStats = { name: string; hours: number; cost: number; light: 'green' | 'yellow' | 'red' }
  const byUser: Record<string, UserStats> = {}
  for (const user of users) {
    byUser[user.id] = { name: user.name, hours: 0, cost: 0, light: 'green' }
  }
  for (const e of entries) {
    const h = calcHours(e.checkinAt, e.checkoutAt!)
    if (byUser[e.userId]) {
      byUser[e.userId].hours += h
      byUser[e.userId].cost += calcLaborCost(h, e.user.hourlyRate, e.user.overheadPercent)
    }
  }
  for (const [id, stats] of Object.entries(byUser)) {
    const user = users.find((u) => u.id === id)
    stats.light = getTrafficLight(stats.hours, user?.maxHoursMonth)
  }

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
          period={budgetPeriod}
          year={budgetYear}
          weekOrMonth={budgetWeekOrMonth}
        />
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">Gesamtstunden</div>
          <div className="text-2xl font-semibold text-gray-900">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">Gesamtlohnkosten</div>
          <div className="text-2xl font-semibold text-gray-900">{totalCost.toFixed(2)} €</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Mitarbeiter</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Stunden</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Lohnkosten</th>
              <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Ampel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.values(byUser).map((u) => (
              <tr key={u.name} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right">{u.hours.toFixed(2)}h</td>
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
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{totalHours.toFixed(2)}h</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{totalCost.toFixed(2)} €</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
