'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { adminUpdateTimeEntry, adminDeleteTimeEntry } from '@/app/actions/timesheets'
import type { LocationData } from './WeekGrid'
import type { UnplannedEntryData } from './UnplannedBlock'

function isoToTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
}

/**
 * Korrektur eines ungeplanten (schichtlosen) Stempel-Eintrags: Ist-Zeiten ändern,
 * Standort ändern oder ganz löschen.
 */
export default function TimeEntryEditModal({
  entry,
  locations,
  onClose,
}: {
  entry: UnplannedEntryData
  locations: LocationData[]
  onClose: () => void
}) {
  const router = useRouter()
  const [von, setVon] = useState(isoToTime(entry.checkinAt))
  const [bis, setBis] = useState(entry.checkoutAt ? isoToTime(entry.checkoutAt) : '')
  const [locationId, setLocationId] = useState(entry.locationId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedDate = format(parseISO(entry.date), 'EEEE, d. MMMM yyyy', { locale: de })

  async function save() {
    setError(null)
    if (!von) {
      setError('Beginn fehlt')
      return
    }
    setLoading(true)
    try {
      await adminUpdateTimeEntry({ id: entry.id, date: entry.date, checkin: von, checkout: bis || undefined, locationId })
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
      setLoading(false)
    }
  }

  async function remove() {
    if (!confirm('Diesen ungeplanten Stempel-Eintrag wirklich löschen?')) return
    setLoading(true)
    try {
      await adminDeleteTimeEntry(entry.id)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="modal-panel bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2 py-0.5 mb-1">
              ⚡ Ungeplanter Einsatz
            </span>
            <p className="text-sm text-gray-500 capitalize">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-xl leading-none mt-0.5">
            ×
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          Gestempelte Zeiten ohne geplante Schicht. Hier korrigieren oder löschen.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
            <input
              type="time"
              value={von}
              onChange={(e) => setVon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
            <input
              type="time"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${bis ? 'border-gray-300' : 'border-amber-300 bg-amber-50'}`}
            />
          </div>
        </div>
        {!bis && <p className="text-[11px] text-amber-600 mt-1">Kein Ende gestempelt – bitte nachtragen, sonst zählt der Einsatz nicht.</p>}

        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">Standort</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}

        <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100">
          <button type="button" onClick={remove} disabled={loading} className="text-sm text-red-500 hover:text-red-600 transition disabled:opacity-50">
            Löschen
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition active:scale-[0.97]">
              Abbrechen
            </button>
            <button type="button" onClick={save} disabled={loading} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition active:scale-[0.97]">
              {loading ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
