import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { buildVacationYears, vacationInclude } from '@/lib/vacationHistory'

const STATUS = { APPROVED: 'Genehmigt', PENDING: 'Offen', REJECTED: 'Abgelehnt' } as const

const day = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })
const dt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
      })
    : ''
const cell = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`

// GET ?userId=… → Urlaubshistorie eines Mitarbeiters als CSV (alle Jahre)
export async function GET(request: NextRequest) {
  const token = (await cookies()).get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId fehlt' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const vacations = await prisma.vacationRequest.findMany({ where: { userId }, include: vacationInclude })
  const balances = await prisma.vacationYearBalance.findMany({ where: { userId } })
  const years = buildVacationYears(user, vacations, balances)

  const header = [
    'Jahr', 'Von', 'Bis', 'Tage', 'Jahresanspruch', 'Übertrag', 'Rest danach',
    'Beantragt am', 'Entschieden am', 'Entschieden von', 'Status', 'Notiz', 'Korrekturen',
  ]
  const rows = years.flatMap((y) =>
    y.entries.map((e) => [
      y.year, day(e.startDate), day(e.endDate), e.workdays, y.baseEntitlement, y.carryOver, e.remainingAfter ?? '',
      dt(e.createdAt), dt(e.reviewedAt), e.reviewerName ?? '', STATUS[e.status], e.note ?? '',
      e.changes.map((c) => `${c.text} (${dt(c.at)}, ${c.by})`).join(' | '),
    ]),
  )
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')

  const slug = (user.name || 'mitarbeiter').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="urlaub_${slug}.csv"`,
    },
  })
}
