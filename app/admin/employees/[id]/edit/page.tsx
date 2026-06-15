import { prisma } from '@/lib/db'
import { updateEmployee } from '@/app/actions/employees'
import EmployeeForm from '@/components/admin/EmployeeForm'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditEmployeePage({ params }: Props) {
  const { id } = await params
  const [user, locations] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!user) notFound()

  const action = updateEmployee.bind(null, id)

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{user.name} bearbeiten</h1>
      <EmployeeForm action={action} locations={locations} defaults={user} />
    </div>
  )
}
