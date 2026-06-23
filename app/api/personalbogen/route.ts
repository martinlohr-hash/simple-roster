import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { COMPANY_NAME } from '@/lib/company'
import { format } from 'date-fns'

const GENDER_LABELS: Record<string, string> = { MALE: 'männlich', FEMALE: 'weiblich', DIVERSE: 'divers' }
const PAYROLL_LABELS: Record<string, string> = {
  SV_PFLICHTIG: 'Sozialversicherungspflichtig',
  AUSZUBILDENDER: 'Auszubildender',
  MINIJOBBER: 'Minijobber',
  WERKSTUDENT: 'Werkstudent',
  KURZFRISTIG: 'Kurzfristige Beschäftigung',
  PFLICHTPRAKTIKUM: 'Pflichtpraktikum',
  GESCHAEFTSFUEHRER: 'Geschäftsführer',
  SONSTIGES: 'Sonstiges',
}
const OTHER_LABELS: Record<string, string> = {
  NEIN: 'Nein',
  JA_SV_PFLICHTIG: 'Ja, Sv-Pflichtig',
  JA_MINIJOB: 'Ja, Minijob',
  JA_KURZFRISTIG: 'Ja, kurzfristige Beschäftigung',
  JA_SELBSTSTAENDIG: 'Ja, Selbstständigkeit',
}

const d = (v: Date | null) => (v ? format(v, 'dd.MM.yyyy') : '')

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await decrypt(token) : null
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const fmt = sp.get('format') || 'csv'
  const scope = sp.get('scope') || 'active' // active = ohne ausgetretene MA
  const userId = sp.get('userId') // gesetzt = Einzel-Export nur dieses MA

  const users = await prisma.user.findMany({
    where: userId
      ? { id: userId }
      : scope === 'active'
        ? { exitDate: null, endDate: null }
        : {},
    orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
  })

  const rows: Record<string, unknown>[] = users.map((u) => ({
    Firmenname: COMPANY_NAME,
    // Angaben zum Mitarbeiter
    Name: u.lastName || u.name || '',
    Vorname: u.firstName || '',
    'Straße und Hausnummer': u.street || '',
    PLZ: u.postalCode || '',
    Ort: u.city || '',
    Staatsangehörigkeit: u.nationality || '',
    Geburtsdatum: d(u.birthday),
    Geburtsname: u.birthName || '',
    'Geburtsort und Land': u.birthPlace || '',
    Geschlecht: u.gender ? GENDER_LABELS[u.gender] : '',
    'Steuer-ID': u.taxId || '',
    'Sozialversicherungs-Nr.': u.socialSecurityNo || '',
    'Bankverbindung / IBAN': u.iban || '',
    Krankenkasse: u.healthInsurance || '',
    Telefon: u.phone || '',
    'E-Mail': u.email,
    // Angaben zur Beschäftigung
    Personalnummer: u.personnelNumber || '',
    Eintritt: d(u.entryDate),
    Austritt: d(u.exitDate),
    Tätigkeitsbezeichnung: u.jobTitle || '',
    Wochenarbeitszeit: u.weeklyWorkTime || '',
    'Brutto-Verdienst': u.grossSalary || '',
    'Sonstige Gehaltsbestandteile': u.additionalSalaryComponents || '',
    'Vertragliche Sonderzahlungen': u.specialPayments || '',
    'Abrechnungs-Art': u.payrollType ? PAYROLL_LABELS[u.payrollType] : '',
    'Kurzfristig-Grenze': u.shortTermLimit || '',
    'Freiwilliges Praktikum': u.voluntaryInternship ? 'Ja' : '',
    'Gesellschaftsanteile (%)': u.shareholderPercent || '',
    'Weitere Beschäftigungen': u.otherEmployment.map((e) => OTHER_LABELS[e] ?? e).join(', '),
    'Urlaub jährlich (Tage)': u.vacationDaysAnnual ?? '',
    'Urlaub lfd. Jahr (Tage)': u.vacationDaysProRata ?? '',
    Status: u.onboardingCompletedAt ? 'ausgefüllt' : 'offen',
  }))

  // Dateiname: bei Einzel-Export Name des MA, sonst Sammel-Export.
  const slug = (s: string) =>
    s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
  const single = userId && users[0]
  const fileBase = single
    ? `personalbogen_${slug([users[0].lastName, users[0].firstName].filter(Boolean).join('-') || users[0].name)}_${format(new Date(), 'yyyy-MM-dd')}`
    : `personalboegen_${format(new Date(), 'yyyy-MM-dd')}`

  if (fmt === 'excel') {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Personalbögen')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileBase}.xlsx"`,
      },
    })
  }

  const headers = Object.keys(rows[0] || { Name: '' })
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[;\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ].join('\n')

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileBase}.csv"`,
    },
  })
}
