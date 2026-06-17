'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DeleteEmployeeButton from './DeleteEmployeeButton'
import ResendInviteButton from './ResendInviteButton'
import EmployeeEditModal from './EmployeeEditModal'

type Location = { id: string; name: string; color: string }
type User = {
  id: string; name: string; email: string
  status: string; role: string
  hourlyRate: number; monthlyRate: number | null; overheadPercent: number
  maxHoursWeek: number | null; maxHoursMonth: number | null
  primaryLocation: { name: string } | null
  phone: string | null; address: string | null; birthday: string | null
  startDate: string | null
}

type Props = {
  users: User[]
  locations: Location[]
}

export default function EmployeesTable({ users, locations }: Props) {
  const router = useRouter()
  const [editId, setEditId] = useState<string | null>(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">E-Mail</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Handy</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Adresse</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Geburtstag</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Eintritt</th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditId(user.id)}
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left"
                  >
                    {user.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '–'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={user.address ?? undefined}>{user.address || '–'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.birthday ? new Date(user.birthday).toLocaleDateString('de-DE') : '–'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.startDate ? new Date(user.startDate).toLocaleDateString('de-DE') : '–'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    {user.status === 'PENDING' && <ResendInviteButton id={user.id} />}
                    <button
                      onClick={() => setEditId(user.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Bearbeiten
                    </button>
                    <DeleteEmployeeButton id={user.id} name={user.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">Noch keine Mitarbeiter angelegt.</p>
        )}
      </div>

      {editId && (
        <EmployeeEditModal
          userId={editId}
          locations={locations}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); router.refresh() }}
        />
      )}
    </>
  )
}
