'use server'

import { revalidatePath } from 'next/cache'
import { addDays, format, startOfWeek } from 'date-fns'
import { prisma } from '@/lib/db'
import { getSession } from '@/app/actions/auth'
import { isAdmin } from '@/lib/session'

export async function saveWeekAsTemplate(weekStart: string, name: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const start = new Date(weekStart)
  const end = addDays(start, 7)

  const shifts = await prisma.shift.findMany({
    where: { date: { gte: start, lt: end } },
  })

  if (shifts.length === 0) throw new Error('Keine Schichten in dieser Woche')

  await prisma.shiftTemplate.create({
    data: {
      name,
      entries: {
        create: shifts.map((s) => ({
          locationId: s.locationId,
          dayOfWeek: ((s.date.getDay() + 6) % 7),
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      },
    },
  })

  revalidatePath('/admin/schedule')
  revalidatePath('/admin/templates')
}

export async function applyTemplate(templateId: string, weekStart: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const template = await prisma.shiftTemplate.findUnique({
    where: { id: templateId },
    include: { entries: true },
  })
  if (!template) throw new Error('Vorlage nicht gefunden')

  const start = new Date(weekStart + 'T00:00:00.000Z')

  await prisma.shift.createMany({
    data: template.entries.map((e) => ({
      userId: e.userId ?? null,
      locationId: e.locationId,
      date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + e.dayOfWeek)),
      startTime: e.startTime,
      endTime: e.endTime,
      status: 'PLANNED' as const,
    })),
  })

  revalidatePath('/admin/schedule')
}

export async function updateTemplateFromWeek(templateId: string, weekStart: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  const start = new Date(weekStart)
  const end = addDays(start, 7)

  const shifts = await prisma.shift.findMany({
    where: { date: { gte: start, lt: end } },
  })

  if (shifts.length === 0) throw new Error('Keine Schichten in dieser Woche')

  // Replace all entries atomically
  await prisma.$transaction([
    prisma.shiftTemplateEntry.deleteMany({ where: { templateId } }),
    prisma.shiftTemplateEntry.createMany({
      data: shifts.map((s) => ({
        templateId,
        locationId: s.locationId,
        dayOfWeek: (s.date.getDay() + 6) % 7,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    }),
  ])

  revalidatePath('/admin/schedule')
  revalidatePath('/admin/templates')
}

export async function deleteTemplate(id: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  await prisma.shiftTemplate.delete({ where: { id } })
  revalidatePath('/admin/templates')
  revalidatePath('/admin/schedule')
}

export async function setDefaultTemplate(id: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  await prisma.$transaction([
    prisma.shiftTemplate.updateMany({ data: { isDefault: false } }),
    prisma.shiftTemplate.update({ where: { id }, data: { isDefault: true } }),
  ])

  revalidatePath('/admin/schedule')
  revalidatePath('/admin/templates')
}

export async function clearDefaultTemplate() {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  await prisma.shiftTemplate.updateMany({ data: { isDefault: false } })

  revalidatePath('/admin/schedule')
  revalidatePath('/admin/templates')
}

export async function getTemplates() {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')

  return prisma.shiftTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  })
}
