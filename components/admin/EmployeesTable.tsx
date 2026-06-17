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
  viewerRole: string
}

export default function EmployeesTable({ users, locations, viewerRole }: Props) {
  const router = useRouter()
  const [editId, setEditId] = useState<string | null>(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rolle</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">E-Mail</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Handy</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Adresse</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Eintritt</th>
              <th scope="col" className="text-right text-xs font-medium text-gray-500 px-4 py-3">Std/Wo</th>
              <th scope="col" className="text-right text-xs font-medium text-gray-500 px-4 py-3">Stundenlohn</th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditId(user.id)}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left"
                    >
                      {user.name}
                    </button>
                    {user.status === 'PENDING' && (
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">Einladung offen</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full ${
                    user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'Admin' : 'Mitarbeiter'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '–'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={user.address ?? undefined}>{user.address || '–'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.startDate ? new Date(user.startDate).toLocaleDateString('de-DE') : '–'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                  {user.maxHoursWeek != null ? `${user.maxHoursWeek} h` : '–'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                  {user.hourlyRate > 0 ? `${user.hourlyRate.toFixed(2)} €` : '–'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {user.status === 'PENDING' && <ResendInviteButton id={user.id} />}
                    {(viewerRole === 'SUPER_ADMIN' || user.role !== 'SUPER_ADMIN') && (
                      <DeleteEmployeeButton id={user.id} name={user.name} />
                    )}
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
          isSuperAdmin={viewerRole === 'SUPER_ADMIN'}
        />
      )}
    </>
  )
}
