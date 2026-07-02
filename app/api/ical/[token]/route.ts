import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildIcsFeed } from '@/lib/ical-feed'

export const runtime = 'nodejs'

// Persönlicher Kalender-Feed: Auth über den geheimen Token in der URL
// (Kalender-Apps können keine Cookies/Header mitschicken).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 20) {
    return new NextResponse('Not found', { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { icalToken: token },
    select: { id: true, name: true },
  })
  if (!user) return new NextResponse('Not found', { status: 404 })

  // 60 Tage Rückblick (für Nacharbeit/Stundenabgleich) + alles Geplante
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 60)
  from.setUTCHours(0, 0, 0, 0)

  const shifts = await prisma.shift.findMany({
    where: {
      userId: user.id,
      status: { not: 'CANCELLED' },
      date: { gte: from },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      location: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  })

  const ics = buildIcsFeed(
    user.name,
    shifts.map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      locationName: s.location.name,
    })),
  )

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="dienstplan.ics"',
      // Kalender-Apps pollen selbst; kurzes CDN-Caching reicht
      'Cache-Control': 'public, s-maxage=300, max-age=300',
    },
  })
}
