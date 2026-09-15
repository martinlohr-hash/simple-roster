'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin, isSuperAdmin } from '@/lib/session'
import { sendInviteEmail } from '@/lib/email/invite'
import { parseGermanAddress, composeAddress, deriveGrossSalary, deriveWeeklyWorkTime } from '@/lib/documents'
import { sendExitNoticeToPayroll } from '@/app/actions/personalbogen'

function parseDays(values: FormDataEntryValue[]): number[] {
  return values
    .map((v) => parseInt(v as string, 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6)
}

// Verschickt die Einladung und meldet zurück, ob sie raus ging.
// Mail-Fehler dürfen die MA-Anlage NICHT abbrechen → der Admin kann den Link
// als Fallback weiterhin kopieren/erneut senden.
async function tryInvite(
  to: string,
  name: string,
  inviteToken: string,
): Promise<{ emailSent: boolean; emailError?: string }> {
  try {
    const sent = await sendInviteEmail({ to, name, inviteToken })
    return { emailSent: sent }
  } catch (e) {
    console.error('Einladungsmail fehlgeschlagen:', e)
    return { emailSent: false, emailError: 'E-Mail konnte nicht versendet werden.' }
  }
}

export async function createEmployee(
  formData: FormData,
): Promise<{ inviteToken?: string; emailSent?: boolean; emailError?: string; error?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const firstName = (formData.get('firstName') as string)?.trim() || null
  const lastName = (formData.get('lastName') as string)?.trim() || null
  const name = [firstName, lastName].filter(Boolean).join(' ')
  const email = formData.get('email') as string
  const salaryType = formData.get('salaryType') as string
  const hourlyRate = salaryType === 'monthly' ? 0 : (parseFloat(formData.get('hourlyRate') as string) || 0)
  const monthlyRate = salaryType === 'monthly' ? (parseFloat(formData.get('monthlyRate') as string) || 0) : null
  const overheadPercent = parseFloat(formData.get('overheadPercent') as string) || 0
  const maxHoursWeek = formData.get('maxHoursWeek')
    ? parseFloat(formData.get('maxHoursWeek') as string)
    : null
  const maxHoursMonth = formData.get('maxHoursMonth')
    ? parseFloat(formData.get('maxHoursMonth') as string)
    : null
  const vacationDaysPerYear = parseInt(formData.get('vacationDaysPerYear') as string) || 0
  const locationId = (formData.get('locationId') as string) || null
  const role = (formData.get('role') as 'ADMIN' | 'EMPLOYEE') || 'EMPLOYEE'
  const startDate = formData.get('startDate') ? new Date(formData.get('startDate') as string) : null
  const endDate = formData.get('endDate') ? new Date(formData.get('endDate') as string) : null
  const birthday = formData.get('birthday') ? new Date(formData.get('birthday') as string) : null
  const phone = (formData.get('phone') as string) || null
  const address = ((formData.get('address') as string) || '').trim() || null
  const parsedAddr = parseGermanAddress(address)
  const unavailableDays = parseDays(formData.getAll('unavailableDays'))
  const preferredDays = parseDays(formData.getAll('preferredDays'))
  const earliestStart = (formData.get('earliestStart') as string) || null
  const latestEnd = (formData.get('latestEnd') as string) || null
  // Admin hat die Daten schon → Begrüßungsbogen (/willkommen) beim ersten Login überspringen.
  const onboardingCompletedAt = formData.get('onboardingDone') === 'on' ? new Date() : null

  const inviteToken = randomBytes(32).toString('hex')
  const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        name,
        email,
        passwordHash: null,
        status: 'PENDING',
        inviteToken,
        inviteTokenExpiry,
        hourlyRate,
        monthlyRate,
        overheadPercent,
        maxHoursWeek,
        maxHoursMonth,
        grossSalary: deriveGrossSalary(hourlyRate, monthlyRate), // abgeleitet
        weeklyWorkTime: deriveWeeklyWorkTime(maxHoursWeek), // abgeleitet
        vacationDaysPerYear,
        vacationDaysAnnual: vacationDaysPerYear, // Spiegel (Personalbogen)
        startDate,
        entryDate: startDate, // Spiegel
        endDate,
        exitDate: endDate, // Spiegel
        birthday,
        phone,
        address,
        ...(parsedAddr ? { street: parsedAddr.street, postalCode: parsedAddr.postalCode, city: parsedAddr.city } : {}),
        unavailableDays,
        preferredDays,
        earliestStart,
        latestEnd,
        onboardingCompletedAt,
        primaryLocationId: locationId || undefined,
        role,
      },
    })
  } catch {
    return { error: 'Diese E-Mail-Adresse ist bereits vergeben.' }
  }

  const { emailSent, emailError } = await tryInvite(email, name, inviteToken)

  revalidatePath('/admin/employees')
  return { inviteToken, emailSent, emailError }
}

