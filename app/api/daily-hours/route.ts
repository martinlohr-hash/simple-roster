import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { berlinDay } from '@/lib/dayHours'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/** Gestern als Berliner Kalendertag. */
function yesterdayBerlin(): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - 1)
  return berlinDay(now)
}

/**
 * Liefert die FREIGEGEBENEN Tages-Gesamtstunden je Berliner Kalendertag —
 * als Quelle für die Auswertungs-Tabelle. Nicht freigegebene Tage erscheinen
 * NICHT (das Script trägt sie also nicht ein). `hours` ist der eingefrorene
 * Snapshot vom Zeitpunkt der Freigabe.
 *
 * Query:
 *   ?key=<token>                Auth (oder Authorization: Bearer <token>)
 *   ?date=yyyy-MM-dd            einzelner Tag (Standard: gestern)
 *   ?from=yyyy-MM-dd&to=...     Zeitraum (inklusive)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  // Auth: dedizierter Sync-Token, ersatzweise der bestehende Dashboard-Key
  const authHeader = request.headers.get('Authorization')
  const queryKey = sp.get('key')
  const token = process.env.SHEET_SYNC_TOKEN || process.env.DASHBOARD_API_KEY
  if (!token || (authHeader !== `Bearer ${token}` && queryKey !== token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
  }

  const from = sp.get('from') || sp.get('date') || yesterdayBerlin()
  const to = sp.get('to') || sp.get('date') || from

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'Ungültiges Datum (yyyy-MM-dd erwartet)' }, { status: 400, headers: CORS_HEADERS })
  }

  // Nur freigegebene Tage zurückgeben (String-Vergleich auf "yyyy-MM-dd" = chronologisch)
  const releases = await prisma.timesheetRelease.findMany({
    where: { day: { gte: from, lte: to } },
    select: { day: true, hours: true, entries: true, releasedAt: true },
  })

  const days: Record<string, { hours: number; entries: number; releasedAt: string }> = {}
  for (const r of releases) {
    days[r.day] = { hours: r.hours, entries: r.entries, releasedAt: r.releasedAt.toISOString() }
  }

  const single = from === to
  return NextResponse.json(
    {
      from,
      to,
      days,
      ...(single
        ? { date: from, released: !!days[from], totalHours: days[from]?.hours ?? null, entries: days[from]?.entries ?? 0 }
        : {}),
    },
    { headers: CORS_HEADERS },
  )
}
