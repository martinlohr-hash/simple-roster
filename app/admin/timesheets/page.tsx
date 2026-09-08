import { prisma } from '@/lib/db'
import { calcHours } from '@/lib/calculations'
import { berlinDay, berlinDayBounds, formatBerlin } from '@/lib/dayHours'
import TimesheetEditor from '@/components/admin/TimesheetEditor'

type Props = {
  searchParams: Promise<{ date?: string }>
}

export default async function TimesheetsPage({ searchParams }: Props) {
  const sp = await searchParams
  const dateStr = sp.date || berlinDay(new Date())
  const { start: dayStart, end: dayEnd } = berlinDayBounds(dateStr)

  const [entries, users, locations, release, breakDeductions] = await Promise.all([
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
    prisma.breakDeduction.findMany({ where: { day: dateStr }, select: { userId: true, minutes: true } }),
  ])

  const rawTotalHours = entries.reduce(
    (sum, e) => (e.checkoutAt ? sum + calcHours(e.checkinAt, e.checkoutAt) : sum),
    0,
  )
  const openCount = entries.filter((e) => !e.checkoutAt).length

  // Gesetzl. Pausenabzug (§4 ArbZG, bei "Tag freigeben" bestätigt) wird dem
  // letzten Stempel-Eintrag des jeweiligen MA an diesem Tag zugeordnet, damit
  // er für spätere Prüfungen/Diskussionen sichtbar und nachvollziehbar bleibt.
  const breakMinutesByUser = new Map(breakDeductions.map((b) => [b.userId, b.minutes]))
  const lastEntryIdByUser = new Map<string, string>()
  const latestCheckoutByUser = new Map<string, Date>()
  for (const e of entries) {
    if (!e.checkoutAt || !breakMinutesByUser.has(e.userId)) continue
    const cur = latestCheckoutByUser.get(e.userId)
    if (!cur || e.checkoutAt > cur) {
      latestCheckoutByUser.set(e.userId, e.checkoutAt)
      lastEntryIdByUser.set(e.userId, e.id)
    }
  }
  const totalDeductedHours = breakDeductions.reduce((sum, b) => sum + b.minutes, 0) / 60
  const totalHours = Math.max(0, rawTotalHours - totalDeductedHours)

  const serializedEntries = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.user.name,
    locationId: e.locationId,
    locationName: e.location.name,
    checkin: formatBerlin(e.checkinAt, 'HH:mm'),
    checkout: e.checkoutAt ? formatBerlin(e.checkoutAt, 'HH:mm') : '',
    hours: e.checkoutAt ? calcHours(e.checkinAt, e.checkoutAt) : null,
    deductedMinutes: lastEntryIdByUser.get(e.userId) === e.id ? breakMinutesByUser.get(e.userId) : undefined,
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
