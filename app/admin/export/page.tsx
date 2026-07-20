import { prisma } from '@/lib/db'
import ExportForm from '@/components/admin/ExportForm'
import { format } from 'date-fns'

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default async function ExportPage() {
  const [users, locations] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const defaultTo = now.toISOString().split('T')[0]

  // Lohn-Periode: immer 21. des Vormonats bis 20. des aktuellen Monats
  const payrollFrom = new Date(now.getFullYear(), now.getMonth() - 1, 21)
  const payrollTo = new Date(now.getFullYear(), now.getMonth(), 20)

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-8">
        <h2 className="text-base font-semibold text-gray-900">Lohn-Export (21.–20.)</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Zeitraum {format(payrollFrom, 'dd.MM.yyyy')} – {format(payrollTo, 'dd.MM.yyyy')},
          alle Standorte, alle Mitarbeiter. Eine Zeile pro Mitarbeiter mit kumulierten
          Ist-Stunden und anteiligem Trinkgeld.
        </p>
        <form action="/api/export" method="GET" className="space-y-4">
          <input type="hidden" name="from" value={format(payrollFrom, 'yyyy-MM-dd')} />
          <input type="hidden" name="to" value={format(payrollTo, 'yyyy-MM-dd')} />
          <input type="hidden" name="summary" value="1" />
          <input type="hidden" name="format" value="excel" />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Trinkgeld gesamt (€) im Zeitraum
            </label>
            <input
              type="number"
              name="tips"
              min="0"
              step="0.01"
              placeholder="z.B. 350.00"
              required
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              Wird anteilig nach geleisteten Stunden auf alle MA verteilt.
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Lohn-Export als Excel herunterladen
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4">
          Spalten: Name · Ist-Stunden · Stundenlohn · NK-Quote · Lohnkosten · Trinkgeld
        </p>
      </div>
    </div>
  )
}
