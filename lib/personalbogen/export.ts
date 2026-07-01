import { format } from 'date-fns'
import type { User } from '@/app/generated/prisma/client'
import { COMPANY_NAME } from '@/lib/company'

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

/** Eine Zeile (= ein MA) für Personalbogen-Export/Versand. */
export function personalbogenRow(u: User): Record<string, unknown> {
  return {
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
    Eintritt: d(u.startDate),
    Austritt: d(u.endDate),
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
    'Urlaub jährlich (Tage)': u.vacationDaysPerYear ?? '',
    'Urlaub lfd. Jahr (Tage)': u.vacationDaysProRata ?? '',
    Status: u.onboardingCompletedAt ? 'ausgefüllt' : 'offen',
  }
}

export function personalbogenRows(users: User[]): Record<string, unknown>[] {
  return users.map(personalbogenRow)
}

const slug = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()

/** Dateibasis: bei genau einem MA dessen Name, sonst Sammel-Export. */
export function personalbogenFileBase(users: User[]): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (users.length === 1) {
    const u = users[0]
    const name = slug([u.lastName, u.firstName].filter(Boolean).join('-') || u.name)
    return `personalbogen_${name}_${today}`
  }
  return `personalboegen_${today}`
}

/** Excel-Datei (xlsx) als Buffer. */
export async function personalbogenExcel(users: User[]): Promise<Buffer> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(personalbogenRows(users))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Personalbögen')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** CSV (Semikolon-getrennt, mit BOM-freiem Body – Aufrufer stellt BOM voran). */
export function personalbogenCsv(users: User[]): string {
  const rows = personalbogenRows(users)
  const headers = Object.keys(rows[0] || { Name: '' })
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[;\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ].join('\n')
}
