import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const queryKey = request.nextUrl.searchParams.get('key')
  const apiKey = process.env.DASHBOARD_API_KEY
  if (!apiKey || (authHeader !== `Bearer ${apiKey}` && queryKey !== apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)
  const dayAfterStart = new Date(tomorrowStart)
  dayAfterStart.setUTCDate(dayAfterStart.getUTCDate() + 1)

  const [todayShifts, tomorrowShifts] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: todayStart, lt: tomorrowStart }, status: { not: 'CANCELLED' } },
      include: { user: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.shift.findMany({
      where: { date: { gte: tomorrowStart, lt: dayAfterStart }, status: { not: 'CANCELLED' } },
      include: { user: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    }),
  ])

  const fmt = (shifts: typeof todayShifts) =>
    shifts.map((s) => ({
      employee: s.user?.name ?? 'Offen',
      location: s.location.name,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    }))

  return NextResponse.json(
    { today: fmt(todayShifts), tomorrow: fmt(tomorrowShifts) },
    { headers: CORS_HEADERS },
  )
}
