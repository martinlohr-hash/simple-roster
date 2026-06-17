'use client'

import { useState, useTransition } from 'react'
import { approveVacation, rejectVacation, deleteVacation, createVacationAdmin } from '@/app/actions/vacations'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

type VacationRow = {
  id: string
  userId: string
  userName: string
  startDate: string
  endDate: string
  workdays: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  note: string | null
  createdAt: string
  remaining: number
}

type Employee = { id: string; name: string }

const statusLabel: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Ausstehend', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Genehmigt', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-700' },
}

function fmt(dateStr: string) {
  return format(new Date(dateStr), 'd. MMM yyyy', { locale: de })
}

export default function VacationsClient({
  vacations,
  employees,
}: {
  vacations: VacationRow[]
  employees: Employee[]
}) {
  const [pending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalPending, startModalTransition] = useTransition()

  function handleApprove(id: string) {
    startTransition(() => approveVacation(id))
  }

  function handleReject(id: string) {
    startTransition(() => rejectVacation(id))
  }

  function handleDelete(id: string) {
    if (!confirm('Urlaubseintrag wirklich löschen?')) return
    startTransition(() => deleteVacation(id))
  }

  function handleDirectSubmit(formData: FormData) {
    setModalError(null)
    startModalTransition(async () => {
      const result = await createVacationAdmin(formData)
      if (result.error) {
        setModalError(result.error)
      } else {
        setShowModal(false)
      }
    })
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Urlaubsverwaltung</h1>
        <button
          onClick={() => { setShowModal(true); setModalError(null) }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
        >
          + Urlaub eintragen
        </button>
      </div>

      {vacations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Keine Urlaubsanträge vorhanden.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Mitarbeiter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Zeitraum</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Tage</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Resturlaub</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Notiz</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vacations.map((v) => {
                const s = statusLabel[v.status]
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.userName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {fmt(v.startDate)} – {fmt(v.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium text-gray-800">{v.workdays}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`font-medium ${v.remaining < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {v.remaining}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{v.note || '–'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {v.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(v.id)}
                              disabled={pending}
                              className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition"
                            >
                              Genehmigen
                            </button>
                            <button
                              onClick={() => handleReject(v.id)}
                              disabled={pending}
                              className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
                            >
                              Ablehnen
                            </button>
                          </>
                        )}
                        {v.status === 'REJECTED' && (
                          <button
                            onClick={() => handleApprove(v.id)}
                            disabled={pending}
                            className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition"
                          >
                            Doch genehmigen
                          </button>
                        )}
                        {v.status === 'APPROVED' && (
                          <button
                            onClick={() => handleReject(v.id)}
                            disabled={pending}
                            className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            Zurückziehen
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={pending}
                          className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-red-500 disabled:opacity-50 transition"
                          title="Löschen"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Urlaub direkt eintragen</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition text-lg leading-none">✕</button>
            </div>
            <form action={handleDirectSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mitarbeiter</label>
                <select name="userId" required className={inputClass}>
                  <option value="">Bitte wählen…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
                  <input type="date" name="startDate" required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                  <input type="date" name="endDate" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notiz (optional)</label>
                <input type="text" name="note" placeholder="z.B. Sommerurlaub" className={inputClass} />
              </div>
              {modalError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{modalError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={modalPending}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {modalPending ? 'Wird eingetragen…' : 'Eintragen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
