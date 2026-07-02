'use client'

import { useState, useEffect } from 'react'
import { checkin, checkout } from '@/app/actions/timeclock'

type Props = {
  activeEntry: { id: string; checkinAt: string; locationId: string; locationName: string } | null
  todayShift: { id: string; startTime: string; endTime: string; locationId: string; location: { name: string } } | null
  locations: { id: string; name: string; color: string }[]
  noShiftToday?: boolean
}

function formatElapsed(checkinAt: string): string {
  const ms = Date.now() - new Date(checkinAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function ElapsedTimer({ checkinAt }: { checkinAt: string }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(checkinAt))

  useEffect(() => {
    const iv = setInterval(() => setElapsed(formatElapsed(checkinAt)), 1000)
    return () => clearInterval(iv)
  }, [checkinAt])

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`${elapsed} im Dienst`}
      className="text-5xl font-mono text-gray-900 mb-2 tracking-tight tabular-nums"
    >
      {elapsed}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function CheckInButton({ activeEntry, todayShift, locations, noShiftToday }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState(
    todayShift?.locationId || locations[0]?.id || '',
  )

  async function handleCheckin() {
    setLoading(true)
    setError(null)
    try {
      const res = await checkin(selectedLocation, todayShift?.id)
      if (res.error) setError(res.error)
    } catch {
      setError('Einstempeln fehlgeschlagen – bitte nochmal versuchen')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const res = await checkout()
      if (res.error) setError(res.error)
    } catch {
      setError('Ausstempeln fehlgeschlagen – bitte nochmal versuchen')
    } finally {
      setLoading(false)
    }
  }

  if (activeEntry) {
    return (
      <div className="text-center">
        {/* Live pulse + location */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-700">{activeEntry.locationName}</span>
        </div>

        <ElapsedTimer checkinAt={activeEntry.checkinAt} />
        <p className="text-sm text-gray-500 mb-7">
          Eingestempelt seit{' '}
          {new Date(activeEntry.checkinAt).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          Uhr
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-4 px-6 bg-red-500 text-white text-lg font-semibold rounded-2xl hover:bg-red-600 disabled:opacity-50 transition active:scale-[0.97] shadow-md shadow-red-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner />
              Bitte warten…
            </span>
          ) : (
            'Ausstempeln'
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="text-center">
      {todayShift ? (
        <p className="text-sm text-gray-500 mb-5">
          Geplante Schicht:{' '}
          <span className="font-medium text-gray-700">
            {todayShift.startTime}–{todayShift.endTime}
          </span>{' '}
          · {todayShift.location.name}
        </p>
      ) : noShiftToday ? (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-2.5 mb-5">
          Heute kein Dienst geplant — du kannst trotzdem einstempeln.
        </p>
      ) : null}

      {!todayShift && locations.length > 1 && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 mb-1.5" htmlFor="location-select">
            Standort
          </label>
          <select
            id="location-select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>
      )}

      <button
        onClick={handleCheckin}
        disabled={loading}
        className="w-full py-4 px-6 bg-green-500 text-white text-lg font-semibold rounded-2xl hover:bg-green-600 disabled:opacity-50 transition active:scale-[0.97] shadow-md shadow-green-100"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Bitte warten…
          </span>
        ) : (
          'Jetzt einstempeln'
        )}
      </button>
    </div>
  )
}
