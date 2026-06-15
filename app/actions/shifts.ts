'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'

export async function createShift(data: {
  userId: string | null
  locationId: string
  date: string
  startTime: string
  endTime: string
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized')

  if (data.userId) {
    await checkOverlap({ userId: data.userId, date: data.date, startTime: data.startTime, endTime: data.endTime })
  }

  await prisma.shift.create({
    data: {
      userId: data.userId ?? null,
      locationId: data.locationId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
    },
  })
  revalidatePath('/admin/schedule')
}

export async function updateShift(id: string, data: { userId?: string | null; date?: string; startTime?: string; endTime?: string; locationId?: string }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized')

  const existing = await prisma.shift.findUniqueOrThrow({ where: { id } })
  const effectiveUserId = data.userId !== undefined ? data.userId : existing.userId
  const effectiveDate = data.date
    ? new Date(data.date).toISOString().slice(0, 10)
    : existing.date.toISOString().slice(0, 10)
  const effectiveStart = data.startTime ?? existing.startTime
  const effectiveEnd = data.endTime ?? existing.endTime

  if (effectiveUserId) {
    await checkOverlap({
      userId: effectiveUserId,
      date: effectiveDate,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      excludeId: id,
    })
  }

  await prisma.shift.update({
    where: { id },
    data: {
      ...(data.userId !== undefined && { userId: data.userId }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
      ...(data.locationId && { locationId: data.locationId }),
    },
  })
  revalidatePath('/admin/schedule')
}

export async function duplicateShift(id: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized')

  const original = await prisma.shift.findUnique({ where: { id } })
  if (!original) throw new Error('Schicht nicht gefunden')

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
}

export async function deleteShift(id: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized')

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
}

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
}) {
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
    throw new Error(
      `Zeitkonflikt: ${conflict.startTime}–${conflict.endTime} Uhr (${conflict.location.name}) überschneidet sich mit der neuen Schicht.`,
    )
  }
}

export async function getWeekShifts(weekStart: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return prisma.shift.findMany({
    where: { date: { gte: start, lt: end } },
    include: { user: true, location: true, timeEntry: true },
    orderBy: { startTime: 'asc' },
  })
}
