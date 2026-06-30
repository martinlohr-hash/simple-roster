'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Location = { id: string; name: string }

export default function CostsFilter({ locations, defaults }: { locations: Location[]; defaults: { period: string; from: string; to: string; locationId: string } }) {
  const router = useRouter()
  const [period, setPeriod] = useState(defaults.period)
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [locationId, setLocationId] = useState(defaults.locationId)

  function go(next: { period?: string; from?: string; to?: string; locationId?: string }) {
    const p = next.period ?? period
    const l = next.locationId ?? locationId
    const params = new URLSearchParams({ period: p, locationId: l })
    if (p === 'custom') {
      params.set('from', next.from ?? from)
      params.set('to', next.to ?? to)
    }
    router.push(`/admin/costs?${params.toString()}`)
  }

  function onPeriodChange(value: string) {
    setPeriod(value)
    // Vordefinierte Zeiträume sofort anwenden – nur "benutzerdefiniert"
    // wartet auf die Datumsauswahl + "Anwenden".
    if (value !== 'custom') go({ period: value })
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="week">Diese Woche</option>
        <option value="month">Dieser Monat</option>
        <option value="nextmonth">Nächster Monat</option>
        <option value="custom">Benutzerdefiniert</option>
      </select>
      {period === 'custom' && (
        <>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </>
      )}
      <select
        value={locationId}
        onChange={(e) => { setLocationId(e.target.value); go({ locationId: e.target.value }) }}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Alle Standorte</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      {period === 'custom' && (
        <button
          onClick={() => go({})}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
        >
          Anwenden
        </button>
      )}
    </div>
  )
}
