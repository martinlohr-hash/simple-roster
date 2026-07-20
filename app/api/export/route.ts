import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { calcHours, calcLaborCost } from '@/lib/calculations'
import { shiftDurationHours } from '@/lib/timeUtils'
import { format, parseISO, endOfDay, startOfDay } from 'date-fns'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const from = startOfDay(parseISO(sp.get('from') || new Date().toISOString().split('T')[0]))
  const to = endOfDay(parseISO(sp.get('to') || new Date().toISOString().split('T')[0]))
  const fmt = sp.get('format') || 'csv'
  const locationId = sp.get('locationId') || undefined
  const userIds = sp.getAll('userId').filter((id) => id !== 'all')
  const tips = parseFloat(sp.get('tips') || '0') || 0
  const summary = sp.get('summary') === '1'

  const locationName = locationId
    ? (await prisma.location.findUnique({ where: { id: locationId }, select: { name: true } }))?.name ?? 'Unbekannt'
    : 'Alle Standorte'

  const dateRange = `${format(from, 'dd.MM.yyyy')} – ${format(to, 'dd.MM.yyyy')}`
  const title = `Simple Sandwich Hamburg GmbH - ${summary ? 'Lohn-Export kumuliert' : 'Stundenexport'} (${dateRange}) - ${locationName}`
  const fileBase = `${summary ? 'lohn' : 'stunden'}_${format(from, 'yyyy-MM-dd')}_${format(to, 'yyyy-MM-dd')}`

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

  let rows: Record<string, unknown>[]

  if (summary) {
    // Admins gehen mit ihren GEPLANTEN Schichten in den Lohn-Export ein, nicht mit Stempelzeiten
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        ...(userIds.length > 0 ? { id: { in: userIds } } : {}),
      },
      select: { id: true, name: true, hourlyRate: true, overheadPercent: true },
    })
    const adminIds = new Set(adminUsers.map((u) => u.id))
    const adminShifts = adminUsers.length > 0
      ? await prisma.shift.findMany({
          where: {
            userId: { in: [...adminIds] },
            date: { gte: from, lte: to },
            status: { not: 'CANCELLED' },
            ...(locationId ? { locationId } : {}),
          },
          select: { userId: true, startTime: true, endTime: true },
        })
      : []

    const byUser = new Map<string, { name: string; hourlyRate: number; overheadPercent: number; hours: number }>()
    for (const e of entries) {
      if (adminIds.has(e.userId)) continue
      const agg = byUser.get(e.userId) ?? {
        name: e.user.name,
        hourlyRate: e.user.hourlyRate,
        overheadPercent: e.user.overheadPercent,
        hours: 0,
      }
      agg.hours += calcHours(e.checkinAt, e.checkoutAt!)
      byUser.set(e.userId, agg)
    }
    for (const s of adminShifts) {
      const u = adminUsers.find((a) => a.id === s.userId)!
      const agg = byUser.get(u.id) ?? {
        name: u.name,
        hourlyRate: u.hourlyRate,
        overheadPercent: u.overheadPercent,
        hours: 0,
      }
      agg.hours += shiftDurationHours(s.startTime, s.endTime)
      byUser.set(u.id, agg)
    }
    const aggs = [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
    const totalHours = aggs.reduce((sum, a) => sum + a.hours, 0)
    // Letzte Zeile bekommt den Rest, damit die Summe exakt dem eingegebenen Trinkgeld entspricht
    let assignedTips = 0
    rows = aggs.map((a, i) => {
      let tipShare = 0
      if (tips > 0 && totalHours > 0) {
        tipShare = i === aggs.length - 1
          ? parseFloat((tips - assignedTips).toFixed(2))
          : parseFloat(((a.hours / totalHours) * tips).toFixed(2))
        assignedTips += tipShare
      }
      return {
        Name: a.name,
        'Ist-Stunden': parseFloat(a.hours.toFixed(2)),
        'Stundenlohn (€)': a.hourlyRate,
        'NK-Quote (%)': a.overheadPercent,
        'Lohnkosten (€)': parseFloat(calcLaborCost(a.hours, a.hourlyRate, a.overheadPercent).toFixed(2)),
        'Trinkgeld (€)': tipShare,
      }
    })
  } else {
    const totalHours = tips > 0
      ? entries.reduce((sum, e) => sum + calcHours(e.checkinAt, e.checkoutAt!), 0)
      : 0

    rows = entries.map((e) => {
      const hours = calcHours(e.checkinAt, e.checkoutAt!)
      const cost = calcLaborCost(hours, e.user.hourlyRate, e.user.overheadPercent)
      const tipShare = tips > 0 && totalHours > 0
        ? parseFloat(((hours / totalHours) * tips).toFixed(2))
        : null
      const row: Record<string, unknown> = {
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
      if (tips > 0) row['Trinkgeld (€)'] = tipShare
      return row
    })
  }

  if (fmt === 'excel') {
    const ws = XLSX.utils.aoa_to_sheet([[title]])
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A2' })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, summary ? 'Lohn' : 'Stunden')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(new Uint8Array(buf as Buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileBase}.xlsx"`,
      },
    })
  }

  const headers = Object.keys(rows[0] || { Name: '' })
  const emptyCols = ';'.repeat(headers.length - 1)
  const csv = [
    title + emptyCols,
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h] ?? '')).join(';')),
  ].join('\n')

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileBase}.csv"`,
    },
  })
}
