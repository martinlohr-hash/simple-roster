'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'

// Fachliche Fehler als Rückgabewert statt throw: geworfene Errors werden von
// Next.js in Production maskiert und kämen beim Nutzer nie an.
export type TimeclockResult = { error?: string }

export async function checkin(locationId: string, shiftId?: string): Promise<TimeclockResult> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  // Schicht darf nur dem eingeloggten Mitarbeiter gehören – sonst könnte man
  // fremde Schichten aktivieren bzw. seinen Stempel daran hängen.
  if (shiftId) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, select: { userId: true } })
    if (!shift || shift.userId !== session.userId) {
      return { error: 'Diese Schicht gehört nicht zu deinem Account' }
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.timeEntry.findFirst({
      where: { userId: session.userId, checkoutAt: null },
      select: { id: true },
    })
    if (existing) return null
    return tx.timeEntry.create({
      data: {
        userId: session.userId,
        locationId,
        checkinAt: new Date(),
        shiftId: shiftId || null,
      },
    })
  })
  if (!created) return { error: 'Du bist bereits eingestempelt' }

  if (shiftId) {
    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'ACTIVE' },
    })
  }

  revalidatePath('/employee/dashboard')
  return {}
}

export async function checkout(): Promise<TimeclockResult> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const entry = await prisma.timeEntry.findFirst({
    where: { userId: session.userId, checkoutAt: null },
    include: { shift: true },
  })
  if (!entry) return { error: 'Du bist nicht eingestempelt' }

  await prisma.timeEntry.update({
    where: { id: entry.id },
    data: { checkoutAt: new Date() },
  })

  if (entry.shiftId) {
    await prisma.shift.update({
      where: { id: entry.shiftId },
      data: { status: 'DONE' },
    })
  }

  revalidatePath('/employee/dashboard')
  revalidatePath('/employee/hours')
  return {}
}
