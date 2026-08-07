import { prisma } from '@/lib/db'
import ExportForm from '@/components/admin/ExportForm'
import PayrollExportCard from '@/components/admin/PayrollExportCard'
import { calcHours } from '@/lib/calculations'
import { shiftDurationHours } from '@/lib/timeUtils'
import { format, endOfDay } from 'date-fns'

export default async function ExportPage() {
  const now = new Date()
  // Lohn-Periode: immer 21. des Vormonats bis 20. des aktuellen Monats
  const payrollFrom = new Date(now.getFullYear(), now.getMonth() - 1, 21)
  const payrollTo = new Date(now.getFullYear(), now.getMonth(), 20)

  const payrollFromStr = format(payrollFrom, 'yyyy-MM-dd')
  const payrollToStr = format(payrollTo, 'yyyy-MM-dd')

  const [users, locations, payrollEntries, payrollShifts, adjustments] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.timeEntry.findMany({
      where: {
        checkinAt: { gte: payrollFrom, lte: endOfDay(payrollTo) },
        checkoutAt: { not: null },
      },
      select: { userId: true, checkinAt: true, checkoutAt: true },
    }),
    prisma.shift.findMany({
      where: {
        user: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        date: { gte: payrollFrom, lte: endOfDay(payrollTo) },
        status: { not: 'CANCELLED' },
      },
      select: { userId: true, startTime: true, endTime: true },
    }),
    prisma.payrollAdjustment.findMany({
      where: { periodFrom: payrollFromStr, periodTo: payrollToStr },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Admins gehen mit ihren GEPLANTEN Schichten in den Lohn-Export ein, nicht mit Stempelzeiten
  const adminIds = new Set(users.filter((u) => u.role !== 'EMPLOYEE').map((u) => u.id))
  const hoursByUser = new Map<string, number>()
  for (const e of payrollEntries) {
    if (adminIds.has(e.userId)) continue
    const hours = calcHours(e.checkinAt, e.checkoutAt!)
    hoursByUser.set(e.userId, (hoursByUser.get(e.userId) ?? 0) + hours)
  }
  for (const s of payrollShifts) {
    if (!s.userId) continue
    const hours = shiftDurationHours(s.startTime, s.endTime)
    hoursByUser.set(s.userId, (hoursByUser.get(s.userId) ?? 0) + hours)
  }
  const adjustmentsByUser = new Map<string, typeof adjustments>()
  for (const a of adjustments) {
    adjustmentsByUser.set(a.userId, [...(adjustmentsByUser.get(a.userId) ?? []), a])
  }
  const payrollRows = users.map((u) => ({
    id: u.id,
    name: u.name,
    baseHours: parseFloat((hoursByUser.get(u.id) ?? 0).toFixed(2)),
    planBased: adminIds.has(u.id),
    adjustments: (adjustmentsByUser.get(u.id) ?? []).map((a) => ({
      id: a.id,
      hours: a.hours,
      reason: a.reason,
      createdBy: a.createdBy,
      createdAt: format(a.createdAt, 'dd.MM.yyyy'),
    })),
  }))

  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const defaultTo = now.toISOString().split('T')[0]

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Export</h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <ExportForm
          users={users.map((u) => ({ id: u.id, name: u.name }))}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
        />
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Spalten: Name · Datum · Geplant Von/Bis · Einstempeln · Ausstempeln · Ist-Stunden ·
        Stundenlohn · NK-Quote · Lohnkosten · Trinkgeld (wenn angegeben)
      </p>

      <PayrollExportCard
        rows={payrollRows}
        from={payrollFromStr}
        to={payrollToStr}
        fromLabel={format(payrollFrom, 'dd.MM.yyyy')}
        toLabel={format(payrollTo, 'dd.MM.yyyy')}
      />
    </div>
  )
}
