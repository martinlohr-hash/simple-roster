'use client'

import { useRouter } from 'next/navigation'
import { format, parseISO, addWeeks, subWeeks, endOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'

type Colleague = { name: string }

type DayData = {
  date: string
  shift: {
    startTime: string
    endTime: string
    location: { name: string; color: string }
    colleagues: Colleague[]
  } | null
}

type Props = {
  weekStart: string
  days: DayData[]
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function calcDurationH(start: string, end: string): number {
  let diff = timeToMinutes(end) - timeToMinutes(start)
  if (diff <= 0) diff += 24 * 60
  return diff / 60
}

function formatDuration(h: number): string {
  return h.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' h'
}

function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ColleagueAvatars({ colleagues }: { colleagues: Colleague[] }) {
  const max = 3
  const shown = colleagues.slice(0, max)
  const rest = colleagues.length - max

  return (
    <div className="flex items-center gap-1.5 mt-2.5">
      <div className="flex -space-x-1.5">
        {shown.map((c, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-gray-600"
            title={c.name}
          >
            {initials(c.name)}
          </div>
        ))}
      </div>
      {rest > 0 && (
        <span className="text-xs text-gray-400">+{rest} weitere</span>
      )}
    </div>
  )
}

function ShiftCard({ shift }: { shift: NonNullable<DayData['shift']> }) {
  const duration = calcDurationH(shift.startTime, shift.endTime)
  const color = shift.location.color

  return (
    <div
      className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color }}>
            {shift.startTime} – {shift.endTime}
          </span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color + '1a', color }}
          >
            {formatDuration(duration)}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{shift.location.name}</p>
        {shift.colleagues.length > 0 && (
          <ColleagueAvatars colleagues={shift.colleagues} />
        )}
      </div>
    </div>
  )
}

function FreeDayCard() {
  return (
    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5 px-4 py-3">
      <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6" />
      </svg>
      <span className="text-sm text-gray-400 font-medium">Freier Tag</span>
    </div>
  )
}

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function WeekPlanView({ weekStart, days }: Props) {
  const router = useRouter()
  const start = parseISO(weekStart)
  const end = endOfWeek(start, { weekStartsOn: 1 })

  const startMonth = format(start, 'MMMM', { locale: de })
  const endMonth = format(end, 'MMMM', { locale: de })
  const year = format(end, 'yyyy')

  const weekLabel =
    startMonth === endMonth
      ? `${format(start, 'd')}. – ${format(end, 'd')}. ${startMonth} ${year}`
      : `${format(start, 'd')}. ${startMonth} – ${format(end, 'd')}. ${endMonth} ${year}`

  function navigate(direction: 'prev' | 'next') {
    const target = direction === 'prev' ? subWeeks(start, 1) : addWeeks(start, 1)
    router.push(`?week=${format(target, 'yyyy-MM-dd')}`)
  }

  return (
    <div className="space-y-3">
      {/* Week navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('prev')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition"
          aria-label="Vorherige Woche"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-gray-800">{weekLabel}</span>
        </div>
        <button
          onClick={() => navigate('next')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition"
          aria-label="Nächste Woche"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day rows */}
      <div className="space-y-2">
        {days.map((day, i) => {
          const date = parseISO(day.date)
          return (
            <div key={day.date} className="flex items-start gap-3">
              {/* Date column */}
              <div className="w-10 flex-shrink-0 pt-2.5 text-center">
                <p className="text-[11px] font-medium text-gray-400 leading-none">{DAY_SHORT[i]}</p>
                <p className="text-xl font-bold text-gray-800 leading-tight mt-0.5">{format(date, 'd')}</p>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5">{format(date, 'MMM', { locale: de })}</p>
              </div>

              {/* Card */}
              {day.shift ? <ShiftCard shift={day.shift} /> : <FreeDayCard />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
