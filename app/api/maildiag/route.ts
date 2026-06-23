import { NextRequest, NextResponse } from 'next/server'

// Temporäre Diagnose: zeigt, ob die Mail-Env-Variablen zur Laufzeit ankommen.
// Gibt NIE die Werte zurück – nur ob vorhanden + Länge. Geschützt per Key.
// Nach erfolgreichem Debugging wieder löschen.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!process.env.DASHBOARD_API_KEY || key !== process.env.DASHBOARD_API_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const peek = (v: string | undefined) => ({
    present: Boolean(v),
    length: v?.length ?? 0,
    trimmedLength: v?.trim().length ?? 0,
  })

  return NextResponse.json(
    {
      runtime: 'nodejs',
      vercelEnv: process.env.VERCEL_ENV ?? null,
      GMAIL_USER: peek(process.env.GMAIL_USER),
      GMAIL_APP_PASSWORD: peek(process.env.GMAIL_APP_PASSWORD),
      MAIL_FROM: peek(process.env.MAIL_FROM),
      NEXT_PUBLIC_APP_URL: peek(process.env.NEXT_PUBLIC_APP_URL),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
