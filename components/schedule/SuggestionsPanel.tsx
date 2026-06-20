'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { createShift, updateShift } from '@/app/actions/shifts'
import type { Suggestion } from '@/lib/suggestions'

function fmtHours(h: number): string {
  return h.toFixed(1).replace('.', ',').replace(',0', '')
}

export default function SuggestionsPanel({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible = suggestions.filter((s) => !dismissed.has(s.key))
  if (visible.length === 0) return null

  async function accept(s: Suggestion) {
    setPending(s.key)
    setError(null)
    try {
      if (s.kind === 'assign' && s.targetShiftId) {
        await updateShift(s.targetShiftId, { userId: s.userId })
      } else {
        await createShift({
          userId: s.userId,
          locationId: s.locationId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })
      }
      setDismissed((prev) => new Set(prev).add(s.key))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte Vorschlag nicht übernehmen.')
    } finally {
      setPending(null)
    }
  }

  function dismiss(key: string) {
    setDismissed((prev) => new Set(prev).add(key))
  }

  return (
    <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-violet-800 hover:bg-violet-100/60 transition-colors"
      >
        <span>✨</span>
        <span>Vorschläge zur Besetzung</span>
        <span className="ml-1 rounded-full bg-violet-200 text-violet-800 text-xs px-1.5 py-0.5">
          {visible.length}
        </span>
        <svg
          className={`ml-auto w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-2 pb-2 space-y-1.5">
          {error && (
            <div className="mx-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1.5">
              {error}
            </div>
          )}
          {visible.map((s) => {
            const day = format(new Date(s.date + 'T12:00:00'), 'EEEEEE dd.MM.', { locale: de })
            return (
              <div
                key={s.key}
                className="flex items-center gap-3 rounded-md bg-white border border-violet-100 px-3 py-2 text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.locationColor }}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-gray-900">{s.userName}</span>
                  <span className="text-gray-600">
                    {' '}→ {day}, {s.startTime}–{s.endTime} Uhr
                    {s.locationName ? ` · ${s.locationName}` : ''}
                  </span>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span>
                      {s.remainingHours != null
                        ? `hat noch ${fmtHours(s.remainingHours)} h frei diese Woche`
                        : 'keine Wochengrenze gesetzt'}
                    </span>
                    {s.preferredDay && (
                      <span className="rounded bg-green-100 text-green-700 px-1 py-px text-[10px] font-medium">
                        Wunschtag
                      </span>
                    )}
                    {s.primaryMatch && (
                      <span className="rounded bg-blue-100 text-blue-700 px-1 py-px text-[10px] font-medium">
                        Stammstandort
                      </span>
                    )}
                    {s.trimmed && (
                      <span className="rounded bg-amber-100 text-amber-700 px-1 py-px text-[10px] font-medium">
                        an Zeitfenster angepasst
                      </span>
                    )}
                    {s.kind === 'assign' && (
                      <span className="rounded bg-gray-100 text-gray-600 px-1 py-px text-[10px] font-medium">
                        besetzt offene Schicht
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => accept(s)}
                  disabled={pending === s.key}
                  className="shrink-0 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                >
                  {pending === s.key ? '…' : 'Übernehmen'}
                </button>
                <button
                  onClick={() => dismiss(s.key)}
                  disabled={pending === s.key}
                  className="shrink-0 text-gray-400 hover:text-gray-600 disabled:opacity-50 px-1"
                  aria-label="Verwerfen"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
