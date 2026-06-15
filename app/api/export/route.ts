import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { prisma } from '@/lib/db'
import { calcHours, calcLaborCost } from '@/lib/calculations'
import { format, parseISO, endOfDay, startOfDay } from 'date-fns'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const from = startOfDay(parseISO(sp.get('from') || new Date().toISOString().split('T')[0]))
  const to = endOfDay(parseISO(sp.get('to') || new Date().toISOString().split('T')[0]))
  const fmt = sp.get('format') || 'csv'
  const locationId = sp.get('locationId') || undefined
  const userIds = sp.getAll('userId').filter((id) => id !== 'all')

  const entries = await prisma.timeEntry.findMany({
    where: {
      checkinAt: { gte: from, lte: to },
      checkoutAt: { not: null },
      ...(locationId ? { locationId } : {}),
      ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
    },
    include: { user: true, location: true, shift: true },
    orderBy: [{ user: { name: 'asc' } }, { checkinAt: 'asc' }],
  })

  const rows = entries.map((e) => {
    const hours = calcHours(e.checkinAt, e.checkoutAt!)
    const cost = calcLaborCost(hours, e.user.hourlyRate, e.user.overheadPercent)
    return {
      Name: e.user.name,
      Datum: format(e.checkinAt, 'dd.MM.yyyy'),
      'Geplant Von': e.shift?.startTime || '',
      'Geplant Bis': e.shift?.endTime || '',
      Einstempeln: format(e.checkinAt, 'HH:mm'),
      Ausstempeln: format(e.checkoutAt!, 'HH:mm'),
      'Ist-Stunden': parseFloat(hours.toFixed(2)),
      Standort: e.location.name,
      'Stundenlohn (€)': e.user.hourlyRate,
      'NK-Quote (%)': e.user.overheadPercent,
      'Lohnkosten (€)': parseFloat(cost.toFixed(2)),
    }
  })

  if (fmt === 'excel') {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stunden')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="stunden_${format(from, 'yyyy-MM-dd')}_${format(to, 'yyyy-MM-dd')}.xlsx"`,
      },
    })
  }

  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h] ?? '')).join(';')),
  ].join('\n')

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stunden_${format(from, 'yyyy-MM-dd')}_${format(to, 'yyyy-MM-dd')}.csv"`,
    },
  })
}
