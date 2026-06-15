import { logout, getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar userName={session.name} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
