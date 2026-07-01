// Gemeinsame Helfer für die Dokument-Generierung (Arbeitsvertrag, Kündigung).
// Speist sich ausschließlich aus den Personalbogen-Daten des Users (User-Model).
// Reine Funktionen – keine DB-Zugriffe, damit sowohl Druck-Seiten als auch
// (späterer) Server-Code dieselbe Logik teilen.
import { format, addDays, differenceInCalendarYears } from 'date-fns'
import { de } from 'date-fns/locale'
import { COMPANY_NAME } from '@/lib/company'

export type Gender = 'MALE' | 'FEMALE' | 'DIVERSE' | null | undefined

// ── Firmen-Stammdaten (Briefkopf/Fuß) ────────────────────────────────────
export const COMPANY = {
  name: COMPANY_NAME,
  street: 'Isestr. 85',
  city: '20149 Hamburg',
  managingDirector: 'Martin Lohr',
  // Urlaubsanspruch bei Vollzeit (5-Tage-Woche); bei Teilzeit/Abruf anteilig.
  vollzeitUrlaubstage: 24,
  footerLines: [
    'Simple Sandwich Holding GmbH | HRB 194190',
    'Simple Sandwich Hamburg GmbH | HRB 194322',
    'Isestr. 85 | 20149 Hamburg | hello@asimple.world',
  ],
}

// ── Datums-Formatierung ──────────────────────────────────────────────────
/** 24.06.2026 */
export const dDot = (v: Date | null | undefined) => (v ? format(v, 'dd.MM.yyyy') : '')
/** 1. Oktober 2025 (für Vertragsfließtext) */
export const dLong = (v: Date | null | undefined) =>
  v ? format(v, 'd. MMMM yyyy', { locale: de }) : ''

// ── Anrede / Geschlecht ──────────────────────────────────────────────────
/** "Herr" / "Frau" / "" – für Adressblock & Sie-Anrede. */
export function herrFrau(gender: Gender): string {
  if (gender === 'MALE') return 'Herr'
  if (gender === 'FEMALE') return 'Frau'
  return ''
}

/**
 * Brief-Anrede.
 *  - du-Form (Simple-Standard): "Lieber Viktor," / "Liebe Anna," / "Hallo …,"
 *  - Sie-Form: "Sehr geehrter Herr Horky," / "Sehr geehrte Frau …,"
 */
export function anrede(
  form: 'du' | 'sie',
  gender: Gender,
  firstName: string,
  lastName: string,
): string {
  if (form === 'sie') {
    if (gender === 'MALE') return `Sehr geehrter Herr ${lastName},`
    if (gender === 'FEMALE') return `Sehr geehrte Frau ${lastName},`
    return `Guten Tag ${firstName} ${lastName},`
  }
  if (gender === 'MALE') return `Lieber ${firstName},`
  if (gender === 'FEMALE') return `Liebe ${firstName},`
  return `Hallo ${firstName},`
}

/** Personalpronomen passend zur du-/Sie-Form (für Fließtext der Kündigung). */
export function pronomen(form: 'du' | 'sie') {
  return form === 'sie'
    ? { subj: 'Sie', dat: 'Ihnen', possRefl: 'sich', poss: 'Ihre', anrSuffix: 'en' }
    : { subj: 'Du', dat: 'Dir', possRefl: 'Dich', poss: 'Deine', anrSuffix: '' }
}

// ── Adressblock ──────────────────────────────────────────────────────────
export interface EmployeeLike {
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  street?: string | null
  postalCode?: string | null
  city?: string | null
  gender?: Gender
  // Kanonische Quelle = die operativen Spalten (startDate/endDate/vacationDaysPerYear).
  // entryDate/exitDate/vacationDaysAnnual sind nur gespiegelte Kopien davon.
  startDate?: Date | null
  endDate?: Date | null
  jobTitle?: string | null
  grossSalary?: string | null
  weeklyWorkTime?: string | null
  vacationDaysPerYear?: number | null
  additionalSalaryComponents?: string | null
  specialPayments?: string | null
}

// Best-effort-Parser für eine deutsche Adresse "Straße Nr, PLZ Ort".
// Gibt nur bei eindeutigem 5-stelligem PLZ-Treffer Werte zurück (sonst null →
// vorhandene strukturierte Felder werden NICHT überschrieben).
export function parseGermanAddress(
  input: string | null | undefined,
): { street: string; postalCode: string; city: string } | null {
  if (!input) return null
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const street = parts[0]
  const m = parts.slice(1).join(', ').match(/(\d{5})\s+(.+)/)
  if (!m) return null
  return { street, postalCode: m[1], city: m[2].trim() }
}

// Deutsche Zahl (2 Nachkommastellen, abschließende ,00 bleibt für Geldbeträge weg-trimmbar).
function deNumber(n: number, decimals = 2): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Leitet den Brutto-Verdienst-Freitext aus den operativen Lohnfeldern ab
// (operative Zahl = einzige Quelle). Monatslohn hat Vorrang vor Stundenlohn.
export function deriveGrossSalary(
  hourlyRate?: number | null,
  monthlyRate?: number | null,
): string | null {
  if (monthlyRate && monthlyRate > 0) return `${deNumber(monthlyRate)} € / Monat`
  if (hourlyRate && hourlyRate > 0) return `${deNumber(hourlyRate)} €/Stunde`
  return null
}

