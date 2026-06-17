'use client'

import { deleteEmployee } from '@/app/actions/employees'

export default function DeleteEmployeeButton({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`${name} wirklich löschen? Alle Schichten werden ebenfalls gelöscht.`)) return
    await deleteEmployee(id)
  }

  return (
    <button
      onClick={handleDelete}
      className="w-6 h-6 flex items-center justify-center rounded bg-red-500 hover:bg-red-600 text-white transition active:scale-[0.97]"
      title={`${name} löschen`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}
