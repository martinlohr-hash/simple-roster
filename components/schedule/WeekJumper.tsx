'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

export default function WeekJumper({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ws = parseISO(weekStart)
  const label = `${format(ws, 'd. MMMM', { locale: de })} – ${format(addDays(ws, 6), 'd. MMMM yyyy', { locale: de })}`

  function navigate(value: string) {
    if (!value) return
    const picked = new Date(value + 'T00:00:00')
    const monday = startOfWeek(picked, { weekStartsOn: 1 })
    router.push(`/admin/schedule?week=${format(monday, 'yyyy-MM-dd')}`)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') navigate((e.target as HTMLInputElement).value)
    if (e.key === 'Escape') setOpen(false)
  }

  // Close only when focus truly leaves the container (not when native calendar popup opens)
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block mt-1" onBlur={handleBlur}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors select-none"
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[220px]">
          <div className="text-xs font-medium text-gray-400 mb-2">Woche auswählen</div>
          <input
            ref={inputRef}
            type="date"
            defaultValue={weekStart}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => navigate(inputRef.current?.value ?? '')}
            className="mt-2 w-full py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
          >
            Zur Woche →
          </button>
          <div className="text-xs text-gray-400 mt-1.5 text-center">oder Enter drücken</div>
        </div>
      )}
    </div>
  )
}
