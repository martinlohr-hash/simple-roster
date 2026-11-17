'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'

export type ClosedDayResult = {
  error?: string
  // Beim Schließen: Schichten, die an dem Tag noch geplant sind → Client fragt nach
  pendingShifts?: { name: string; time: string }[]
  // Schichten mit Stempel bleiben stehen (gearbeitete Zeit wird nie gelöscht)
  keptWorked?: number
}

/**
 * Tag schließen/öffnen. Beim Schließen werden vorhandene Schichten erst nach
 * Bestätigung (force) gelöscht – Schichten mit Stempel bleiben erhalten.
 */
export async function setDayClosed(date: string, closed: boolean, force = false): Promise<ClosedDayResult> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) return { error: 'Keine Berechtigung' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Ungültiges Datum' }

  if (!closed) {
    await prisma.closedDay.deleteMany({ where: { date } })
    revalidatePath('/admin/schedule')
    return {}
  }

  const dayStart = new Date(date + 'T00:00:00.000Z')
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
  const shifts = await prisma.shift.findMany({
    where: { date: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
    include: { user: { select: { name: true } }, timeEntry: { select: { id: true } } },
    orderBy: { startTime: 'asc' },
  })
  const removable = shifts.filter((s) => !s.timeEntry)
  const keptWorked = shifts.length - removable.length

  if (removable.length > 0 && !force) {
    return {
      pendingShifts: removable.map((s) => ({
        name: s.user?.name ?? 'Offene Schicht',
        time: `${s.startTime}–${s.endTime}`,
      })),
      keptWorked,
    }
  }

  await prisma.$transaction([
    prisma.shift.deleteMany({ where: { id: { in: removable.map((s) => s.id) } } }),
    prisma.closedDay.upsert({ where: { date }, create: { date }, update: {} }),
  ])
  revalidatePath('/admin/schedule')
  return { keptWorked }
}
