import { de } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { calcHours, getTrafficLight } from '@/lib/calculations'
import { berlinDay, berlinWeekBounds, berlinMonthBounds, formatBerlin } from '@/lib/dayHours'

export default async function HoursPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const todayStr = berlinDay(new Date())
  const { start: weekStart, end: weekEnd } = berlinWeekBounds(todayStr)
  const { start: monthStart, end: monthEnd } = berlinMonthBounds(todayStr)

  const [user, weekEntries, monthEntries] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.timeEntry.findMany({
      where: { userId: session.userId, checkinAt: { gte: weekStart, lt: weekEnd }, checkoutAt: { not: null } },
      include: { location: true },
      orderBy: { checkinAt: 'desc' },
    }),
    prisma.timeEntry.findMany({
      where: { userId: session.userId, checkinAt: { gte: monthStart, lt: monthEnd }, checkoutAt: { not: null } },
      include: { location: true },
    }),
  ])

  const weekHours = weekEntries.reduce((sum, e) => sum + calcHours(e.checkinAt, e.checkoutAt!), 0)
  const monthHours = monthEntries.reduce((sum, e) => sum + calcHours(e.checkinAt, e.checkoutAt!), 0)

  const weekLight = getTrafficLight(weekHours, user?.maxHoursWeek)
  const monthLight = getTrafficLight(monthHours, user?.maxHoursMonth)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Meine Stunden</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Diese Woche" hours={weekHours} max={user?.maxHoursWeek} light={weekLight} />
        <StatCard label="Dieser Monat" hours={monthHours} max={user?.maxHoursMonth} light={monthLight} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Diese Woche</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatBerlin(weekStart, 'd. MMM', { locale: de })} – {formatBerlin(new Date(weekEnd.getTime() - 1), 'd. MMM', { locale: de })}
          </p>
        </div>
        {weekEntries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">Noch keine Einträge diese Woche</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {weekEntries.map((entry) => {
              const hours = calcHours(entry.checkinAt, entry.checkoutAt!)
              return (
                <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatBerlin(entry.checkinAt, 'EEEE, d. MMM', { locale: de })}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatBerlin(entry.checkinAt, 'HH:mm')} – {formatBerlin(entry.checkoutAt!, 'HH:mm')} · {entry.location.name}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{hours.toFixed(2)}h</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, hours, max, light }: { label: string; hours: number; max: number | null | undefined; light: 'green' | 'yellow' | 'red' }) {
  const colors = { green: 'text-green-700 bg-green-50', yellow: 'text-yellow-700 bg-yellow-50', red: 'text-red-800 bg-red-50' }
  const dotColors = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{hours.toFixed(1)}h</div>
      {max && (
        <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium px-2 py-1 rounded-full w-fit ${colors[light]}`}>
          <span
            aria-label={light === 'red' ? 'Limit überschritten' : light === 'yellow' ? 'Limit fast erreicht' : 'Im grünen Bereich'}
            className={`w-1.5 h-1.5 rounded-full ${dotColors[light]}`}
          />
          von {max}h
        </div>
      )}
    </div>
  )
}
