'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { queueShiftEmail, queueWeekReleasedEmail } from '@/lib/mail/queue'

function utcMonday(date: Date): Date {
  const utcDay = date.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = (utcDay + 6) % 7
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysToMonday))
}

export async function revokeWeekRelease(weekStart: string): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Keine Berechtigung')

  const monday = utcMonday(new Date(weekStart + 'T00:00:00.000Z'))

  await prisma.weekRelease.deleteMany({ where: { weekStart: monday } })

  // Lösche ausstehende week_released-Mails für diese Woche (falls noch nicht versendet)
  const pending = await prisma.pendingEmail.findMany({
    where: { type: 'week_released', sentAt: null },
  })
  const weekEnd = new Date(monday)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  for (const p of pending) {
    if (p.metadata && typeof p.metadata === 'object' && 'weekStart' in p.metadata) {
      const pWeekStart = new Date((p.metadata as Record<string, unknown>).weekStart as string)
      if (pWeekStart.getTime() === monday.getTime()) {
        await prisma.pendingEmail.delete({ where: { id: p.id } })
      }
    }
  }

  revalidatePath('/admin/schedule')
  revalidatePath('/employee/open-shifts')
}

export async function releaseWeek(weekStart: string): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Keine Berechtigung')

  // Parse as UTC midnight to avoid local-timezone drift
  const monday = utcMonday(new Date(weekStart + 'T00:00:00.000Z'))

  const release = await prisma.weekRelease.upsert({
    where: { weekStart: monday },
    update: {},
    create: { weekStart: monday, releasedBy: session.userId },
  })

  // Queue E-Mails an alle MA
  if (release.id) { // neu erstellt
    await queueWeekReleasedEmail(session.userId, monday)
  }

  revalidatePath('/admin/schedule')
  revalidatePath('/employee/open-shifts')
}

export async function assignShiftToApplicant(shiftId: string, applicantUserId: string): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Keine Berechtigung')

  const shift = await prisma.shift.update({
    where: { id: shiftId },
    data: { userId: applicantUserId },
    include: { location: { select: { name: true } } },
  })
  await prisma.shiftApplication.updateMany({
    where: { shiftId, userId: applicantUserId },
    data: { status: 'ASSIGNED' },
  })
  await queueShiftEmail(applicantUserId, [{
    shiftId: shift.id,
    action: 'assigned',
    date: shift.date.toISOString().split('T')[0],
    startTime: shift.startTime,
    endTime: shift.endTime,
    location: shift.location.name,
  }])
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

  const monday = utcMonday(shift.date)
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
