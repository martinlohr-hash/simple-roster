import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import EmployeesTable from '@/components/admin/EmployeesTable'

export default async function EmployeesPage() {
  const session = await getSession()
  const viewerRole = session?.role ?? 'ADMIN'

  const [users, locations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { primaryLocation: true },
    }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

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
      <EmployeesTable
        viewerRole={viewerRole}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          role: u.role,
          hourlyRate: u.hourlyRate,
          monthlyRate: u.monthlyRate,
          overheadPercent: u.overheadPercent,
          maxHoursWeek: u.maxHoursWeek,
          maxHoursMonth: u.maxHoursMonth,
          primaryLocation: u.primaryLocation ? { name: u.primaryLocation.name } : null,
          phone: u.phone,
          address: u.address,
          birthday: u.birthday ? u.birthday.toISOString() : null,
          startDate: u.startDate ? u.startDate.toISOString() : null,
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
      />
    </div>
  )
}
