'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  href: string
  children: React.ReactNode
}

export default function EmployeeNavLink({ href, children }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-lg transition active:scale-[0.97] font-medium ${
        isActive
          ? 'text-gray-900 bg-gray-100'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}
