'use client'

import { useState, useEffect } from 'react'
import { logout } from '@/app/actions/auth'
import NavLink from './NavLink'
import {
  IconCalendarEvent,
  IconUsers,
  IconChartBar,
  IconDownload,
  IconSettings,
  IconUser,
  IconBug,
  IconLogout,
  IconUmbrella,
  IconBrain,
} from '@tabler/icons-react'
import Image from 'next/image'

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join('')
}

type Props = {
  userName: string
  userRole: string
  openBugCount?: number
  pendingVacationCount?: number
  unconfirmedDaysCount?: number
}

export default function AdminSidebar({ userName, userRole, openBugCount, pendingVacationCount, unconfirmedDaysCount }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const initials = getInitials(userName)
  const roleLabel = userRole === 'SUPER_ADMIN' ? 'Super-Admin' : userRole === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'

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
    <aside className={`bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      <button
        onClick={toggle}
        title={collapsed ? 'Menü aufklappen' : 'Menü einklappen'}
        className="px-3 h-14 flex items-center gap-2.5 border-b border-gray-100 hover:bg-gray-50 transition w-full text-left"
      >
        <Image src="/logo-s.png" alt="SimpleRoster" width={28} height={28} className="rounded-full shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-gray-900 text-sm tracking-tight truncate">SimpleRoster</span>
        )}
      </button>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        <NavLink href="/admin/schedule" icon={<IconCalendarEvent size={16} stroke={1.75} />} collapsed={collapsed} badge={unconfirmedDaysCount}>Dienstplan</NavLink>
        <NavLink href="/admin/my-schedule" icon={<IconUser size={16} stroke={1.75} />} collapsed={collapsed}>Mein Plan</NavLink>
        <NavLink href="/admin/employees" icon={<IconUsers size={16} stroke={1.75} />} collapsed={collapsed}>Mitarbeiter</NavLink>
        <NavLink href="/admin/costs" icon={<IconChartBar size={16} stroke={1.75} />} collapsed={collapsed}>Lohnkosten</NavLink>
        <NavLink href="/admin/vacations" icon={<IconUmbrella size={16} stroke={1.75} />} collapsed={collapsed} badge={pendingVacationCount}>Urlaub</NavLink>
        <NavLink href="/admin/export" icon={<IconDownload size={16} stroke={1.75} />} collapsed={collapsed}>Export</NavLink>
        <NavLink href="/admin/settings" icon={<IconSettings size={16} stroke={1.75} />} collapsed={collapsed}>Einstellungen</NavLink>
        <NavLink href="/admin/bugs" icon={<IconBug size={16} stroke={1.75} />} collapsed={collapsed} badge={openBugCount}>Fehlerberichte</NavLink>
        {userRole === 'SUPER_ADMIN' && (
          <>
            <div className="my-1.5 border-t border-gray-100" />
            <NavLink href="/admin/team-map" icon={<IconBrain size={16} stroke={1.75} />} collapsed={collapsed}>Team-Map</NavLink>
          </>
        )}
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
            <IconLogout size={16} stroke={1.75} />
            {!collapsed && 'Abmelden'}
          </button>
        </form>
      </div>
    </aside>
  )
}
