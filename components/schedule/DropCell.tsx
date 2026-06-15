'use client'

import { useDroppable } from '@dnd-kit/core'

type Props = {
  id: string
  children: React.ReactNode
}

export default function DropCell({ id, children }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors px-0.5 ${isOver ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''}`}
    >
      {children}
    </div>
  )
}
