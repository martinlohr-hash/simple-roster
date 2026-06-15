'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/app/actions/auth'

export async function createLocation(data: { name: string; color: string }) {
  await requireAdmin()
  await prisma.location.create({ data })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}

export async function updateLocation(id: string, data: { name?: string; color?: string }) {
  await requireAdmin()
  await prisma.location.update({ where: { id }, data })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}

export async function deleteLocation(id: string) {
  await requireAdmin()
  const shiftCount = await prisma.shift.count({ where: { locationId: id } })
  if (shiftCount > 0) throw new Error(`Standort hat noch ${shiftCount} Schichten und kann nicht gelöscht werden.`)
  await prisma.location.delete({ where: { id } })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}
