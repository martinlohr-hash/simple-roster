'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import DeleteEmployeeButton from './DeleteEmployeeButton'
import ResendInviteButton from './ResendInviteButton'

type User = {
  id: string; name: string; email: string
  status: string; role: string
  hourlyRate: number; monthlyRate: number | null; overheadPercent: number
  maxHoursWeek: number | null; maxHoursMonth: number | null
  primaryLocation: { name: string } | null
  phone: string | null; address: string | null; birthday: string | null
  startDate: string | null
  onboardingCompletedAt: string | null
}

type Props = {
  users: User[]
  viewerRole: string
}

export default function EmployeesTable({ users, viewerRole }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
            <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rolle</th>
            <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">E-Mail</th>
            <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden xl:table-cell">Handy</th>
            <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Adresse</th>
            <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Eintritt</th>
            <th scope="col" className="text-right text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Std/Wo</th>
            <th scope="col" className="text-right text-xs font-medium text-gray-500 px-4 py-3 hidden xl:table-cell">Stundenlohn</th>
            <th scope="col" className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/employees/${user.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left"
                  >
                    {user.name}
                  </Link>
                  {user.status === 'PENDING' && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">Einladung offen</span>
                  )}
                  {!user.onboardingCompletedAt && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 text-orange-700 whitespace-nowrap" title="Personalbogen noch nicht vollständig">Bogen offen</span>
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
              <td className="px-4 py-3 text-sm text-gray-600 hidden xl:table-cell">{user.phone || '–'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate hidden lg:table-cell" title={user.address ?? undefined}>{user.address || '–'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                {user.startDate ? format(parseISO(user.startDate), 'dd.MM.yyyy') : '–'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 text-right hidden sm:table-cell">
                {user.maxHoursWeek != null ? `${user.maxHoursWeek} h` : '–'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 text-right hidden xl:table-cell">
                {user.hourlyRate > 0 ? `${user.hourlyRate.toFixed(2)} €` : '–'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 justify-end">
                  <Link
                    href={`/admin/employees/${user.id}?tab=beschaeftigung`}
                    className="text-xs font-medium text-gray-500 hover:text-indigo-600 whitespace-nowrap"
                    title="Beschäftigung / Personalbogen"
                  >
                    Personalbogen
                  </Link>
                  <Link
                    href={`/admin/employees/${user.id}?tab=dokumente`}
                    className="text-xs font-medium text-gray-500 hover:text-indigo-600 whitespace-nowrap"
                    title="Dokumente & Verträge"
                  >
                    Dokumente
                  </Link>
                  {user.status === 'PENDING' && <ResendInviteButton id={user.id} />}
                  {(viewerRole === 'SUPER_ADMIN' || user.role !== 'SUPER_ADMIN') && (
                    <DeleteEmployeeButton id={user.id} name={user.name} isSuperAdmin={viewerRole === 'SUPER_ADMIN'} />
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
  )
}
