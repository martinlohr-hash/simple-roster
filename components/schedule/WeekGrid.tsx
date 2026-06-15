'use client'

import { useState, useCallback } from 'react'
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
import { updateShift, deleteShift, createShift, duplicateShift } from '@/app/actions/shifts'
import { addMinutesToTime } from '@/lib/timeUtils'
import CoverageWarningsBar from './CoverageWarningsBar'
import { computeCoverageWarnings, type CoverageRuleData } from '@/lib/coverage'

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

type Props = {
  shifts: ShiftData[]
  users: UserData[]
  locations: LocationData[]
  weekStart: Date
  dayNotes: Record<string, string>
  coverageRules: CoverageRuleData[]
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function WeekGrid({ shifts, users, locations, weekStart, dayNotes, coverageRules }: Props) {
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null)
  const [resizingShift, setResizingShift] = useState<{ id: string; previewEndTime: string } | null>(null)
  const [modalCell, setModalCell] = useState<{ userId: string; date: string } | null>(null)
  const [editShift, setEditShift] = useState<ShiftData | null>(null)
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const filteredShifts = filterLocationId
    ? shifts.filter((s) => s.locationId === filterLocationId)
    : shifts

  const unassignedShifts = filteredShifts.filter((s) => !s.userId)

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
      .filter((s) => s.userId === userId && s.timeEntry?.checkoutAt)
      .reduce((sum, s) => {
        const entry = s.timeEntry!
        const ms = new Date(entry.checkoutAt!).getTime() - new Date(entry.checkinAt).getTime()
        return sum + ms / 3_600_000
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

  async function handleCreate(data: {
    userId: string
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
      {dragError && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {dragError}
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilterLocationId(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition active:scale-[0.97] ${filterLocationId === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Alle Standorte
        </button>
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setFilterLocationId(loc.id === filterLocationId ? null : loc.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-full transition active:scale-[0.97]"
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-36 bg-gray-50 px-4 text-left">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">KW {getISOWeek(weekStart)}</span>
                </th>
                {days.map((day, i) => (
                  <th
                    key={i}
                    className="text-center text-xs font-medium text-gray-500 px-2 py-3 bg-gray-50 min-w-[120px]"
                  >
                    <div className={isToday(day) ? 'text-indigo-600 font-semibold' : ''}>
                      {DAY_NAMES[i]}
                    </div>
                    <div
                      className={`text-sm mt-0.5 ${isToday(day) ? 'text-indigo-600 font-semibold' : 'text-gray-900'}`}
                    >
                      {format(day, 'd. MMM', { locale: de })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coverageRules.length > 0 && (
                <tr className="border-b border-gray-100 bg-amber-50/40">
                  <td className="px-4 py-1 align-top">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Vorgaben</span>
                  </td>
                  {days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const dayShifts = shifts.filter((s) => s.date.startsWith(dateStr))
                    const warnings = computeCoverageWarnings(dayShifts, coverageRules, day)
                    const dow = (day.getDay() + 6) % 7
                    const hasRules = coverageRules.some((r) => r.dayOfWeek === dow)
                    const hasShifts = dayShifts.some((s) => s.userId)
                    return (
                      <td key={i} className="align-top border-l border-gray-100 first:border-l-0 py-1">
                        <CoverageWarningsBar warnings={warnings} hasRules={hasRules} hasShifts={hasShifts} />
                      </td>
                    )
                  })}
                </tr>
              )}
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <td className="px-4 py-1 align-top">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Notizen</span>
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
              {unassignedShifts.length > 0 && (
                <tr className="group bg-amber-50/40">
                  <td className="px-4 py-3 align-top bg-amber-50/60">
                    <div className="text-sm font-medium text-amber-700">Nicht besetzt</div>
                    <div className="text-xs text-amber-500 mt-0.5">Klicken zum Zuweisen</div>
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
                              />
                            ))}
                          </div>
                        </DropCell>
                      </td>
                    )
                  })}
                </tr>
              )}
              {users.map((user) => {
                const weekHours = getWeekHours(user.id)
                const light = getLight(weekHours, user.maxHoursWeek)
                return (
                  <tr key={user.id} className="group">
                    <td className="px-4 py-3 align-top bg-gray-50/50">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      {user.maxHoursWeek && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${light === 'red' ? 'bg-red-500' : light === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          />
                          <span className="text-xs text-gray-400">
                            {weekHours.toFixed(1)}h / {user.maxHoursWeek}h
                          </span>
                        </div>
                      )}
                    </td>
                    {days.map((day, di) => {
                      const cellShifts = getShiftsForCell(user.id, day)
                      const dateStr = format(day, 'yyyy-MM-dd')
                      return (
                        <td key={di} className="p-0 align-top">
                          <DropCell id={`${user.id}__${dateStr}`}>
                            <div className="flex flex-col gap-1 p-1.5 min-h-[56px]">
                              {cellShifts.map((shift) => (
                                <ShiftBlock
                                  key={shift.id}
                                  shift={shift}
                                  onDelete={handleDelete}
                                  onDuplicate={handleDuplicate}
                                  onEdit={handleEdit}
                                  previewEndTime={resizingShift?.id === shift.id ? resizingShift.previewEndTime : undefined}
                                />
                              ))}
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => setModalCell({ userId: user.id, date: dateStr })}
                                className="w-full rounded border border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 transition text-xs py-1 flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                + Schicht
                              </button>
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
