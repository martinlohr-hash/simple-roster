import { logout, getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/login')

  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar userName={session.name} userRole={session.role} />
      <main className="flex-1 overflow-auto bg-white">{children}</main>
    </div>
  )
}
