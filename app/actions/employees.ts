'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin, isSuperAdmin } from '@/lib/session'

export async function createEmployee(
  formData: FormData,
): Promise<{ inviteToken?: string; error?: string }> {
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
        primaryLocationId: locationId || undefined,
        role,
      },
    })
  } catch {
    return { error: 'Diese E-Mail-Adresse ist bereits vergeben.' }
  }

  revalidatePath('/admin/employees')
  return { inviteToken }
}

export async function resendInvite(userId: string): Promise<{ inviteToken: string }> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const inviteToken = randomBytes(32).toString('hex')
  const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: { inviteToken, inviteTokenExpiry, status: 'PENDING' },
  })

  revalidatePath('/admin/employees')
  return { inviteToken }
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

export async function deleteEmployee(id: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')
  if (!isSuperAdmin(session.role)) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (target && isSuperAdmin(target.role)) throw new Error('Unauthorized')
  }

  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/employees')
}
