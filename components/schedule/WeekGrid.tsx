'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { format, addDays, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import ShiftBlock from './ShiftBlock'
import DropCell from './DropCell'
import CreateShiftModal from './CreateShiftModal'
import ShiftEditModal from './ShiftEditModal'
import DayNoteCell from './DayNoteCell'
import Link from 'next/link'
import { updateShift, deleteShift, createShift, duplicateShift } from '@/app/actions/shifts'
import { releaseWeek, revokeWeekRelease, assignShiftToApplicant } from '@/app/actions/bidding'
import { addMinutesToTime } from '@/lib/timeUtils'
import CoverageWarningsBar from './CoverageWarningsBar'
import { computeCoverageWarnings, type CoverageRuleData } from '@/lib/coverage'
import EmployeeEditModal from '@/components/admin/EmployeeEditModal'

export type ShiftData = {
  id: string
  userId: string | null
  locationId: string
  date: string
  startTime: string
  endTime: string
  status: string
  user: { id: string; name: string; maxHoursWeek: number | null; maxHoursMonth: number | null } | null
  location: { id: string; name: string; color: string }
  timeEntry: { checkinAt: string; checkoutAt: string | null } | null
}

export type UserData = {
  id: string
  name: string
  maxHoursWeek: number | null
  maxHoursMonth: number | null
}

export type LocationData = {
  id: string
  name: string
  color: string
}

export type ApplicationData = {
  id: string
  shiftId: string
  userId: string
  status: 'PENDING' | 'ASSIGNED' | 'REJECTED'
  user: { id: string; name: string }
}

export type VacationData = {
  id: string
  userId: string
  startDate: string
  endDate: string
}

