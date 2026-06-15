'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

export default function WeekJumper({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const ws = parseISO(weekStart)
  const label = `${format(ws, 'd. MMMM', { locale: de })} – ${format(addDays(ws, 6), 'd. MMMM yyyy', { locale: de })}`

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const picked = new Date(e.target.value + 'T00:00:00')
    const monday = startOfWeek(picked, { weekStartsOn: 1 })
    router.push(`/admin/schedule?week=${format(monday, 'yyyy-MM-dd')}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block mt-1">
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
            type="date"
            defaultValue={weekStart}
            onChange={handleChange}
            autoFocus
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="text-xs text-gray-400 mt-2">Beliebiges Datum der Zielwoche wählen</div>
        </div>
      )}
    </div>
  )
}
