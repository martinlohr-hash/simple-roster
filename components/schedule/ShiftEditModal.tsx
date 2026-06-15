'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ShiftData, LocationData, UserData, ApplicationData } from './WeekGrid'

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