type Props = {
  shifts: ShiftData[]
  users: UserData[]
  locations: LocationData[]
  weekStart: Date
  weekStartStr: string
  dayNotes: Record<string, string>
  coverageRules: CoverageRuleData[]
  prevWeekHref: string
  nextWeekHref: string
  isWeekReleased: boolean
  applications: ApplicationData[]
  vacations: VacationData[]
  holidays: Record<string, string>
  isSuperAdmin?: boolean
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function WeekGrid({ shifts, users, locations, weekStart, weekStartStr, dayNotes, coverageRules, prevWeekHref, nextWeekHref, isWeekReleased, applications, vacations, holidays, isSuperAdmin }: Props) {
  const router = useRouter()
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null)
  const [resizingShift, setResizingShift] = useState<{ id: string; previewEndTime: string } | null>(null)
  const [modalCell, setModalCell] = useState<{ userId: string | null; date: string } | null>(null)
  const [editShift, setEditShift] = useState<ShiftData | null>(null)
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const filteredShifts = filterLocationId
    ? shifts.filter((s) => s.locationId === filterLocationId)
    : shifts

  const unassignedShifts = filteredShifts.filter((s) => !s.userId)

  function isOnVacation(userId: string, date: Date): boolean {
    const d = date.getTime()
    return vacations.some((v) => {
      if (v.userId !== userId) return false
      const start = new Date(v.startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(v.endDate)
      end.setHours(23, 59, 59, 999)
      return d >= start.getTime() && d <= end.getTime()
    })
  }

  function getShiftsForCell(userId: string, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredShifts.filter((s) => s.userId === userId && s.date.startsWith(dateStr))
  }

  function getUnassignedForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return unassignedShifts.filter((s) => s.date.startsWith(dateStr))
  }

  function getWeekHours(userId: string) {
    return shifts
      .filter((s) => s.userId === userId)
      .reduce((sum, s) => {
        const [sh, sm] = s.startTime.split(':').map(Number)
        const [eh, em] = s.endTime.split(':').map(Number)
        return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60
      }, 0)
  }

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id)
      if (id.startsWith('resize-end__')) {
        const shiftId = id.slice('resize-end__'.length)
        const shift = shifts.find((s) => s.id === shiftId)
        if (shift) setResizingShift({ id: shiftId, previewEndTime: shift.endTime })
      } else {
        setActiveShift(shifts.find((s) => s.id === id) || null)
      }
    },
    [shifts],
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!resizingShift) return
      const shift = shifts.find((s) => s.id === resizingShift.id)
      if (!shift) return
      const deltaMinutes = Math.round(event.delta.y / 10) * 15
      const rawEnd = addMinutesToTime(shift.endTime, deltaMinutes)
      const minEnd = addMinutesToTime(shift.startTime, 15)
      const clampedEnd = rawEnd < minEnd ? minEnd : rawEnd
      setResizingShift((prev) => prev ? { ...prev, previewEndTime: clampedEnd } : null)
    },
    [resizingShift, shifts],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (resizingShift) {
        const { id, previewEndTime } = resizingShift
        setResizingShift(null)
        try {
          await updateShift(id, { endTime: previewEndTime })
        } catch (err) {
          setDragError(err instanceof Error ? err.message : 'Größe ändern fehlgeschlagen')
          setTimeout(() => setDragError(null), 5000)
        }
        return
      }

      setActiveShift(null)
      setDragError(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      const parts = String(over.id).split('__')
      const newUserId = parts[0] === 'unassigned' ? null : parts[0]
      const newDateStr = parts[1]
      const shift = shifts.find((s) => s.id === active.id)
      if (!shift) return
      try {
        await updateShift(String(active.id), { userId: newUserId, date: newDateStr })
      } catch (err) {
        setDragError(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen')
        setTimeout(() => setDragError(null), 5000)
      }
    },
    [resizingShift, shifts],
  )

  async function handleDelete(id: string) {
    await deleteShift(id)
  }

  async function handleDuplicate(id: string) {
    await duplicateShift(id)
  }

  function handleEdit(shift: ShiftData) {
    setEditShift(shift)
  }

  async function handleEditSave(id: string, data: { startTime: string; endTime: string; locationId: string; userId: string | null }) {
    await updateShift(id, data)
    setEditShift(null)
  }

  async function handleEditDelete(id: string) {
    await deleteShift(id)
    setEditShift(null)
  }

  async function handleAssign(shiftId: string, applicantUserId: string) {
    await assignShiftToApplicant(shiftId, applicantUserId)
    setEditShift(null)
  }

  async function handleRelease() {
    setReleasing(true)
    try {
      await releaseWeek(weekStartStr)
    } finally {
      setReleasing(false)
    }
  }

  async function handleRevoke() {
    if (!confirm('Freigabe zurückziehen? Mitarbeiter sehen diese Woche dann nicht mehr unter "Bewerben".')) return
    setRevoking(true)
    try {
      await revokeWeekRelease(weekStartStr)
    } finally {
      setRevoking(false)
    }
  }

  async function handleCreate(data: {
    userId: string | null
    locationId: string
    date: string
    startTime: string
    endTime: string
  }) {
    await createShift(data)
    setModalCell(null)
  }

  return (
    <>
      {/* ─── MOBILE VIEW ──────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col bg-white">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dienstplan</h1>
            <div className="text-xs text-gray-400 mt-0.5">
              KW {getISOWeek(weekStart)} · {format(weekStart, 'd. MMM', { locale: de })} – {format(days[6], 'd. MMM yyyy', { locale: de })}
            </div>
          </div>
          <div className="mt-1 shrink-0">
            {isWeekReleased ? (
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg border border-green-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {revoking ? '…' : 'Freigegeben'}
              </button>
            ) : (
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="px-2.5 py-1 bg-white border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {releasing ? '…' : 'Freigeben'}
              </button>
            )}
          </div>
        </div>

        {/* Location filter + week navigation */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFilterLocationId(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition shrink-0 ${
                filterLocationId === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Alle
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setFilterLocationId(loc.id === filterLocationId ? null : loc.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition shrink-0"
                style={
                  filterLocationId === loc.id
                    ? { backgroundColor: loc.color, color: '#fff' }
                    : { backgroundColor: '#f3f4f6', color: '#4b5563' }
                }
              >
                {loc.name}
              </button>
            ))}
          </div>
          <div className="flex items-center shrink-0 rounded-xl border border-gray-200 overflow-hidden">
            <Link
              href={prevWeekHref}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition border-r border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link
              href="/admin/schedule"
              className="px-3 h-9 flex items-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Heute
            </Link>
            <Link
              href={nextWeekHref}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition border-l border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Scrollable grid */}
        <div className="px-3 pb-3">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: '472px', width: '100%' }}>
              <thead>
                {/* Offene Schichten row */}
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left border-r border-gray-100 w-[108px]">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[9px] font-semibold text-gray-500 leading-tight">Offene Schichten</span>
                    </div>
                  </th>
                  {days.map((day, i) => {
                    const count = getUnassignedForDay(day).length
                    return (
                      <th key={i} className="text-center px-1 py-2 min-w-[52px]">
                        <div className="h-4 flex items-center justify-center">
                          {count === 0 ? (
                            <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold text-red-500">{count}</span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
                {/* Day headers */}
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left border-r border-gray-100 w-[108px]">
                    <span className="text-[10px] font-semibold text-gray-400">Mitarbeiter</span>
                  </th>
                  {days.map((day, i) => {
                    const today = isToday(day)
                    return (
                      <th key={i} className="text-center px-1 py-2 min-w-[52px]">
                        <div className={`text-[10px] font-medium ${today ? 'text-indigo-500' : 'text-gray-400'}`}>
                          {DAY_NAMES[i]}
                        </div>
                        <div className={`text-sm font-bold ${today ? 'text-indigo-600' : 'text-gray-800'}`}>
                          {format(day, 'd')}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const weekHours = getWeekHours(user.id)
                  const light = getLight(weekHours, user.maxHoursWeek)
                  const dotColor =
                    weekHours === 0
                      ? 'bg-gray-300'
                      : light === 'red'
                        ? 'bg-red-500'
                        : light === 'yellow'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                  return (
                    <tr key={user.id}>
                      <td className="sticky left-0 z-10 bg-white border-r border-gray-100 px-2 py-2 align-top w-[108px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditEmployeeId(user.id)}
                            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 shrink-0 hover:bg-gray-300 transition"
                          >
                            {getInitials(user.name)}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium text-gray-900 leading-tight break-words">
                              {user.name}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                              <span className="text-[10px] text-gray-400">
                                {weekHours === 0
                                  ? '0h'
                                  : weekHours % 1 === 0
                                    ? `${weekHours.toFixed(0)}h`
                                    : `${weekHours.toFixed(1)}h`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {days.map((day, di) => {
                        const cellShifts = getShiftsForCell(user.id, day)
                        const onVacation = isOnVacation(user.id, day)
                        const dateStr = format(day, 'yyyy-MM-dd')
                        return (
                          <td key={di} className="p-1 align-middle text-center min-w-[52px]">
                            {onVacation ? (
                              <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-tight">
                                Urlaub
                              </span>
                            ) : cellShifts.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {cellShifts.map((shift) => (
                                  <button
                                    key={shift.id}
                                    onClick={() => setEditShift(shift)}
                                    className="rounded-md px-0.5 py-1.5 text-white font-semibold text-center w-full transition active:scale-95"
                                    style={{ backgroundColor: shift.location.color, fontSize: '10px', lineHeight: '1.2' }}
                                  >
                                    {formatMobileTime(shift.startTime)}–{formatMobileTime(shift.endTime)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={() => setModalCell({ userId: user.id, date: dateStr })}
                                className="text-gray-300 hover:text-indigo-400 transition w-full h-9 flex items-center justify-center text-sm"
                              >
                                –
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: loc.color }} />
              <span className="text-xs text-gray-600">{loc.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-base leading-none">–</span>
            <span className="text-xs text-gray-600">Frei</span>
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => setModalCell({ userId: null, date: format(new Date(), 'yyyy-MM-dd') })}
          className="fixed bottom-[84px] right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-indigo-700 transition active:scale-95 z-20"
          aria-label="Neue Schicht erstellen"
        >
          +
        </button>
      </div>

      {/* ─── DESKTOP VIEW ─────────────────────────────────────────── */}
      <div className="hidden md:block">
      {dragError && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {dragError}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterLocationId(null)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors duration-150 active:scale-[0.97] ${
              filterLocationId === null
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Alle Standorte
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setFilterLocationId(loc.id === filterLocationId ? null : loc.id)}
              className="px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors duration-150 active:scale-[0.97]"
              style={
                filterLocationId === loc.id
                  ? { backgroundColor: loc.color, color: '#fff' }
                  : { color: '#4b5563' }
              }
            >
              {loc.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isWeekReleased ? (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition active:scale-[0.97] group"
              title="Freigabe zurückziehen"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 group-hover:bg-red-500 inline-block transition-colors" />
              {revoking ? 'Wird zurückgezogen...' : 'Freigegeben'}
            </button>
          ) : (
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="px-3 py-1.5 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition active:scale-[0.97]"
            >
              {releasing ? 'Wird freigegeben...' : 'Woche freigeben'}
            </button>
          )}
          <div className="flex items-center gap-1">
            <Link
              href={prevWeekHref}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 font-medium"
            >
              ← Vorwoche
            </Link>
            <Link
              href="/admin/schedule"
              className="px-3.5 py-1.5 text-sm font-medium rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors duration-150"
            >
              Heute
            </Link>
            <Link
              href={nextWeekHref}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 font-medium"
            >
              Nächste Woche →
            </Link>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="w-44 bg-gray-50/80 px-4 py-3 text-left">
                  <span className="text-xs font-semibold text-gray-400">KW {getISOWeek(weekStart)}</span>
                </th>
                {days.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const holiday = holidays[dateStr]
                  return (
                    <th
                      scope="col"
                      key={i}
                      className="text-center px-2 py-3 bg-gray-50/80 min-w-[120px]"
                    >
                      <div className={`text-xs font-medium ${isToday(day) ? 'text-indigo-500' : 'text-gray-400'}`}>
                        {DAY_NAMES[i]}
                      </div>
                      <div className={`text-sm font-semibold mt-0.5 ${isToday(day) ? 'text-indigo-600' : 'text-gray-800'}`}>
                        {format(day, 'd. MMM', { locale: de })}
                      </div>
                      {holiday && (
                        <div className="text-[10px] font-medium text-amber-600 mt-0.5 leading-tight">
                          {holiday}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {coverageRules.length > 0 && (
                <tr className="border-b border-gray-100 bg-amber-50/40">
                  <td className="px-4 py-1 align-top">
                    <span className="text-[10px] font-medium text-gray-400">Vorgaben</span>
                  </td>
                  {days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const dayShifts = shifts.filter((s) => s.date.startsWith(dateStr))
                    const warnings = computeCoverageWarnings(dayShifts, coverageRules, day)
                    const dow = (day.getDay() + 6) % 7
                    const dayRules = coverageRules.filter((r) => r.dayOfWeek === dow)
                    const hasShifts = dayShifts.length > 0
                    return (
                      <td key={i} className="align-top border-l border-gray-100 first:border-l-0 py-1">
                        <CoverageWarningsBar warnings={warnings} dayRules={dayRules} locations={locations} hasShifts={hasShifts} />
                      </td>
                    )
                  })}
                </tr>
              )}
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <td className="px-4 py-1 align-top">
                  <span className="text-[10px] font-medium text-gray-400">Notizen</span>
                </td>
                {days.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  return (
                    <td key={i} className="p-0 align-top border-l border-gray-100 first:border-l-0">
                      <DayNoteCell key={dateStr} date={dateStr} initialContent={dayNotes[dateStr] ?? ''} />
                    </td>
                  )
                })}
              </tr>
            </tbody>
            <tbody className="divide-y divide-gray-100">
              <tr className="group bg-amber-50/30">
                  <td className="px-3 py-3 align-top bg-amber-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-amber-700">Nicht besetzt</div>
                        <div className="text-xs text-amber-500 mt-0.5">Klicken zum Zuweisen</div>
                      </div>
                    </div>
                  </td>
                  {days.map((day, di) => {
                    const dayShifts = getUnassignedForDay(day)
                    const dateStr = format(day, 'yyyy-MM-dd')
                    return (
                      <td key={di} className="p-0 align-top">
                        <DropCell id={`unassigned__${dateStr}`}>
                          <div className="flex flex-col gap-1 p-1.5 min-h-[56px]">
                            {dayShifts.map((shift) => (
                              <ShiftBlock
                                key={shift.id}
                                shift={shift}
                                onDelete={handleDelete}
                                onDuplicate={handleDuplicate}
                                onEdit={handleEdit}
                                previewEndTime={resizingShift?.id === shift.id ? resizingShift.previewEndTime : undefined}
                                applicationCount={applications.filter((a) => a.shiftId === shift.id && a.status === 'PENDING').length}
                              />
                            ))}
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => setModalCell({ userId: null, date: dateStr })}
                              className="w-full rounded border border-dashed border-amber-200 text-amber-300 hover:border-amber-400 hover:text-amber-500 transition text-xs py-1 flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              + Schicht
                            </button>
                          </div>
                        </DropCell>
                      </td>
                    )
                  })}
                </tr>
              {users.map((user) => {
                const weekHours = getWeekHours(user.id)
                const light = getLight(weekHours, user.maxHoursWeek)
                const initials = getInitials(user.name)
                return (
                  <tr key={user.id} className="group">
                    <td className="px-3 py-3 align-top bg-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setEditEmployeeId(user.id)}
                            className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors text-left"
                          >
                            {user.name}
                          </button>
                          {user.maxHoursWeek && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                aria-label={light === 'red' ? 'Stundenlimit überschritten' : light === 'yellow' ? 'Stundenlimit fast erreicht' : 'Stunden im grünen Bereich'}
                                className={`inline-block w-1.5 h-1.5 rounded-full ${light === 'red' ? 'bg-red-500' : light === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}
                              />
                              <span className="text-xs text-gray-400">
                                {weekHours.toFixed(1)}h / {user.maxHoursWeek}h
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {days.map((day, di) => {
                      const cellShifts = getShiftsForCell(user.id, day)
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const onVacation = isOnVacation(user.id, day)
                      return (
                        <td key={di} className="p-0 align-top">
                          <DropCell id={`${user.id}__${dateStr}`}>
                            <div className="flex flex-col gap-1 p-1.5 min-h-[56px]">
                              {onVacation && (
                                <div className="px-2.5 py-2 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold text-center select-none">
                                  🏖 URLAUB
                                </div>
                              )}
                              {cellShifts.map((shift) => (
                                <ShiftBlock
                                  key={shift.id}
                                  shift={shift}
                                  onDelete={handleDelete}
                                  onDuplicate={handleDuplicate}
                                  onEdit={handleEdit}
                                  previewEndTime={resizingShift?.id === shift.id ? resizingShift.previewEndTime : undefined}
                                  applicationCount={applications.filter((a) => a.shiftId === shift.id && a.status === 'PENDING').length}
                                />
                              ))}
                              {!onVacation && (
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() => setModalCell({ userId: user.id, date: dateStr })}
                                  className="w-full rounded border border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 transition text-xs py-1 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                >
                                  + Schicht
                                </button>
                              )}
                            </div>
                          </DropCell>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <DragOverlay>
          {activeShift && (
            <div
              className="px-2.5 py-2 rounded-lg text-xs text-white font-semibold shadow-lg opacity-90 rotate-2"
              style={{ backgroundColor: activeShift.location.color }}
            >
              {activeShift.startTime} – {activeShift.endTime}
              <div className="text-white/80 text-[10px] font-normal mt-0.5">{activeShift.location.name}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      </div>

      {modalCell && (
        <CreateShiftModal
          userId={modalCell.userId}
          date={modalCell.date}
          locations={locations}
          onClose={() => setModalCell(null)}
          onCreate={handleCreate}
        />
      )}

      {editShift && (
        <ShiftEditModal
          shift={editShift}
          locations={locations}
          users={users}
          onClose={() => setEditShift(null)}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          isWeekReleased={isWeekReleased}
          applications={applications.filter((a) => a.shiftId === editShift.id)}
          onAssign={handleAssign}
        />
      )}
      {editEmployeeId && (
        <EmployeeEditModal
          userId={editEmployeeId}
          locations={locations}
          onClose={() => setEditEmployeeId(null)}
          onSaved={() => { setEditEmployeeId(null); router.refresh() }}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </>
  )
}

function isToday(date: Date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function getLight(actual: number, max: number | null | undefined): 'green' | 'yellow' | 'red' {
  if (!max) return 'green'
  const pct = actual / max
  if (pct >= 1) return 'red'
  if (pct >= 0.8) return 'yellow'
  return 'green'
}

function formatMobileTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return m === 0 ? String(h) : `${h}:${String(m).padStart(2, '0')}`
}
