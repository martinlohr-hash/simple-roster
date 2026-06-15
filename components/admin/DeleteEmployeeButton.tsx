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
      className="text-xs text-red-500 hover:text-red-600 font-medium transition active:scale-[0.97]"
    >
      Löschen
    </button>
  )
}
