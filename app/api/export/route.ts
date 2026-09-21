import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { calcHours, calcLaborCost } from '@/lib/calculations'
import { shiftDurationHours } from '@/lib/timeUtils'
import { berlinDay, berlinDayBounds, formatBerlin, getBreakMinutesByUser, getBreakMinutesByUserAndDay } from '@/lib/dayHours'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const todayStr = berlinDay(new Date())
  const from = berlinDayBounds(sp.get('from') || todayStr).start
  const to = berlinDayBounds(sp.get('to') || todayStr).end
  const fmt = sp.get('format') || 'csv'
  const locationId = sp.get('locationId') || undefined
  const userIds = sp.getAll('userId').filter((id) => id !== 'all')
  const tips = parseFloat(sp.get('tips') || '0') || 0
  const summary = sp.get('summary') === '1'

  const locationName = locationId
    ? (await prisma.location.findUnique({ where: { id: locationId }, select: { name: true } }))?.name ?? 'Unbekannt'
    : 'Alle Standorte'

  const dateRange = `${formatBerlin(from, 'dd.MM.yyyy')} – ${formatBerlin(to, 'dd.MM.yyyy')}`
  const title = `Simple Sandwich Hamburg GmbH - ${summary ? 'Lohn-Export kumuliert' : 'Stundenexport'} (${dateRange}) - ${locationName}`
  const fileBase = `${summary ? 'lohn' : 'stunden'}_${formatBerlin(from, 'yyyy-MM-dd')}_${formatBerlin(to, 'yyyy-MM-dd')}`

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

  const periodFrom = formatBerlin(from, 'yyyy-MM-dd')
  const periodTo = formatBerlin(to, 'yyyy-MM-dd')

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

    type Agg = { userId: string; name: string; hourlyRate: number; overheadPercent: number; hours: number; adjReasons: string[] }
    const byUser = new Map<string, Agg>()
    for (const e of entries) {
      if (adminIds.has(e.userId)) continue
      const agg = byUser.get(e.userId) ?? {
        userId: e.userId,
        name: e.user.name,
        hourlyRate: e.user.hourlyRate,
        overheadPercent: e.user.overheadPercent,
        hours: 0,
        adjReasons: [],
      }
      agg.hours += calcHours(e.checkinAt, e.checkoutAt!)
      byUser.set(e.userId, agg)
    }
    for (const s of adminShifts) {
      const u = adminUsers.find((a) => a.id === s.userId)!
      const agg = byUser.get(u.id) ?? {
        userId: u.id,
        name: u.name,
        hourlyRate: u.hourlyRate,
        overheadPercent: u.overheadPercent,
        hours: 0,
        adjReasons: [],
      }
      agg.hours += shiftDurationHours(s.startTime, s.endTime)
      byUser.set(u.id, agg)
    }

    // Manuelle Lohn-Korrekturen für exakt diesen Zeitraum (z. B. vergessener Stempel,
    // mit Pflicht-Begründung fürs Lohnbüro). Admins bleiben außen vor, die gehen
    // ohnehin über Plan-Stunden ein.
    const adjustments = await prisma.payrollAdjustment.findMany({
      where: {
        periodFrom,
        periodTo,
        ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
      },
      include: { user: { select: { name: true, hourlyRate: true, overheadPercent: true } } },
    })
    let hasAdjustments = false
    for (const adj of adjustments) {
      if (adminIds.has(adj.userId)) continue
      hasAdjustments = true
      const agg = byUser.get(adj.userId) ?? {
        userId: adj.userId,
        name: adj.user.name,
        hourlyRate: adj.user.hourlyRate,
        overheadPercent: adj.user.overheadPercent,
        hours: 0,
        adjReasons: [],
      }
      agg.hours += adj.hours
      agg.adjReasons.push(adj.reason)
      byUser.set(adj.userId, agg)
    }

    // Gesetzliche Pausenabzüge (§4 ArbZG, per "Tag freigeben" bestätigt) reduzieren
    // die Ist-Stunden auch im Lohn-Export, konsistent mit Dienstplan/Kostenübersicht.
    const breakMinutesByUser = await getBreakMinutesByUser(periodFrom, periodTo)
    for (const [userId, minutes] of Object.entries(breakMinutesByUser)) {
      if (adminIds.has(userId)) continue
      const agg = byUser.get(userId)
      if (!agg || minutes <= 0) continue
      agg.hours -= Math.min(agg.hours, minutes / 60)
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
      const row: Record<string, unknown> = {
        Name: a.name,
        'Ist-Stunden': parseFloat(a.hours.toFixed(2)),
        'Stundenlohn (€)': a.hourlyRate,
      }
      if (hasAdjustments) row['Begründung (Korrektur)'] = a.adjReasons.join(' / ')
      row['Trinkgeld (€)'] = tipShare
      return row
    })
  } else {
    const totalHours = tips > 0
      ? entries.reduce((sum, e) => sum + calcHours(e.checkinAt, e.checkoutAt!), 0)
      : 0

    // Gesetzliche Pausenabzüge (§4 ArbZG) sind pro (MA, Tag) hinterlegt, der
    // Export aber pro Stempel-Zeile – der Abzug wird dem letzten Eintrag des
    // jeweiligen Tages zugeordnet (spätester Ausstempel-Zeitpunkt).
    const breakMinutesByUserDay = await getBreakMinutesByUserAndDay(periodFrom, periodTo)
    const hasBreakDeductions = Object.keys(breakMinutesByUserDay).length > 0
    const lastEntryIdByUserDay = new Map<string, string>()
    if (hasBreakDeductions) {
      const latestCheckoutByKey = new Map<string, Date>()
      for (const e of entries) {
        const key = `${e.userId}|${formatBerlin(e.checkinAt, 'yyyy-MM-dd')}`
        if (!breakMinutesByUserDay[key]) continue
        const cur = latestCheckoutByKey.get(key)
        if (!cur || e.checkoutAt! > cur) {
          latestCheckoutByKey.set(key, e.checkoutAt!)
          lastEntryIdByUserDay.set(key, e.id)
        }
      }
    }

    rows = entries.map((e) => {
      let hours = calcHours(e.checkinAt, e.checkoutAt!)
      const day = formatBerlin(e.checkinAt, 'yyyy-MM-dd')
      const key = `${e.userId}|${day}`
      const deductedMinutes = lastEntryIdByUserDay.get(key) === e.id ? breakMinutesByUserDay[key] : 0
      if (deductedMinutes) hours -= Math.min(hours, deductedMinutes / 60)
      const cost = calcLaborCost(hours, e.user.hourlyRate, e.user.overheadPercent)
      const tipShare = tips > 0 && totalHours > 0
        ? parseFloat(((hours / totalHours) * tips).toFixed(2))
        : null
      const row: Record<string, unknown> = {
        Name: e.user.name,
        Datum: formatBerlin(e.checkinAt, 'dd.MM.yyyy'),
        'Geplant Von': e.shift?.startTime || '',
        'Geplant Bis': e.shift?.endTime || '',
        Einstempeln: formatBerlin(e.checkinAt, 'HH:mm'),
        Ausstempeln: formatBerlin(e.checkoutAt!, 'HH:mm'),
        'Ist-Stunden': parseFloat(hours.toFixed(2)),
        Standort: e.location.name,
        'Stundenlohn (€)': e.user.hourlyRate,
        'NK-Quote (%)': e.user.overheadPercent,
        'Lohnkosten (€)': parseFloat(cost.toFixed(2)),
      }
      if (hasBreakDeductions) row['Pausenabzug (Min)'] = deductedMinutes || 0
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
