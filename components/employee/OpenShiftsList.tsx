'use client'

import { useState, useTransition } from 'react'
import { format, parseISO, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { applyForShift, withdrawApplication } from '@/app/actions/bidding'

type ShiftItem = {
  id: string
  date: string
  startTime: string
  endTime: string
  location: { id: string; name: string; color: string }
  application: { id: string; status: 'PENDING' | 'ASSIGNED' | 'REJECTED' } | null
}

export default function OpenShiftsList({ shifts }: { shifts: ShiftItem[] }) {
  const [pending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (shifts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">✌️</div>
        <p className="text-gray-500 text-sm">Alle offenen Schichten sind besetzt.</p>
      </div>
    )
  }

  const byWeek = shifts.reduce<Record<number, ShiftItem[]>>((acc, s) => {
    const kw = getISOWeek(parseISO(s.date))
    if (!acc[kw]) acc[kw] = []
    acc[kw].push(s)
    return acc
  }, {})

  function handleApply(shiftId: string) {
    setLoadingId(shiftId)
    setErrors((e) => ({ ...e, [shiftId]: '' }))
    startTransition(async () => {
      const result = await applyForShift(shiftId)
      if (result.error) setErrors((e) => ({ ...e, [shiftId]: result.error! }))
      setLoadingId(null)
    })
  }

  function handleWithdraw(shiftId: string, applicationId: string) {
    setLoadingId(shiftId)
    setErrors((e) => ({ ...e, [shiftId]: '' }))
    startTransition(async () => {
      const result = await withdrawApplication(applicationId)
      if (result.error) setErrors((e) => ({ ...e, [shiftId]: result.error! }))
      setLoadingId(null)
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Offene Schichten</h1>
      {Object.entries(byWeek).map(([kw, weekShifts]) => (
        <div key={kw}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">KW {kw}</span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-green-600 font-medium">freigegeben</span>
          </div>
          <div className="space-y-2">
            {weekShifts.map((shift) => {
              const isLoading = loadingId === shift.id && pending
              const error = errors[shift.id]
              const app = shift.application

              return (
                <div key={shift.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: shift.location.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {format(parseISO(shift.date), 'EEEE, d. MMMM', { locale: de })}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {shift.startTime} – {shift.endTime} · {shift.location.name}
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                  </div>

                  {app === null && (
                    <button
                      onClick={() => handleApply(shift.id)}
                      disabled={isLoading}
                      className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
                    >
                      {isLoading ? '...' : 'Bewerben'}
                    </button>
                  )}

                  {app?.status === 'PENDING' && (
                    <button
                      onClick={() => handleWithdraw(shift.id, app.id)}
                      disabled={isLoading}
                      className="shrink-0 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition active:scale-[0.97]"
                    >
                      {isLoading ? '...' : 'Zurückziehen'}
                    </button>
                  )}

                  {app?.status === 'ASSIGNED' && (
                    <span className="shrink-0 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg">
                      Schicht erhalten ✓
                    </span>
                  )}

                  {app?.status === 'REJECTED' && (
                    <span className="shrink-0 px-3 py-1.5 bg-gray-50 text-gray-400 text-xs font-medium rounded-lg">
                      Nicht berücksichtigt
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
