import VacationYearEditor from './VacationYearEditor'

export type VacationHistoryEntry = {
  id: string
  startDate: string
  endDate: string
  workdays: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  note: string | null
  createdAt: string
  reviewedAt: string | null
  reviewerName: string | null
  /** Resturlaub nach diesem Antrag (nur bei genehmigten) */
  remainingAfter: number | null
  changes: { at: string; by: string; text: string }[]
}

export type VacationYear = {
  year: number
  baseEntitlement: number
  carryOver: number
  /** true = Anspruch/Übertrag ist gespeichert (eingefroren), sonst berechnet aus Stammdaten */
  saved: boolean
  /** Rest des Vorjahres (Vorschlag für den Übertrag) */
  prevRemaining: number | null
  entitlement: number
  used: number
  remaining: number
  pending: number
  entries: VacationHistoryEntry[]
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  })

const STATUS = {
  APPROVED: { label: 'Genehmigt', cls: 'bg-green-50 text-green-700' },
  PENDING: { label: 'Offen', cls: 'bg-amber-50 text-amber-700' },
  REJECTED: { label: 'Abgelehnt', cls: 'bg-red-50 text-red-700' },
} as const

export default function VacationHistory({ userId, years }: { userId: string; years: VacationYear[] }) {
  return (
    <div className="space-y-8">
      {years.map((y) => (
        <section key={y.year}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-3">
            <h2 className="text-base font-semibold text-gray-900">{y.year}</h2>
            <span className="text-sm text-gray-600">
              Anspruch <b>{y.baseEntitlement}</b>
              {y.carryOver !== 0 && <> + Übertrag <b>{y.carryOver}</b> = <b>{y.entitlement}</b></>}
            </span>
            <span className="text-sm text-gray-600">genommen <b>{y.used}</b></span>
            <span className={`text-sm ${y.remaining < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              Rest <b>{y.remaining}</b>
            </span>
            {y.pending > 0 && <span className="text-sm text-amber-700">{y.pending} Tage beantragt, noch offen</span>}
          </div>

          <VacationYearEditor
            key={`${y.year}-${y.baseEntitlement}-${y.carryOver}`}
            userId={userId}
            year={y.year}
            baseEntitlement={y.baseEntitlement}
            carryOver={y.carryOver}
            saved={y.saved}
            prevRemaining={y.prevRemaining}
          />
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2.5">Urlaub</th>
                  <th className="text-center px-3 py-2.5">Tage</th>
                  <th className="text-center px-3 py-2.5">Rest danach</th>
                  <th className="text-left px-3 py-2.5">Beantragt am</th>
                  <th className="text-left px-3 py-2.5">Entschieden</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="text-gray-500">
                  <td className="px-4 py-2" colSpan={2}>Jahresanspruch{y.carryOver !== 0 ? ' inkl. Übertrag' : ''}</td>
                  <td className="px-3 py-2 text-center">{y.entitlement}</td>
                  <td colSpan={3} />
                </tr>
                {y.entries.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-3 text-gray-400">Keine Anträge in diesem Jahr.</td></tr>
                )}
                {y.entries.map((e) => {
                  const st = STATUS[e.status]
                  return (
                    <tr key={e.id} className="align-top">
                      <td className="px-4 py-2.5">
                        <div className="text-gray-900">{fmtDate(e.startDate)} – {fmtDate(e.endDate)}</div>
                        {e.note && <div className="text-xs text-gray-500">{e.note}</div>}
                        {e.changes.map((c, i) => (
                          <div key={i} className="text-xs text-gray-400">
                            ✎ {c.text} · {fmtDateTime(c.at)} ({c.by})
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">{e.workdays}</td>
                      <td className={`px-3 py-2.5 text-center ${e.remainingAfter !== null && e.remainingAfter < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {e.remainingAfter ?? '–'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{fmtDateTime(e.createdAt)}</td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {e.reviewedAt ? (
                          <>
                            {fmtDateTime(e.reviewedAt)}
                            {e.reviewerName && <div className="text-xs text-gray-400">von {e.reviewerName}</div>}
                          </>
                        ) : '–'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
