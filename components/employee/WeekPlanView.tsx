'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, addWeeks, subWeeks, endOfWeek, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { shiftDurationHours } from '@/lib/timeUtils'

type Colleague = { name: string; startTime: string; endTime: string }

type ShiftData = {
  startTime: string
  endTime: string
  location: { name: string; color: string }
  colleagues: Colleague[]
}

type DayData = {
  date: string
  isVacation: boolean
  // Alle Schichten des Tages (Doppelschichten möglich, z. B. zwei Standorte)
  shifts: ShiftData[]
}

type Props = {
  weekStart: string
  days: DayData[]
  userName: string
  userId: string
}

const calcDurationH = shiftDurationHours

function formatDuration(h: number): string {
  return h.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' h'
}

function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ColleaguesSection({
  own,
  colleagues,
  showHint,
  onHintDismiss,
}: {
  own: { startTime: string; endTime: string }
  colleagues: Colleague[]
  showHint?: boolean
  onHintDismiss?: () => void
}) {
  const [open, setOpen] = useState(false)
  const max = 3
  const shown = colleagues.slice(0, max)
  const rest = colleagues.length - max

  const everyone = [{ name: 'Du', startTime: own.startTime, endTime: own.endTime }, ...colleagues].sort(
    (a, b) => a.startTime.localeCompare(b.startTime),
  )

  return (
    <div className="mt-2.5">
      {showHint && (
        <div className="relative mb-2">
          <div className="flex items-center gap-2 bg-indigo-600 text-white text-[11px] font-medium rounded-lg px-3 py-2 shadow-lg">
            <span className="flex-1">✨ Neu: Tippe hier, um zu sehen, wer wann mit dir arbeitet</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onHintDismiss?.()
              }}
              className="shrink-0 text-indigo-200 hover:text-white leading-none text-sm"
              aria-label="Hinweis schließen"
            >
              ✕
            </button>
          </div>
          <div className="w-2.5 h-2.5 bg-indigo-600 rotate-45 absolute -bottom-[5px] left-4" />
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          onHintDismiss?.()
        }}
        className="w-full flex items-center gap-1.5"
        aria-expanded={open}
      >
        <div className="flex -space-x-1.5">
          {shown.map((c, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[11px] font-semibold text-gray-600"
              title={c.name}
            >
              {initials(c.name)}
            </div>
          ))}
        </div>
        {rest > 0 && <span className="text-xs text-gray-500">+{rest} weitere</span>}
        <svg
          className={`w-3.5 h-3.5 text-gray-300 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {everyone.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className={c.name === 'Du' ? 'font-semibold text-gray-800' : 'text-gray-600'}>{c.name}</span>
                <span className="text-gray-500 tabular-nums">
                  {c.startTime} – {c.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShiftCard({
  shift,
  showHint,
  onHintDismiss,
}: {
  shift: ShiftData
  showHint?: boolean
  onHintDismiss?: () => void
}) {
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
          <ColleaguesSection
            own={{ startTime: shift.startTime, endTime: shift.endTime }}
            colleagues={shift.colleagues}
            showHint={showHint}
            onHintDismiss={onHintDismiss}
          />
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
      <span className="text-sm text-gray-500 font-medium">Freier Tag</span>
    </div>
  )
}

function VacationCard() {
  return (
    <div className="flex-1 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2.5 px-4 py-3">
      <span className="text-lg leading-none">🏖</span>
      <span className="text-sm text-emerald-700 font-semibold">Urlaub</span>
    </div>
  )
}

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function WeekPlanView({ weekStart, days, userName, userId }: Props) {
  const router = useRouter()
  const start = parseISO(weekStart)
  const end = endOfWeek(start, { weekStartsOn: 1 })

  const hintKey = `roster_colleague_hint_${userId}`
  const [hintDismissed, setHintDismissed] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHintDismissed(!!localStorage.getItem(hintKey))
  }, [hintKey])

  function dismissHint() {
    localStorage.setItem(hintKey, '1')
    setHintDismissed(true)
  }

  // Erste Schicht der Woche mit Kollegen – dort wird der Hinweis angezeigt
  const firstColleagueShift = days
    .flatMap((day, di) => day.shifts.map((shift, si) => ({ di, si, hasColleagues: shift.colleagues.length > 0 })))
    .find((x) => x.hasColleagues)

  const startMonth = format(start, 'MMMM', { locale: de })
  const endMonth = format(end, 'MMMM', { locale: de })
  const year = format(end, 'yyyy')
  const kw = getISOWeek(start)

  const weekLabel =
    startMonth === endMonth
      ? `${format(start, 'd')}. – ${format(end, 'd')}. ${startMonth} ${year}`
      : `${format(start, 'd')}. ${startMonth} – ${format(end, 'd')}. ${endMonth} ${year}`

  const firstName = userName.split(' ')[0]

  function navigate(direction: 'prev' | 'next') {
    const target = direction === 'prev' ? subWeeks(start, 1) : addWeeks(start, 1)
    router.push(`?week=${format(target, 'yyyy-MM-dd')}`)
  }

  return (
    <div className="space-y-3">
      {/* Name header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mein Plan</h1>
        <p className="text-sm text-gray-500">{firstName}</p>
      </div>

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
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">KW {kw}</p>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{weekLabel}</p>
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
                <p className="text-[11px] font-medium text-gray-500 leading-none">{DAY_SHORT[i]}</p>
                <p className="text-xl font-bold text-gray-800 leading-tight mt-0.5">{format(date, 'd')}</p>
                <p className="text-[11px] text-gray-500 leading-none mt-0.5">{format(date, 'MMM', { locale: de })}</p>
              </div>

              {/* Card(s) – bei Doppelschichten alle untereinander */}
              {day.shifts.length > 0 ? (
                <div className="flex-1 space-y-2">
                  {day.shifts.map((shift, si) => (
                    <ShiftCard
                      key={si}
                      shift={shift}
                      showHint={!hintDismissed && firstColleagueShift?.di === i && firstColleagueShift?.si === si}
                      onHintDismiss={dismissHint}
                    />
                  ))}
                </div>
              ) : day.isVacation ? (
                <VacationCard />
              ) : (
                <FreeDayCard />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