export async function resendInvite(
  userId: string,
): Promise<{ inviteToken: string; emailSent?: boolean; emailError?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const inviteToken = randomBytes(32).toString('hex')
  const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { inviteToken, inviteTokenExpiry, status: 'PENDING' },
    select: { email: true, name: true },
  })

  const { emailSent, emailError } = await tryInvite(user.email, user.name, inviteToken)

  revalidatePath('/admin/employees')
  return { inviteToken, emailSent, emailError }
}

export async function updateEmployee(id: string, formData: FormData) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')
  if (!isSuperAdmin(session.role)) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (target && isSuperAdmin(target.role)) throw new Error('Unauthorized')
  }

  const salaryType = formData.get('salaryType') as string
  // Kanonische Werte + Spiegel in die Personalbogen-Spalten (eine Quelle, überall gleich)
  const startDate = formData.get('startDate') ? new Date(formData.get('startDate') as string) : null
  const endDate = formData.get('endDate') ? new Date(formData.get('endDate') as string) : null
  const vacationDaysPerYear = parseInt(formData.get('vacationDaysPerYear') as string) || 0
  // Name & Adresse: Stammdaten = einzige Quelle (Vor-/Nachname → name, struktur → address)
  const firstName = (formData.get('firstName') as string)?.trim() || null
  const lastName = (formData.get('lastName') as string)?.trim() || null
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null
  const street = (formData.get('street') as string)?.trim() || null
  const postalCode = (formData.get('postalCode') as string)?.trim() || null
  const city = (formData.get('city') as string)?.trim() || null
  const address = composeAddress(street, postalCode, city)
  // Lohn/Stunden: operative Zahl = Quelle, Personalbogen-Freitext wird daraus abgeleitet
  const hourlyRate = salaryType === 'monthly' ? 0 : (parseFloat(formData.get('hourlyRate') as string) || 0)
  const monthlyRate = salaryType === 'monthly' ? (parseFloat(formData.get('monthlyRate') as string) || 0) : null
  const maxHoursWeek = formData.get('maxHoursWeek') ? parseFloat(formData.get('maxHoursWeek') as string) : null
  const data: Record<string, unknown> = {
    firstName,
    lastName,
    ...(fullName ? { name: fullName } : {}),
    email: formData.get('email') as string,
    hourlyRate,
    monthlyRate,
    overheadPercent: parseFloat(formData.get('overheadPercent') as string) || 0,
    maxHoursWeek,
    maxHoursMonth: formData.get('maxHoursMonth')
      ? parseFloat(formData.get('maxHoursMonth') as string)
      : null,
    grossSalary: deriveGrossSalary(hourlyRate, monthlyRate), // abgeleitet
    weeklyWorkTime: deriveWeeklyWorkTime(maxHoursWeek), // abgeleitet
    vacationDaysPerYear,
    vacationDaysAnnual: vacationDaysPerYear, // Spiegel (Personalbogen)
    startDate,
    entryDate: startDate, // Spiegel
    endDate,
    exitDate: endDate, // Spiegel
    birthday: formData.get('birthday') ? new Date(formData.get('birthday') as string) : null,
    phone: (formData.get('phone') as string) || null,
    street,
    postalCode,
    city,
    address,
    unavailableDays: parseDays(formData.getAll('unavailableDays')),
    preferredDays: parseDays(formData.getAll('preferredDays')),
    earliestStart: (formData.get('earliestStart') as string) || null,
    latestEnd: (formData.get('latestEnd') as string) || null,
    primaryLocationId: (formData.get('locationId') as string) || null,
    role: (formData.get('role') as 'ADMIN' | 'EMPLOYEE') || 'EMPLOYEE',
  }

  const newPassword = formData.get('password') as string
  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 10)
  }

  // Begrüßungsbogen-Marker: gesetzten Zeitpunkt beibehalten, sonst neu setzen / leeren.
  if (formData.get('onboardingDone') === 'on') {
    const current = await prisma.user.findUnique({ where: { id }, select: { onboardingCompletedAt: true } })
    data.onboardingCompletedAt = current?.onboardingCompletedAt ?? new Date()
  } else {
    data.onboardingCompletedAt = null
  }

  await prisma.user.update({ where: { id }, data })

  // Admin hat beim Speichern bestätigt, dass das (neue/geänderte) Austrittsdatum
  // ans Lohnbüro gemeldet werden soll (Confirm-Dialog in EmployeeForm). Ergebnis
  // geht als Query-Param mit, damit die Seite sichtbar rückmeldet, ob die Mail
  // wirklich raus ist – sonst merkt der Admin einen stillen Fehlschlag nicht.
  let payrollNotice: 'sent' | 'failed' | null = null
  if (formData.get('notifyPayroll') === '1' && endDate) {
    const nameForMail = fullName || (formData.get('email') as string) || 'Unbekannt'
    const result = await sendExitNoticeToPayroll(nameForMail, endDate)
    payrollNotice = 'ok' in result ? 'sent' : 'failed'
  }

  revalidatePath('/admin/employees')
  revalidatePath(`/admin/employees/${id}`)
  redirect(`/admin/employees/${id}?tab=stammdaten${payrollNotice ? `&payrollNotice=${payrollNotice}` : ''}`)
}

