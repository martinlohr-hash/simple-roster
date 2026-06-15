import { logout, getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import EmployeeNavLink from '@/components/employee/EmployeeNavLink'
import BugReportButton from '@/components/ui/BugReportButton'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">SimpleRoster</span>
          </div>
          <nav className="flex items-center gap-1">
            <EmployeeNavLink href="/employee/dashboard">Heute</EmployeeNavLink>
            <EmployeeNavLink href="/employee/hours">Meine Stunden</EmployeeNavLink>
            <EmployeeNavLink href="/employee/open-shifts">Offene Schichten</EmployeeNavLink>
            <form action={logout}>
              <button type="submit" className="ml-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition active:scale-[0.97]">
                Abmelden
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      <BugReportButton />
    </div>
  )
}
