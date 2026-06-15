import { prisma } from '@/lib/db'
import NewEmployeeForm from '@/components/admin/NewEmployeeForm'

export default async function NewEmployeePage() {
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Neuer Mitarbeiter</h1>
      <NewEmployeeForm locations={locations} />
    </div>
  )
}
