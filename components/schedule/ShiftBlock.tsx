'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ShiftData } from './WeekGrid'

type Props = {
  shift: ShiftData
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onEdit: (shift: ShiftData) => void
  previewEndTime?: string
  applicationCount?: number
}

export default function ShiftBlock({ shift, onDelete, onDuplicate, onEdit, previewEndTime, applicationCount = 0 }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
  })

  const { attributes: resizeAttributes, listeners: resizeListeners, setNodeRef: setResizeRef } = useDraggable({
    id: `resize-end__${shift.id}`,
  })

  const isUnassigned = !shift.userId
  const isActive = shift.status === 'ACTIVE' || (!!shift.timeEntry && !shift.timeEntry.checkoutAt)
  const isDone = shift.status === 'DONE' || !!shift.timeEntry?.checkoutAt
  const bgColor = isUnassigned ? '#d97706' : isActive ? '#22c55e' : shift.location.color
  const displayEndTime = previewEndTime ?? shift.endTime
  const isResizing = !!previewEndTime

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        backgroundColor: isUnassigned ? undefined : bgColor,
        borderColor: isUnassigned ? bgColor : undefined,
      }}
      className={`group/block relative w-full rounded-lg cursor-grab active:cursor-grabbing select-none transition-opacity duration-150 ${
        isUnassigned
          ? 'border-2 border-dashed bg-amber-50 text-amber-800'
          : 'text-white'
      }`}
      onClick={() => onEdit(shift)}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
    >
      <div className="px-2.5 py-2 pb-3">
        <div className="font-semibold text-sm leading-tight">
          {shift.startTime} –{' '}
          <span className={isResizing ? 'bg-black/10 rounded px-0.5' : ''}>{displayEndTime}</span>
        </div>
        {isUnassigned ? (
          <>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: shift.location.color }} />
              <span className="text-[10px] text-amber-800 truncate font-medium">{shift.location.name}</span>
            </div>
            <div className="text-[10px] text-amber-500 mt-0.5">+ Mitarbeiter wählen</div>
          </>
        ) : (
          <div className="text-[10px] truncate mt-0.5 text-white/70">{shift.location.name}</div>
        )}
      </div>

      {isDone && (
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/60"
          title="Abgeschlossen"
        />
      )}

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDuplicate(shift.id) }}
        className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full text-gray-500 hover:text-indigo-600 shadow flex items-center justify-center opacity-0 group-hover/block:opacity-100 pointer-events-none group-hover/block:pointer-events-auto transition duration-[125ms]"
        title="Schicht duplizieren"
        aria-label="Schicht duplizieren"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {isUnassigned && applicationCount > 0 ? (
        <span
          className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 bg-amber-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow pointer-events-none"
          aria-label={`${applicationCount} Bewerbung${applicationCount !== 1 ? 'en' : ''}`}
        >
          {applicationCount}
        </span>
      ) : (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(shift.id) }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full text-gray-500 hover:text-red-500 shadow flex items-center justify-center opacity-0 group-hover/block:opacity-100 pointer-events-none group-hover/block:pointer-events-auto transition duration-[125ms]"
          title="Schicht löschen"
          aria-label="Schicht löschen"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

    </div>
  )
}
