'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  collapsed?: boolean
}

export default function NavLink({ href, icon, children, collapsed }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors duration-150 active:scale-[0.97] ${
        collapsed ? 'justify-center px-2' : ''
      } ${
        isActive
          ? 'bg-indigo-50 text-indigo-600 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      {!collapsed && children}
    </Link>
  )
}