const PAYROLL_TYPES = [
  'SV_PFLICHTIG', 'AUSZUBILDENDER', 'MINIJOBBER', 'WERKSTUDENT',
  'KURZFRISTIG', 'PFLICHTPRAKTIKUM', 'GESCHAEFTSFUEHRER', 'SONSTIGES',
] as const
const OTHER_EMPLOYMENTS = [
  'NEIN', 'JA_SV_PFLICHTIG', 'JA_MINIJOB', 'JA_KURZFRISTIG', 'JA_SELBSTSTAENDIG',
] as const
const GENDERS = ['MALE', 'FEMALE', 'DIVERSE'] as const

function pickEnum<T extends readonly string[]>(allowed: T, v: string | null): T[number] | null {
  return v && (allowed as readonly string[]).includes(v) ? (v as T[number]) : null
}
function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = parseFloat(v.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}
function str(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim()
  return s || null
}

// Speichert den kompletten Personalbogen (MA-Teil + Beschäftigungs-Teil) durch den Admin.
export async function updatePersonalbogen(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  // Der Personalbogen pflegt NUR noch die HR-Detail-Felder. Name, Adresse,
  // Geburtstag, Telefon, E-Mail, Eintritt/Austritt, Urlaubsanspruch und Lohn/Std
  // liegen ausschließlich in den Stammdaten (updateEmployee) → eine Bearbeitungsstelle.
  try {
    await prisma.user.update({
      where: { id },
      data: {
        // Persönliche HR-Daten
        nationality: str(formData.get('nationality')),
        birthName: str(formData.get('birthName')),
        birthPlace: str(formData.get('birthPlace')),
        gender: pickEnum(GENDERS, formData.get('gender') as string | null),
        taxId: (str(formData.get('taxId')) || '').replace(/\s/g, '') || null,
        socialSecurityNo: (str(formData.get('socialSecurityNo')) || '').replace(/\s/g, '') || null,
        iban: (str(formData.get('iban')) || '').replace(/\s/g, '') || null,
        healthInsurance: str(formData.get('healthInsurance')),
        // Angaben zur Beschäftigung
        personnelNumber: str(formData.get('personnelNumber')),
        jobTitle: str(formData.get('jobTitle')),
        additionalSalaryComponents: str(formData.get('additionalSalaryComponents')),
        specialPayments: str(formData.get('specialPayments')),
        payrollType: pickEnum(PAYROLL_TYPES, formData.get('payrollType') as string | null),
        shortTermLimit: str(formData.get('shortTermLimit')),
        voluntaryInternship: formData.get('voluntaryInternship') === 'on',
        shareholderPercent: str(formData.get('shareholderPercent')),
        otherEmployment: { set: (formData.getAll('otherEmployment') as string[])
          .filter((v): v is (typeof OTHER_EMPLOYMENTS)[number] => (OTHER_EMPLOYMENTS as readonly string[]).includes(v)) },
        vacationDaysProRata: num(formData.get('vacationDaysProRata') as string | null),
      },
    })
  } catch {
    return { error: 'Speichern fehlgeschlagen.' }
  }

  revalidatePath(`/admin/employees/${id}/personalbogen`)
  revalidatePath('/admin/personalbogen')
  revalidatePath('/admin/employees')
  return {}
}

// Speichert/aktualisiert den Google-Drive-Ordnerlink eines MA (Dokumente-Bereich).
export async function saveDocumentsUrl(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const raw = (formData.get('documentsUrl') as string | null)?.trim() || null
  if (raw && !/^https?:\/\//i.test(raw)) {
    return { error: 'Bitte eine vollständige URL angeben (mit https://).' }
  }

  await prisma.user.update({ where: { id }, data: { documentsUrl: raw } })
  revalidatePath(`/admin/employees/${id}/dokumente`)
  return {}
}

export async function deleteEmployee(id: string) {
  const session = await getSession()
  if (!session || !isSuperAdmin(session.role)) throw new Error('Unauthorized')

  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/employees')
}

export async function archiveEmployee(id: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const now = new Date()
  await prisma.user.update({ where: { id }, data: { endDate: now, exitDate: now } })
  revalidatePath('/admin/employees')
}
