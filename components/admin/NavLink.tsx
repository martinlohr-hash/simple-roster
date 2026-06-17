'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  collapsed?: boolean
  badge?: number
}

export default function NavLink({ href, icon, children, collapsed, badge }: Props) {
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
      <span className="relative shrink-0">
        {icon}
        {badge != null && badge > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {!collapsed && children}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
