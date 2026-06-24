import { prisma } from '@/lib/db'
import { updateEmployee } from '@/app/actions/employees'
import { getSession } from '@/app/actions/auth'
import { isSuperAdmin } from '@/lib/session'
import EmployeeForm from '@/components/admin/EmployeeForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconBrain } from '@tabler/icons-react'

type Props = { params: Promise<{ id: string }> }

export default async function EditEmployeePage({ params }: Props) {
  const { id } = await params
  const [session, user, locations] = await Promise.all([
    getSession(),
    prisma.user.findUnique({ where: { id } }),
    prisma.location.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  if (!user) notFound()

  const action = updateEmployee.bind(null, id)
  const showInsights = !!session && isSuperAdmin(session.role)

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{user.name} bearbeiten</h1>
        {showInsights && (
          <Link
            href={`/admin/employees/${id}/insights`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition shrink-0"
          >
            <IconBrain size={15} stroke={1.75} />
            Insights
          </Link>
        )}
      </div>
      <EmployeeForm action={action} locations={locations} defaults={user} />
    </div>
  )
}
