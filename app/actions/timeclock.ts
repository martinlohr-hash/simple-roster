'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'

export async function checkin(locationId: string, shiftId?: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const existing = await prisma.timeEntry.findFirst({
    where: { userId: session.userId, checkoutAt: null },
  })
  if (existing) throw new Error('Bereits eingestempelt')

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      locationId,
      checkinAt: new Date(),
      shiftId: shiftId || null,
    },
  })

  if (shiftId) {
    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'ACTIVE' },
    })
  }

  revalidatePath('/employee/dashboard')
  return entry
}

export async function checkout() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const entry = await prisma.timeEntry.findFirst({
    where: { userId: session.userId, checkoutAt: null },
    include: { shift: true },
  })
  if (!entry) throw new Error('Nicht eingestempelt')

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
}
