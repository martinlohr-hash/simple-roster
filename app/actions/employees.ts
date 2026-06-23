'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin, isSuperAdmin } from '@/lib/session'
import { sendInviteEmail } from '@/lib/email/invite'

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

  const name = formData.get('name') as string
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
  const address = (formData.get('address') as string) || null
  const unavailableDays = parseDays(formData.getAll('unavailableDays'))
  const preferredDays = parseDays(formData.getAll('preferredDays'))
  const earliestStart = (formData.get('earliestStart') as string) || null
  const latestEnd = (formData.get('latestEnd') as string) || null

  const inviteToken = randomBytes(32).toString('hex')
  const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    await prisma.user.create({
      data: {
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
        vacationDaysPerYear,
        startDate,
        endDate,
        birthday,
        phone,
        address,
        unavailableDays,
        preferredDays,
        earliestStart,
        latestEnd,
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
  const data: Record<string, unknown> = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    hourlyRate: salaryType === 'monthly' ? 0 : (parseFloat(formData.get('hourlyRate') as string) || 0),
    monthlyRate: salaryType === 'monthly' ? (parseFloat(formData.get('monthlyRate') as string) || 0) : null,
    overheadPercent: parseFloat(formData.get('overheadPercent') as string) || 0,
    maxHoursWeek: formData.get('maxHoursWeek')
      ? parseFloat(formData.get('maxHoursWeek') as string)
      : null,
    maxHoursMonth: formData.get('maxHoursMonth')
      ? parseFloat(formData.get('maxHoursMonth') as string)
      : null,
    vacationDaysPerYear: parseInt(formData.get('vacationDaysPerYear') as string) || 0,
    startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : null,
    endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
    birthday: formData.get('birthday') ? new Date(formData.get('birthday') as string) : null,
    phone: (formData.get('phone') as string) || null,
    address: (formData.get('address') as string) || null,
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

  await prisma.user.update({ where: { id }, data })
  revalidatePath('/admin/employees')
  redirect('/admin/employees')
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
function date(v: FormDataEntryValue | null): Date | null {
  const s = (v as string | null) || ''
  return s ? new Date(s) : null
}

// Speichert den kompletten Personalbogen (MA-Teil + Beschäftigungs-Teil) durch den Admin.
export async function updatePersonalbogen(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const firstName = str(formData.get('firstName'))
  const lastName = str(formData.get('lastName'))
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const street = str(formData.get('street'))
  const postalCode = str(formData.get('postalCode'))
  const city = str(formData.get('city'))
  const address = [street, [postalCode, city].filter(Boolean).join(' ').trim()]
    .filter(Boolean)
    .join(', ') || null

  try {
    await prisma.user.update({
      where: { id },
      data: {
        // Angaben zum Mitarbeiter
        firstName,
        lastName,
        ...(fullName ? { name: fullName } : {}),
        email: str(formData.get('email')) ?? undefined,
        street,
        postalCode,
        city,
        address,
        nationality: str(formData.get('nationality')),
        birthday: date(formData.get('birthday')),
        birthName: str(formData.get('birthName')),
        birthPlace: str(formData.get('birthPlace')),
        gender: pickEnum(GENDERS, formData.get('gender') as string | null),
        taxId: (str(formData.get('taxId')) || '').replace(/\s/g, '') || null,
        socialSecurityNo: (str(formData.get('socialSecurityNo')) || '').replace(/\s/g, '') || null,
        iban: (str(formData.get('iban')) || '').replace(/\s/g, '') || null,
        healthInsurance: str(formData.get('healthInsurance')),
        phone: str(formData.get('phone')),
        // Angaben zur Beschäftigung
        personnelNumber: str(formData.get('personnelNumber')),
        entryDate: date(formData.get('entryDate')),
        exitDate: date(formData.get('exitDate')),
        jobTitle: str(formData.get('jobTitle')),
        weeklyWorkTime: str(formData.get('weeklyWorkTime')),
        grossSalary: str(formData.get('grossSalary')),
        additionalSalaryComponents: str(formData.get('additionalSalaryComponents')),
        specialPayments: str(formData.get('specialPayments')),
        payrollType: pickEnum(PAYROLL_TYPES, formData.get('payrollType') as string | null),
        shortTermLimit: str(formData.get('shortTermLimit')),
        voluntaryInternship: formData.get('voluntaryInternship') === 'on',
        shareholderPercent: str(formData.get('shareholderPercent')),
        otherEmployment: pickEnum(OTHER_EMPLOYMENTS, formData.get('otherEmployment') as string | null),
        vacationDaysAnnual: num(formData.get('vacationDaysAnnual') as string | null),
        vacationDaysProRata: num(formData.get('vacationDaysProRata') as string | null),
      },
    })
  } catch {
    return { error: 'Speichern fehlgeschlagen (E-Mail evtl. bereits vergeben).' }
  }

  revalidatePath(`/admin/employees/${id}/personalbogen`)
  revalidatePath('/admin/personalbogen')
  revalidatePath('/admin/employees')
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

  await prisma.user.update({ where: { id }, data: { endDate: new Date() } })
  revalidatePath('/admin/employees')
}
