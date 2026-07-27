'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'
import { queueShiftEmail } from '@/lib/mail/queue'

// Fachliche Fehler als Rückgabewert statt throw: geworfene Errors werden von
// Next.js in Production maskiert und kämen beim Nutzer nie an.
export type ShiftActionResult = { error?: string }

export async function createShift(data: {
  userId: string | null
  locationId: string
  date: string
  startTime: string
  endTime: string
}): Promise<ShiftActionResult> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }

  if (data.userId) {
    const conflict = await checkOverlap({ userId: data.userId, date: data.date, startTime: data.startTime, endTime: data.endTime })
    if (conflict) return { error: conflict }
  }

  const shift = await prisma.shift.create({
    data: {
      userId: data.userId ?? null,
      locationId: data.locationId,
      date: new Date(data.date + 'T00:00:00.000Z'),
      startTime: data.startTime,
      endTime: data.endTime,
    },
    include: { location: { select: { name: true } } },
  })

  // Queue E-Mail an MA, wenn zugewiesen
  if (shift.userId) {
    await queueShiftEmail(shift.userId, [{
      shiftId: shift.id,
      action: 'assigned',
      date: shift.date.toISOString().split('T')[0],
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location.name,
    }])
  }

  revalidatePath('/admin/schedule')
  return {}
}

export async function updateShift(id: string, data: { userId?: string | null; date?: string; startTime?: string; endTime?: string; locationId?: string }): Promise<ShiftActionResult> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }

  const existing = await prisma.shift.findUnique({
    where: { id },
    include: { location: { select: { name: true } } },
  })
  if (!existing) return { error: 'Schicht nicht gefunden' }

  const effectiveUserId = data.userId !== undefined ? data.userId : existing.userId
  const effectiveDate = data.date
    ? new Date(data.date).toISOString().slice(0, 10)
    : existing.date.toISOString().slice(0, 10)
  const effectiveStart = data.startTime ?? existing.startTime
  const effectiveEnd = data.endTime ?? existing.endTime

  if (effectiveUserId) {
    const conflict = await checkOverlap({
      userId: effectiveUserId,
      date: effectiveDate,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      excludeId: id,
    })
    if (conflict) return { error: conflict }
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      ...(data.userId !== undefined && { userId: data.userId }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
      ...(data.locationId && { locationId: data.locationId }),
    },
    include: { location: { select: { name: true } } },
  })

  // Queue E-Mails an betroffene MA
  const usersToNotify = new Set<string>()

  // Wenn alte/neue UserID unterschiedlich sind: beide benachrichtigen
  if (existing.userId && existing.userId !== effectiveUserId) {
    usersToNotify.add(existing.userId) // alte Schicht entfernt
  }
  if (effectiveUserId) {
    usersToNotify.add(effectiveUserId) // neue/geänderte Schicht
  }

  for (const userId of usersToNotify) {
    const isNewAssignment = !existing.userId && userId === effectiveUserId
    const isRemoved = existing.userId === userId && !effectiveUserId
    const isChanged = existing.userId === userId && (
      existing.startTime !== effectiveStart
      || existing.endTime !== effectiveEnd
      || existing.date.toISOString().split('T')[0] !== effectiveDate
    )

    if (isNewAssignment) {
      // neue Zuweisung
      await queueShiftEmail(userId, [{
        shiftId: id,
        action: 'assigned',
        date: effectiveDate,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        location: updated.location.name,
      }])
    } else if (isChanged && existing.userId === userId) {
      // Änderung an bestehender Schicht
      await queueShiftEmail(userId, [{
        shiftId: id,
        action: 'changed',
        date: effectiveDate,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        location: updated.location.name,
        oldStartTime: existing.startTime,
        oldEndTime: existing.endTime,
        oldLocation: existing.location.name,
      }])
    }
    // isRemoved: keine Mail nötig (Schicht wurde entfernt)
  }

  revalidatePath('/admin/schedule')
  return {}
}

export async function duplicateShift(id: string): Promise<ShiftActionResult> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }

  const original = await prisma.shift.findUnique({ where: { id } })
  if (!original) return { error: 'Schicht nicht gefunden' }

  await prisma.shift.create({
    data: {
      userId: original.userId,
      locationId: original.locationId,
      date: original.date,
      startTime: original.startTime,
      endTime: original.endTime,
      status: 'PLANNED',
    },
  })
  revalidatePath('/admin/schedule')
  return {}
}

export async function deleteShift(id: string): Promise<ShiftActionResult> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }

  const shift = await prisma.shift.findUnique({ where: { id } })
  await prisma.shift.deleteMany({ where: { id } })

  if (shift) {
    const dayStart = new Date(shift.date)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    const remaining = await prisma.shift.count({ where: { date: { gte: dayStart, lt: dayEnd } } })

    if (remaining === 0) {
      const defaultTemplate = await prisma.shiftTemplate.findFirst({
        where: { isDefault: true },
        include: { entries: true },
      })
      const dow = (shift.date.getDay() + 6) % 7
      const dayEntries = defaultTemplate?.entries.filter((e) => e.dayOfWeek === dow) ?? []
      if (dayEntries.length > 0) {
        await prisma.shift.createMany({
          data: dayEntries.map((e) => ({
            userId: null,
            locationId: e.locationId,
            date: shift.date,
            startTime: e.startTime,
            endTime: e.endTime,
            status: 'PLANNED' as const,
          })),
        })
      }
    }
  }

  revalidatePath('/admin/schedule')
  return {}
}

/** Liefert eine Konflikt-Meldung oder null, wenn die Zeiten frei sind. */
async function checkOverlap({
  userId,
  date,
  startTime,
  endTime,
  excludeId,
}: {
  userId: string
  date: string
  startTime: string
  endTime: string
  excludeId?: string
}): Promise<string | null> {
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

  const siblings = await prisma.shift.findMany({
    where: {
      userId,
      date: { gte: dayStart, lt: dayEnd },
      status: { not: 'CANCELLED' },
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    select: { startTime: true, endTime: true, location: { select: { name: true } } },
  })

  const conflict = siblings.find(
    (s) => s.startTime < endTime && s.endTime > startTime,
  )

  if (conflict) {
    return `Zeitkonflikt: ${conflict.startTime}–${conflict.endTime} Uhr (${conflict.location.name}) überschneidet sich mit der neuen Schicht.`
  }
  return null
}
