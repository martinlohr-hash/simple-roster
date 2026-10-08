'use client'

import { useState, useTransition } from 'react'
import { approveVacation, rejectVacation, deleteVacation, createVacationAdmin, updateVacationRequest } from '@/app/actions/vacations'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

type HistoryEntry = {
  id: string
  changeType: string
  oldWorkdays: number | null
  newWorkdays: number | null
  oldStartDate: string | null
  newStartDate: string | null
  oldEndDate: string | null
  newEndDate: string | null
  changedByName: string
  changedAt: string
}

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
  history: HistoryEntry[]
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
  isSuperAdmin = false,
}: {
  vacations: VacationRow[]
  employees: Employee[]
  isSuperAdmin?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [editingVacation, setEditingVacation] = useState<VacationRow | null>(null)
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

  function openEditModal(vacation: VacationRow) {
    setEditingVacation(vacation)
    setShowEditModal(true)
    setModalError(null)
  }

  function handleEditSubmit(formData: FormData) {
    if (!editingVacation) return
    setModalError(null)
    startModalTransition(async () => {
      const result = await updateVacationRequest(editingVacation.id, formData)
      if (result.error) {
        setModalError(result.error)
      } else {
        setShowEditModal(false)
        setEditingVacation(null)
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
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Resturlaub (aktuell)</th>
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
                      <div className="flex items-center gap-1 justify-end">
                        {v.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(v.id)}
                              disabled={pending}
                              className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition whitespace-nowrap"
                            >
                              Genehmigen
                            </button>
                            <button
                              onClick={() => handleReject(v.id)}
                              disabled={pending}
                              className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition whitespace-nowrap"
                            >
                              Ablehnen
                            </button>
                          </>
                        )}
                        {v.status === 'REJECTED' && (
                          <button
                            onClick={() => handleApprove(v.id)}
                            disabled={pending}
                            className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition whitespace-nowrap"
                          >
                            Genehmigen
                          </button>
                        )}
                        {v.status === 'APPROVED' && (
                          <>
                            {isSuperAdmin && (
                              <>
                                <button
                                  onClick={() => openEditModal(v)}
                                  disabled={pending}
                                  className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 transition whitespace-nowrap"
                                  title="Urlaubstage korrigieren"
                                >
                                  ✎ Bearbeiten
                                </button>
                                {v.history.length > 0 && (
                                  <button
                                    onClick={() => setShowHistory(showHistory === v.id ? null : v.id)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition whitespace-nowrap"
                                    title="Änderungsverlauf anzeigen"
                                  >
                                    📋 Verlauf
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => handleReject(v.id)}
                              disabled={pending}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition whitespace-nowrap"
                            >
                              Zurückziehen
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={pending}
                          className="px-1.5 py-1 text-xs text-gray-400 hover:text-red-600 disabled:opacity-50 transition"
                          title="Löschen"
                        >
                          ✕
                        </button>
                      </div>
                      {showHistory === v.id && v.history.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs">
                          {v.history.map((h) => (
                            <div key={h.id} className="bg-blue-50 rounded px-2 py-1 text-gray-700">
                              <div className="font-medium text-blue-700">Korrigiert von {h.changedByName}, {fmt(h.changedAt)}</div>
                              <div className="text-gray-600 text-xs mt-0.5">
                                {h.oldWorkdays !== h.newWorkdays && (
                                  <div>Tage: {h.oldWorkdays} → {h.newWorkdays}</div>
                                )}
                                {h.oldStartDate !== h.newStartDate && (
                                  <div>Von: {fmt(h.oldStartDate!)} → {fmt(h.newStartDate!)}</div>
                                )}
                                {h.oldEndDate !== h.newEndDate && (
                                  <div>Bis: {fmt(h.oldEndDate!)} → {fmt(h.newEndDate!)}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

      {showEditModal && editingVacation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Urlaub korrigieren</h2>
              <button onClick={() => { setShowEditModal(false); setEditingVacation(null) }} className="text-gray-400 hover:text-gray-600 transition text-lg leading-none">✕</button>
            </div>
            <form action={handleEditSubmit} className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                ⚠️ Änderungen werden protokolliert und sind in der Historie sichtbar.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mitarbeiter</label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-900 border border-gray-200">
                  {editingVacation.userName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={editingVacation.startDate.split('T')[0]}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    defaultValue={editingVacation.endDate.split('T')[0]}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notiz (optional)</label>
                <input
                  type="text"
                  name="note"
                  placeholder="z.B. Sommerurlaub"
                  defaultValue={editingVacation.note || ''}
                  className={inputClass}
                />
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                <div className="font-medium text-gray-700 mb-1">Aktuell: {editingVacation.workdays} Tage</div>
                <div>Resturlaub: {editingVacation.remaining} Tage</div>
              </div>
              {modalError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{modalError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingVacation(null) }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={modalPending}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {modalPending ? 'Wird gespeichert…' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