// Leitet die Wochenarbeitszeit aus Max. Std./Woche ab. Ganze Zahlen ohne Nachkommastellen.
export function deriveWeeklyWorkTime(maxHoursWeek?: number | null): string | null {
  if (maxHoursWeek == null || maxHoursWeek <= 0) return null
  const n = Number.isInteger(maxHoursWeek) ? String(maxHoursWeek) : deNumber(maxHoursWeek, 1)
  return `${n} Std/Woche`
}

// Setzt aus strukturierten Feldern den Freitext "Straße, PLZ Ort" zusammen.
export function composeAddress(
  street?: string | null,
  postalCode?: string | null,
  city?: string | null,
): string | null {
  const plzOrt = [postalCode, city].filter(Boolean).join(' ').trim()
  return [street, plzOrt].filter(Boolean).join(', ') || null
}

export function fullName(u: EmployeeLike): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || ''
}

/** Zeilen des Empfänger-Adressblocks (oben links auf Brief/Vertrag). */
export function addressLines(u: EmployeeLike): string[] {
  const plzOrt = [u.postalCode, u.city].filter(Boolean).join(' ')
  return [fullName(u), u.street || '', plzOrt].filter(Boolean)
}

// ── Pflichtfeld-Prüfung pro Dokumenttyp ──────────────────────────────────
export type DocType = 'arbeitsvertrag' | 'kuendigung-probezeit' | 'kuendigung-regulaer'

interface FieldCheck {
  ok: boolean
  label: string
}

/**
 * Prüft, ob die für ein Dokument nötigen Personalbogen-Felder gepflegt sind.
 * Gibt die Liste der FEHLENDEN Felder zurück (leer = alles da).
 */
export function missingFields(u: EmployeeLike, type: DocType): string[] {
  const base: FieldCheck[] = [
    { ok: !!(u.firstName && u.lastName) || !!u.name, label: 'Vor- und Nachname' },
    { ok: !!u.street, label: 'Straße und Hausnummer' },
    { ok: !!(u.postalCode && u.city), label: 'PLZ und Ort' },
  ]
  const checks: FieldCheck[] = [...base]

  if (type === 'arbeitsvertrag') {
    checks.push(
      { ok: !!u.startDate, label: 'Eintrittsdatum' },
      { ok: !!u.jobTitle, label: 'Tätigkeitsbezeichnung' },
      { ok: !!u.grossSalary, label: 'Brutto-Verdienst' },
      { ok: !!u.weeklyWorkTime, label: 'Wochenarbeitszeit' },
    )
  } else {
    checks.push({ ok: !!u.startDate, label: 'Eintrittsdatum (Vertragsbeginn)' })
    if (type === 'kuendigung-regulaer') {
      checks.push({ ok: !!u.endDate, label: 'Austrittsdatum' })
    }
  }
  return checks.filter((c) => !c.ok).map((c) => c.label)
}

// ── Kündigungs-Logik ─────────────────────────────────────────────────────
/**
 * Enddatum der Kündigung.
 *  - Probezeit: explizites Austrittsdatum, sonst „Briefdatum + 14 Tage".
 *  - Regulär:   Austrittsdatum (Pflichtfeld).
 */
export function kuendigungEndDate(u: EmployeeLike, type: DocType, letterDate: Date): Date | null {
  if (u.endDate) return u.endDate
  if (type === 'kuendigung-probezeit') return addDays(letterDate, 14)
  return null
}

/**
 * Gesetzliche Grundkündigungsfrist nach § 622 BGB anhand der Betriebszugehörigkeit
 * (nur für die reguläre Kündigung als Hinweistext).
 */
export function gesetzlicheFrist(entryDate: Date | null | undefined, ref: Date): string {
  if (!entryDate) return 'vier Wochen zum Fünfzehnten oder zum Ende eines Kalendermonats'
  const years = differenceInCalendarYears(ref, entryDate)
  if (years >= 20) return 'sieben Monaten zum Ende eines Kalendermonats'
  if (years >= 15) return 'sechs Monaten zum Ende eines Kalendermonats'
  if (years >= 12) return 'fünf Monaten zum Ende eines Kalendermonats'
  if (years >= 10) return 'vier Monaten zum Ende eines Kalendermonats'
  if (years >= 8) return 'drei Monaten zum Ende eines Kalendermonats'
  if (years >= 5) return 'zwei Monaten zum Ende eines Kalendermonats'
  if (years >= 2) return 'einem Monat zum Ende eines Kalendermonats'
  return 'vier Wochen zum Fünfzehnten oder zum Ende eines Kalendermonats'
}

// ── Urlaub: gesetzlich + zusätzlich aufschlüsseln (für Vertrag) ──────────
export function urlaubSplit(vacationDaysAnnual: number | null | undefined) {
  const total = vacationDaysAnnual ?? 30
  const gesetzlich = Math.min(20, total)
  const zusaetzlich = Math.max(0, total - gesetzlich)
  return { total, gesetzlich, zusaetzlich }
}
