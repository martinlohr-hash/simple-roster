import Link from 'next/link'
import { prisma } from '@/lib/db'
import { COMPANY_NAME } from '@/lib/company'

export const metadata = { title: 'Personalbögen' }

export default async function PersonalbogenOverviewPage() {
  const users = await prisma.user.findMany({
    where: { exitDate: null, endDate: null },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true, name: true, email: true, role: true,
      personnelNumber: true, onboardingCompletedAt: true, jobTitle: true,
    },
  })

  const filledCount = users.filter((u) => u.onboardingCompletedAt).length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Personalbögen</h1>
          <p className="text-sm text-gray-500 mt-1">
            {COMPANY_NAME} · {filledCount}/{users.length} ausgefüllt. Export als Excel/CSV für das Lohnbüro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/personalbogen?format=excel&scope=active" className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">Excel exportieren</a>
          <a href="/api/personalbogen?format=csv&scope=active" className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition">CSV exportieren</a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Personalnr.</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tätigkeit</th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">Stammdaten</th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.personnelNumber || '–'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.jobTitle || '–'}</td>
                <td className="px-4 py-3">
                  {u.onboardingCompletedAt ? (
                    <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-700">ausgefüllt</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700">offen</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/employees/${u.id}/personalbogen`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    bearbeiten
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">Keine aktiven Mitarbeiter.</p>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Tipp: Auch ausgetretene Mitarbeiter exportieren über{' '}
        <a href="/api/personalbogen?format=excel&scope=all" className="underline hover:text-gray-600">Excel (inkl. ausgetretene)</a>{' '}·{' '}
        <a href="/api/personalbogen?format=csv&scope=all" className="underline hover:text-gray-600">CSV (inkl. ausgetretene)</a>.
      </p>
    </div>
  )
}
