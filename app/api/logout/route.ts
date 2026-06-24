import { NextRequest, NextResponse } from 'next/server'

// Logout per GET-URL. Liegt unter /api → vom proxy.ts-Matcher ausgenommen,
// daher auch erreichbar, wenn man im Onboarding-Gate (/willkommen) festhängt
// und den normalen Abmelden-Button nicht sieht. Löscht den session-Cookie
// und leitet zur Login-Seite.
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', request.url))
  res.cookies.delete('session')
  return res
}
