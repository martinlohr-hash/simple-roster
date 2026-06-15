import Link from 'next/link'
import { prisma } from '@/lib/db'
import DeleteEmployeeButton from '@/components/admin/DeleteEmployeeButton'
import ResendInviteButton from '@/components/admin/ResendInviteButton'

export default async function EmployeesPage() {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { primaryLocation: true },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mitarbeiter</h1>
        <Link
          href="/admin/employees/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition active:scale-[0.97]"
        >
          + Mitarbeiter hinzufügen
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">E-Mail</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rolle</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Standort</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Stundenlohn</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">NK</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Max Wo / Mo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  {user.status === 'PENDING' ? (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-amber-100 text-amber-700">
                      Ausstehend
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">
                      Aktiv
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role === 'ADMIN' ? 'Admin' : 'Mitarbeiter'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.primaryLocation?.name || '–'}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{user.hourlyRate.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">{user.overheadPercent}%</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                  {user.maxHoursWeek ? `${user.maxHoursWeek}h` : '–'} / {user.maxHoursMonth ? `${user.maxHoursMonth}h` : '–'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    {user.status === 'PENDING' && (
                      <ResendInviteButton id={user.id} />
                    )}
                    <Link
                      href={`/admin/employees/${user.id}/edit`}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Bearbeiten
                    </Link>
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
    </div>
  )
}
