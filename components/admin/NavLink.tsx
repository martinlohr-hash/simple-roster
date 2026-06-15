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
      className={`flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition active:scale-[0.97] ${
        collapsed ? 'justify-center' : ''
      } ${
        isActive
          ? 'bg-indigo-600/20 text-indigo-300 font-medium'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {icon}
      {!collapsed && children}
    </Link>
  )
}
