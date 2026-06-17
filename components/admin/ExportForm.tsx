'use client'

import { useState } from 'react'

type User = { id: string; name: string }
type Location = { id: string; name: string }

type Props = {
  users: User[]
  locations: Location[]
  defaultFrom: string
  defaultTo: string
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function ExportForm({ users, locations, defaultFrom, defaultTo }: Props) {
  const [withTips, setWithTips] = useState(false)

  return (
    <form action="/api/export" method="GET" className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
          <input type="date" name="from" defaultValue={defaultFrom} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
          <input type="date" name="to" defaultValue={defaultTo} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Standort</label>
        <select name="locationId" className={`${inputClass} bg-white`}>
          <option value="">Alle Standorte</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Mitarbeiter</label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" name="userId" value="all" defaultChecked className="rounded" />
            Alle Mitarbeiter
          </label>
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name="userId" value={u.id} className="rounded" />
              {u.name}
            </label>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-3 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={withTips}
            onChange={(e) => setWithTips(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Mit Trinkgeld?</span>
        </label>
        {withTips && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Trinkgeld gesamt (€) für den gewählten Zeitraum
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
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" name="format" value="csv"
          className="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition active:scale-[0.97] flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV herunterladen
        </button>
        <button type="submit" name="format" value="excel"
          className="flex-1 py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97] flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel herunterladen
        </button>
      </div>
    </form>
  )
}
