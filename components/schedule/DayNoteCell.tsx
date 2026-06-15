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
        <p className="text-[11px] text-amber-700 leading-snug whitespace-pre-wrap break-words">
          {value}
        </p>
      ) : (
        <span className="text-[10px] text-gray-300 opacity-0 group-hover/note:opacity-100 transition-opacity select-none">
          + Hinweis
        </span>
      )}
    </div>
  )
}
