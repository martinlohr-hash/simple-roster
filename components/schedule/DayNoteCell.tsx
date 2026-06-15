'use client'

import { useState, useRef, useEffect } from 'react'
import { upsertDayNote } from '@/app/actions/dayNotes'

type Props = {
  date: string
  initialContent: string
}

export default function DayNoteCell({ date, initialContent }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialContent)
  const [saved, setSaved] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  async function save() {
    setEditing(false)
    if (value === saved) return
    setSaved(value)
    await upsertDayNote(date, value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setValue(saved)
      setEditing(false)
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    }
  }

  if (editing) {
    return (
      <div className="px-1.5 py-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Hinweis eintragen…"
          className="w-full resize-none text-[11px] text-gray-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 leading-snug placeholder-gray-300"
        />
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="px-1.5 py-1 min-h-[32px] cursor-text group/note"
      title="Klicken zum Bearbeiten"
    >
      {value ? (
        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 shadow-sm">
          <svg className="w-3 h-3 text-amber-500 mt-px shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          <p className="text-[11px] font-medium text-amber-800 leading-snug whitespace-pre-wrap break-words">
            {value}
          </p>
        </div>
      ) : (
        <span className="text-[10px] text-gray-300 opacity-0 group-hover/note:opacity-100 transition-opacity select-none">
          + Hinweis
        </span>
      )}
    </div>
  )
}
