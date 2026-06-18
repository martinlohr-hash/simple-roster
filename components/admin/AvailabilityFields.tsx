'use client'

import { useState } from 'react'

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type Props = {
  unavailableDays?: number[]
  preferredDays?: number[]
  earliestStart?: string | null
  latestEnd?: string | null
}

// Wochentag-Verfügbarkeit + Zeitfenster für die Dienstplan-Vorschläge.
// Gibt Form-Felder aus (name=unavailableDays / preferredDays als mehrfache
// Hidden-Inputs, earliestStart / latestEnd als Zeit-Inputs), damit es sowohl
// per FormData-Action als auch per JSON-Submit (Object.fromEntries → getAll)
// funktioniert.
export default function AvailabilityFields({
  unavailableDays = [],
  preferredDays = [],
  earliestStart = null,
  latestEnd = null,
}: Props) {
  const [unavailable, setUnavailable] = useState<number[]>(unavailableDays)
  const [preferred, setPreferred] = useState<number[]>(preferredDays)

  function toggle(
    day: number,
    list: number[],
    setList: (v: number[]) => void,
    otherList: number[],
    setOtherList: (v: number[]) => void,
  ) {
    if (list.includes(day)) {
      setList(list.filter((d) => d !== day))
    } else {
      setList([...list, day].sort((a, b) => a - b))
      // Ein Tag kann nicht gleichzeitig "nie" und "Wunschtag" sein.
      if (otherList.includes(day)) setOtherList(otherList.filter((d) => d !== day))
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-700">Verfügbarkeit</span>
        <span className="text-[11px] text-gray-400">(für Dienstplan-Vorschläge)</span>
      </div>

      {/* Hidden inputs tragen die ausgewählten Tage in die FormData */}
      {unavailable.map((d) => (
        <input key={`u-${d}`} type="hidden" name="unavailableDays" value={d} />
      ))}
      {preferred.map((d) => (
        <input key={`p-${d}`} type="hidden" name="preferredDays" value={d} />
      ))}

      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Wunschtage (passt gut)</label>
        <div className="flex gap-1">
          {DAY_NAMES.map((name, day) => {
            const active = preferred.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggle(day, preferred, setPreferred, unavailable, setUnavailable)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  active
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Ausschlusstage (kann nie)</label>
        <div className="flex gap-1">
          {DAY_NAMES.map((name, day) => {
            const active = unavailable.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggle(day, unavailable, setUnavailable, preferred, setPreferred)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  active
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Frühestens ab</label>
          <input
            type="time"
            name="earliestStart"
            defaultValue={earliestStart ?? ''}
            step={900}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Spätestens bis</label>
          <input
            type="time"
            name="latestEnd"
            defaultValue={latestEnd ?? ''}
            step={900}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}
