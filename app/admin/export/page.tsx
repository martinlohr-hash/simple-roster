import { prisma } from '@/lib/db'
import ExportForm from '@/components/admin/ExportForm'
import PayrollExportCard from '@/components/admin/PayrollExportCard'
import { calcHours } from '@/lib/calculations'
import { format, endOfDay } from 'date-fns'

export default async function ExportPage() {
  const now = new Date()
  // Lohn-Periode: immer 21. des Vormonats bis 20. des aktuellen Monats
  const payrollFrom = new Date(now.getFullYear(), now.getMonth() - 1, 21)
  const payrollTo = new Date(now.getFullYear(), now.getMonth(), 20)

  const [users, locations, payrollEntries] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.timeEntry.findMany({
      where: {
        checkinAt: { gte: payrollFrom, lte: endOfDay(payrollTo) },
        checkoutAt: { not: null },
      },
      select: { userId: true, checkinAt: true, checkoutAt: true },
    }),
  ])

  const hoursByUser = new Map<string, number>()
  for (const e of payrollEntries) {
    const hours = calcHours(e.checkinAt, e.checkoutAt!)
    hoursByUser.set(e.userId, (hoursByUser.get(e.userId) ?? 0) + hours)
  }
  const payrollRows = users.map((u) => ({
    id: u.id,
    name: u.name,
    hours: parseFloat((hoursByUser.get(u.id) ?? 0).toFixed(2)),
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
        from={format(payrollFrom, 'yyyy-MM-dd')}
        to={format(payrollTo, 'yyyy-MM-dd')}
        fromLabel={format(payrollFrom, 'dd.MM.yyyy')}
        toLabel={format(payrollTo, 'dd.MM.yyyy')}
      />
    </div>
  )
}
