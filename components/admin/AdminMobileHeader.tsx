import { logout } from '@/app/actions/auth'
import { IconLogout } from '@tabler/icons-react'

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join('')
}

type Props = {
  userName: string
  userRole: string
}

export default function AdminMobileHeader({ userName, userRole }: Props) {
  const initials = getInitials(userName)
  const roleLabel = userRole === 'SUPER_ADMIN' ? 'Super-Admin' : userRole === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'

  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 safe-area-pt">
      <div className="h-12 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate leading-tight">{userName}</div>
            <div className="text-[11px] text-gray-500 leading-tight">{roleLabel}</div>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-2.5 py-1.5 -mr-1 text-sm font-medium text-gray-500 hover:text-gray-900 active:scale-[0.97] transition"
          >
            <IconLogout size={18} stroke={1.75} />
            Abmelden
          </button>
        </form>
      </div>
    </header>
  )
}
