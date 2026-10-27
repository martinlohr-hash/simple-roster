'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/employee/schedule',
    label: 'Mein Plan',
    icon: (
      <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/employee/dashboard',
    label: 'Heute',
    icon: (
      <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/employee/open-shifts',
    label: 'Bewerben',
    icon: (
      <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
  {
    href: '/employee/hours',
    label: 'Stunden',
    icon: (
      <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/employee/recipes',
    label: 'Rezepte',
    icon: (
      <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    href: '/employee/vacation',
    label: 'Urlaub',
    icon: (
      <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17l4-8 4 4 4-6 4 10M3 21h18" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Hauptnavigation" className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-20 safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              aria-current={active ? 'page' : undefined}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className={active ? 'text-indigo-600' : 'text-gray-600'}>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
