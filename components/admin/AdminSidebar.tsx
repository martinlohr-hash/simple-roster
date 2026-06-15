'use client'

import { useState, useEffect } from 'react'
import { logout } from '@/app/actions/auth'
import NavLink from './NavLink'

const CalendarIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const TemplateIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)
const UsersIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const ChartIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)
const DownloadIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const SettingsIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const MyPlanIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)
const BugIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4m0 4h.01M9 3h6l1 2H8L9 3zM4 8h2M18 8h2M5 5l1.5 2M19 5l-1.5 2M5 19l1.5-2M19 19l-1.5-2M8 20h8a2 2 0 002-2v-6a4 4 0 00-8 0v6a2 2 0 002 2z" />
  </svg>
)
const LogoutIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join('')
}

type Props = {
  userName: string
  userRole: 'ADMIN' | 'EMPLOYEE'
}

export default function AdminSidebar({ userName, userRole }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const initials = getInitials(userName)
  const roleLabel = userRole === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem('sidebar-collapsed', String(!v))
      return !v
    })
  }

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      <button
        onClick={toggle}
        title={collapsed ? 'Menü aufklappen' : 'Menü einklappen'}
        className="px-3 h-14 flex items-center gap-2.5 border-b border-gray-100 hover:bg-gray-50 transition w-full text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 text-sm tracking-tight truncate">SimpleRoster</span>
        )}
      </button>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        <NavLink href="/admin/schedule" icon={<CalendarIcon />} collapsed={collapsed}>Dienstplan</NavLink>
        <NavLink href="/admin/my-schedule" icon={<MyPlanIcon />} collapsed={collapsed}>Mein Plan</NavLink>
        <NavLink href="/admin/templates" icon={<TemplateIcon />} collapsed={collapsed}>Vorlagen</NavLink>
        <NavLink href="/admin/employees" icon={<UsersIcon />} collapsed={collapsed}>Mitarbeiter</NavLink>
        <NavLink href="/admin/costs" icon={<ChartIcon />} collapsed={collapsed}>Lohnkosten</NavLink>
        <NavLink href="/admin/export" icon={<DownloadIcon />} collapsed={collapsed}>Export</NavLink>
        <NavLink href="/admin/settings" icon={<SettingsIcon />} collapsed={collapsed}>Einstellungen</NavLink>
        <NavLink href="/admin/bugs" icon={<BugIcon />} collapsed={collapsed}>Fehlerberichte</NavLink>
      </nav>

      <div className="border-t border-gray-100 p-2 space-y-0.5">
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? userName : undefined}>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
              <div className="text-xs text-gray-500">{roleLabel}</div>
            </div>
          )}
        </div>
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? 'Abmelden' : undefined}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 active:scale-[0.97] ${collapsed ? 'justify-center' : ''}`}
          >
            <LogoutIcon />
            {!collapsed && 'Abmelden'}
          </button>
        </form>
      </div>
    </aside>
  )
}
