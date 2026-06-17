'use client'

import { deleteEmployee, archiveEmployee } from '@/app/actions/employees'

type Props = { id: string; name: string; isSuperAdmin: boolean }

export default function DeleteEmployeeButton({ id, name, isSuperAdmin }: Props) {
  async function handleDelete() {
    if (!confirm(`${name} wirklich löschen? Alle Schichten werden ebenfalls gelöscht.`)) return
    await deleteEmployee(id)
  }

  async function handleArchive() {
    if (!confirm(`${name} archivieren?`)) return
    await archiveEmployee(id)
  }

  if (isSuperAdmin) {
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

  return (
    <button
      onClick={handleArchive}
      className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition active:scale-[0.97]"
      title={`${name} archivieren`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    </button>
  )
}
