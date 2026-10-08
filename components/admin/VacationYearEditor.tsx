'use client'

import { useState, useTransition } from 'react'
import { saveVacationYearBalance } from '@/app/actions/vacations'

export default function VacationYearEditor({
  userId,
  year,
  baseEntitlement,
  carryOver,
  saved,
  prevRemaining,
}: {
  userId: string
  year: number
  baseEntitlement: number
  carryOver: number
  saved: boolean
  prevRemaining: number | null
}) {
  const [open, setOpen] = useState(false)
  const [ent, setEnt] = useState(String(baseEntitlement))
  const [carry, setCarry] = useState(String(carryOver))
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function save() {
    setError('')
    start(async () => {
      const res = await saveVacationYearBalance(userId, year, parseInt(ent, 10), parseInt(carry, 10))
      if (res.error) setError(res.error)
      else setOpen(false)
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-indigo-600 hover:underline">
        ✎ Anspruch / Übertrag{saved ? '' : ' festschreiben'}
      </button>
    )
  }

  const input = 'w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm'
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 mb-3">
      <label className="text-xs text-gray-600">
        Jahresanspruch
        <input type="number" min={0} value={ent} onChange={(e) => setEnt(e.target.value)} className={`${input} block mt-1`} />
      </label>
      <label className="text-xs text-gray-600">
        Übertrag aus {year - 1}
        <input type="number" value={carry} onChange={(e) => setCarry(e.target.value)} className={`${input} block mt-1`} />
      </label>
      {prevRemaining !== null && prevRemaining > 0 && (
        <button type="button" onClick={() => setCarry(String(prevRemaining))} className="text-xs text-indigo-600 hover:underline pb-1.5">
          Rest {year - 1} übernehmen ({prevRemaining})
        </button>
      )}
      <div className="flex gap-2 pb-0.5">
        <button onClick={save} disabled={pending} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white disabled:opacity-50">
          {pending ? 'Speichern…' : 'Speichern'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600">
          Abbrechen
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      <p className="w-full text-xs text-gray-400">
        Festgeschrieben bleibt der Anspruch dieses Jahres auch dann stabil, wenn sich die Stammdaten später ändern.
      </p>
    </div>
  )
}
