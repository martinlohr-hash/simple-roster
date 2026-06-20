import { startOfDay, endOfDay, parseISO, format } from 'date-fns'
import { prisma } from '@/lib/db'
import { calcHours } from '@/lib/calculations'
import TimesheetEditor from '@/components/admin/TimesheetEditor'

type Props = {
  searchParams: Promise<{ date?: string }>
}

export default async function TimesheetsPage({ searchParams }: Props) {
  const sp = await searchParams
  const dateStr = sp.date || format(new Date(), 'yyyy-MM-dd')
  const day = parseISO(dateStr)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  const [entries, users, locations, release] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { checkinAt: { gte: dayStart, lte: dayEnd } },
      include: { user: true, location: true },
      orderBy: { checkinAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.timesheetRelease.findUnique({ where: { day: dateStr } }),
  ])

  const totalHours = entries.reduce(
    (sum, e) => (e.checkoutAt ? sum + calcHours(e.checkinAt, e.checkoutAt) : sum),
    0,
  )
  const openCount = entries.filter((e) => !e.checkoutAt).length

  const serializedEntries = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.user.name,
    locationId: e.locationId,
    locationName: e.location.name,
    checkin: format(e.checkinAt, 'HH:mm'),
    checkout: e.checkoutAt ? format(e.checkoutAt, 'HH:mm') : '',
    hours: e.checkoutAt ? calcHours(e.checkinAt, e.checkoutAt) : null,
  }))

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Stundenkontrolle</h1>
        <p className="text-sm text-gray-500 mt-1">
          Echte Arbeitsstunden pro Tag prüfen und korrigieren. Diese Tages-Gesamtstunden werden in die Auswertungs-Tabelle übernommen.
        </p>
      </div>

      <TimesheetEditor
        date={dateStr}
        entries={serializedEntries}
        users={users.map((u) => ({ id: u.id, name: u.name, primaryLocationId: u.primaryLocationId }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        totalHours={totalHours}
        openCount={openCount}
        release={
          release
            ? {
                releasedAt: release.releasedAt.toISOString(),
                releasedBy: release.releasedBy,
                hours: release.hours,
              }
            : null
        }
      />
    </div>
  )
}
