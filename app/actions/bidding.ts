'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { startOfWeek } from 'date-fns'

export async function releaseWeek(weekStart: string): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Keine Berechtigung')

  const monday = startOfWeek(new Date(weekStart), { weekStartsOn: 1 })

  await prisma.weekRelease.upsert({
    where: { weekStart: monday },
    update: {},
    create: { weekStart: monday, releasedBy: session.userId },
  })

  revalidatePath('/admin/schedule')
  revalidatePath('/employee/open-shifts')
}

export async function assignShiftToApplicant(shiftId: string, applicantUserId: string): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Keine Berechtigung')

  await prisma.shift.update({ where: { id: shiftId }, data: { userId: applicantUserId } })
  await prisma.shiftApplication.updateMany({
    where: { shiftId, userId: applicantUserId },
    data: { status: 'ASSIGNED' },
  })
  await prisma.shiftApplication.updateMany({
    where: { shiftId, userId: { not: applicantUserId } },
    data: { status: 'REJECTED' },
  })

  revalidatePath('/admin/schedule')
  revalidatePath('/employee/open-shifts')
}

export async function applyForShift(shiftId: string): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE') return { error: 'Keine Berechtigung' }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) return { error: 'Schicht nicht gefunden' }
  if (shift.userId !== null) return { error: 'Schicht ist bereits besetzt' }

  const monday = startOfWeek(shift.date, { weekStartsOn: 1 })
  const release = await prisma.weekRelease.findUnique({ where: { weekStart: monday } })
  if (!release) return { error: 'Diese Woche ist noch nicht freigegeben' }

  await prisma.shiftApplication.create({
    data: { shiftId, userId: session.userId },
  })

  revalidatePath('/employee/open-shifts')
  return {}
}

export async function withdrawApplication(applicationId: string): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const app = await prisma.shiftApplication.findUnique({ where: { id: applicationId } })
  if (!app) return { error: 'Bewerbung nicht gefunden' }
  if (app.userId !== session.userId) return { error: 'Keine Berechtigung' }
  if (app.status !== 'PENDING') return { error: 'Bewerbung kann nicht mehr zurückgezogen werden' }

  await prisma.shiftApplication.delete({ where: { id: applicationId } })

  revalidatePath('/employee/open-shifts')
  return {}
}
