import { logout, getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminBottomNav from '@/components/admin/AdminBottomNav'
import BugReportButton from '@/components/ui/BugReportButton'
import { prisma } from '@/lib/db'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) redirect('/login')

  const [openBugCount, pendingVacationCount] = await Promise.all([
    prisma.bugReport.count({ where: { status: 'OPEN' } }),
    prisma.vacationRequest.count({ where: { status: 'PENDING' } }),
  ])

  return (
    <div className="flex min-h-screen bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:bg-white focus:text-indigo-700 focus:rounded-lg focus:shadow focus:border focus:border-indigo-200"
      >
        Zum Inhalt springen
      </a>
      <AdminSidebar userName={session.name} userRole={session.role} openBugCount={openBugCount} pendingVacationCount={pendingVacationCount} />
      <main id="main-content" className="flex-1 overflow-auto bg-white pb-16 md:pb-0">{children}</main>
      <AdminBottomNav pendingVacationCount={pendingVacationCount} />
      <BugReportButton />
    </div>
  )
}
