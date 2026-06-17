import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

const PUBLIC_ROUTES = ['/login', '/onboarding']
const ADMIN_ROUTES = ['/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r))

  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await decrypt(sessionCookie) : null

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isPublic) {
    const dest = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' ? '/admin/schedule' : '/employee/schedule'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (session && isAdmin && session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/employee/schedule', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sammie-).*)'],
}
