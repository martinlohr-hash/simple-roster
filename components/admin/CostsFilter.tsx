'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Location = { id: string; name: string }

export default function CostsFilter({ locations, defaults }: { locations: Location[]; defaults: { period: string; from: string; to: string; locationId: string } }) {
  const router = useRouter()
  const [period, setPeriod] = useState(defaults.period)
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [locationId, setLocationId] = useState(defaults.locationId)

  function apply() {
    const p = new URLSearchParams({ period, locationId })
    if (period === 'custom') { p.set('from', from); p.set('to', to) }
    router.push(`/admin/costs?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="week">Diese Woche</option>
        <option value="month">Dieser Monat</option>
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
        onChange={(e) => setLocationId(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Alle Standorte</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <button
        onClick={apply}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
      >
        Anwenden
      </button>
    </div>
  )
}
