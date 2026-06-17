import { prisma } from '@/lib/db'
import ExportForm from '@/components/admin/ExportForm'

export default async function ExportPage() {
  const [users, locations] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  const now = new Date()
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
        Spalten: Name · Datum · Geplant Von/Bis · Einstempeln · Ausstempeln · Ist-Stunden · Stundenlohn · NK-Quote · Lohnkosten · Trinkgeld (wenn angegeben)
      </p>
    </div>
  )
}
