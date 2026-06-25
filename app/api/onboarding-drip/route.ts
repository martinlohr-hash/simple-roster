import { NextRequest, NextResponse } from 'next/server'
import { runDrip } from '@/lib/onboarding/drip'

// Wird täglich vom Vercel-Cron getroffen (siehe vercel.json) und verschickt
// pro fälligem Mitarbeiter die nächste Onboarding-Stufe.
//
// Auth (eine der beiden Varianten reicht):
//   - Authorization: Bearer <CRON_SECRET>   (von Vercel-Cron automatisch gesetzt)
//   - ?key=<ONBOARDING_CRON_TOKEN> oder Authorization: Bearer <ONBOARDING_CRON_TOKEN>
//     (für manuelle/lokale Auslösung)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const queryKey = request.nextUrl.searchParams.get('key')

  const tokens = [process.env.CRON_SECRET, process.env.ONBOARDING_CRON_TOKEN].filter(
    (t): t is string => Boolean(t),
  )

  const authorized =
    tokens.length > 0 &&
    tokens.some((t) => authHeader === `Bearer ${t}` || queryKey === t)

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const result = await runDrip()
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
