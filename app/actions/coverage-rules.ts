'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/app/actions/auth'

export async function createCoverageRule(data: {
  dayOfWeek: number
  startTime: string
  endTime: string
  minStaff: number
  locationId: string | null
  label: string | null
}) {
  await requireAdmin()
  await prisma.coverageRule.create({ data })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}

export async function updateCoverageRule(
  id: string,
  data: {
    dayOfWeek?: number
    startTime?: string
    endTime?: string
    minStaff?: number
    locationId?: string | null
    label?: string | null
  },
) {
  await requireAdmin()
  await prisma.coverageRule.update({ where: { id }, data })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}

export async function duplicateCoverageRule(id: string) {
  await requireAdmin()
  const original = await prisma.coverageRule.findUniqueOrThrow({ where: { id } })
  await prisma.coverageRule.create({
    data: {
      dayOfWeek: original.dayOfWeek,
      startTime: original.startTime,
      endTime: original.endTime,
      minStaff: original.minStaff,
      locationId: original.locationId,
      label: original.label ? `${original.label} (Kopie)` : null,
    },
  })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}

export async function deleteCoverageRule(id: string) {
  await requireAdmin()
  await prisma.coverageRule.delete({ where: { id } })
  revalidatePath('/admin/settings')
  revalidatePath('/admin/schedule')
}
