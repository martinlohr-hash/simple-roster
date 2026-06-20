'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconCalendarEvent,
  IconUsers,
  IconUmbrella,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react'

type Props = {
  pendingVacationCount?: number
  unconfirmedDaysCount?: number
}

const tabs = [
  {
    href: '/admin/schedule',
    label: 'Dienstplan',
    icon: <IconCalendarEvent size={24} stroke={1.8} />,
    badgeKey: 'unconfirmed' as const,
  },
  {
    href: '/admin/employees',
    label: 'Mitarbeiter',
    icon: <IconUsers size={24} stroke={1.8} />,
  },
  {
    href: '/admin/vacations',
    label: 'Urlaub',
    icon: <IconUmbrella size={24} stroke={1.8} />,
    badgeKey: 'vacation' as const,
  },
  {
    href: '/admin/costs',
    label: 'Kosten',
    icon: <IconChartBar size={24} stroke={1.8} />,
  },
  {
    href: '/admin/settings',
    label: 'Einstellungen',
    icon: <IconSettings size={24} stroke={1.8} />,
  },
]

export default function AdminBottomNav({ pendingVacationCount, unconfirmedDaysCount }: Props) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 safe-area-pb">
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          const badge =
            tab.badgeKey === 'vacation'
              ? pendingVacationCount || 0
              : tab.badgeKey === 'unconfirmed'
                ? unconfirmedDaysCount || 0
                : 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative ${
                active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="relative">
                {tab.icon}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
