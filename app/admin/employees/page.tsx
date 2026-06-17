import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import EmployeesTable from '@/components/admin/EmployeesTable'

type Props = { searchParams: Promise<{ archived?: string }> }

export default async function EmployeesPage({ searchParams }: Props) {
  const [session, { archived }] = await Promise.all([getSession(), searchParams])
  const viewerRole = session?.role ?? 'ADMIN'
  const showArchived = archived === '1'
  const now = new Date()

  const where = showArchived
    ? { endDate: { lt: now } }
    : { OR: [{ endDate: null }, { endDate: { gte: now } }] }

  const [users, locations] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { name: 'asc' }, include: { primaryLocation: true } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mitarbeiter</h1>
          <div className="flex gap-1 mt-2">
            <Link
              href="/admin/employees"
              className={`px-3 py-1 text-xs font-medium rounded-full transition ${!showArchived ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Aktiv
            </Link>
            <Link
              href="/admin/employees?archived=1"
              className={`px-3 py-1 text-xs font-medium rounded-full transition ${showArchived ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Archiv
            </Link>
          </div>
        </div>
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
