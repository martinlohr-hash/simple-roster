'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ShiftData, LocationData, UserData, ApplicationData } from './WeekGrid'
import { adminUpdateTimeEntry } from '@/app/actions/timesheets'
import { unwrap } from '@/lib/actionResult'

function isoToTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
}

type Props = {
  shift: ShiftData
  locations: LocationData[]
  users: UserData[]
  onClose: () => void
  onSave: (id: string, data: { startTime: string; endTime: string; locationId: string; userId: string | null }) => void
  onDelete: (id: string) => void
  isWeekReleased: boolean
  applications: ApplicationData[]
  onAssign: (shiftId: string, userId: string) => void
}

export default function ShiftEditModal({ shift, locations, users, onClose, onSave, onDelete, isWeekReleased, applications, onAssign }: Props) {
  const isUnassigned = !shift.userId
  const [userId, setUserId] = useState(shift.userId ?? '')
  const [startTime, setStartTime] = useState(shift.startTime)
  const [endTime, setEndTime] = useState(shift.endTime)
  const [locationId, setLocationId] = useState(shift.locationId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const dateStr = format(parseISO(shift.date), 'yyyy-MM-dd')
  const [istVon, setIstVon] = useState(shift.timeEntry ? isoToTime(shift.timeEntry.checkinAt) : '')
  const [istBis, setIstBis] = useState(shift.timeEntry?.checkoutAt ? isoToTime(shift.timeEntry.checkoutAt) : '')
  const [savingIst, setSavingIst] = useState(false)
  const [istError, setIstError] = useState<string | null>(null)
  const [istSaved, setIstSaved] = useState(false)

  async function saveIstZeiten() {
    setIstError(null)
    setIstSaved(false)
    if (!istVon) {
      setIstError('Beginn erforderlich')
      return
    }
    setSavingIst(true)
    try {
      if (shift.timeEntry) {
        // Existierender Eintrag aktualisieren
        unwrap(await adminUpdateTimeEntry({
          id: shift.timeEntry.id,
          date: dateStr,
          checkin: istVon,
          checkout: istBis || undefined,
          locationId,
        }))
      } else {
        // Neuen Eintrag anlegen
        const { adminCreateTimeEntry } = await import('@/app/actions/timesheets')
        unwrap(await adminCreateTimeEntry({
          userId: shift.userId!,
          locationId,
          date: dateStr,
          checkin: istVon,
          checkout: istBis,
        }))
      }
      setIstSaved(true)
      await new Promise(r => setTimeout(r, 600))
      router.refresh()
      onClose()
    } catch (err) {
      setIstError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSavingIst(false)
    }
  }

  const formattedDate = format(parseISO(shift.date), 'EEEE, d. MMMM yyyy', { locale: de })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSave(shift.id, { startTime, endTime, locationId, userId: userId || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Schicht wirklich löschen?')) return
    setLoading(true)
    await onDelete(shift.id)
    setLoading(false)
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="modal-panel bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            {isUnassigned && (
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mb-1">Nicht besetzt</span>
            )}
            <p className="text-sm text-gray-500 capitalize">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mitarbeiter {isUnassigned && <span className="text-amber-600">— bitte auswählen</span>}
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                isUnassigned && !userId ? 'border-amber-400 ring-1 ring-amber-300' : 'border-gray-300'
              }`}
            >
              {isUnassigned && <option value="">— Mitarbeiter wählen —</option>}
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Standort</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {!isUnassigned && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Ist-Zeiten {shift.timeEntry ? '(gestempelt)' : '(nachtragen)'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Von</label>
                  <input
                    type="time"
                    value={istVon}
                    onChange={(e) => { setIstVon(e.target.value); setIstSaved(false) }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bis</label>
                  <input
                    type="time"
                    value={istBis}
                    onChange={(e) => { setIstBis(e.target.value); setIstSaved(false) }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${istBis ? 'border-gray-300' : 'border-amber-300 bg-amber-50'}`}
                  />
                </div>
              </div>
              {!istBis && <p className="text-[11px] text-amber-600 mt-1">Ende erforderlich – sonst zählt die Schicht nicht.</p>}
              {istError && <p className="text-xs text-red-600 mt-1.5">{istError}</p>}
              <button
                type="button"
                onClick={saveIstZeiten}
                disabled={savingIst}
                className="mt-2 w-full px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition active:scale-[0.98]"
              >
                {savingIst ? 'Speichern…' : istSaved ? '✓ Ist-Zeiten gespeichert' : 'Ist-Zeiten speichern'}
              </button>
            </div>
          )}

          {isUnassigned && isWeekReleased && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Bewerbungen {applications.length > 0 && `(${applications.length})`}
              </p>
              {applications.length === 0 ? (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  Woche ist freigegeben – noch keine Bewerbungen
                </p>
              ) : (
                <div className="space-y-1.5">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between gap-2 bg-amber-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-semibold text-amber-800">
                          {app.user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                        <span className="text-sm text-gray-800">{app.user.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAssign(shift.id, app.userId)}
                        disabled={loading}
                        className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
                      >
                        Zuweisen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="text-sm text-red-500 hover:text-red-600 transition disabled:opacity-50"
            >
              Löschen
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition active:scale-[0.97]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
              >
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
