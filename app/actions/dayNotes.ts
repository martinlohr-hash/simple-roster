'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/app/actions/auth'

export async function upsertDayNote(date: string, content: string) {
  await requireAdmin()

  if (!content.trim()) {
    await prisma.dayNote.deleteMany({ where: { date } })
  } else {
    await prisma.dayNote.upsert({
      where: { date },
      create: { date, content: content.trim() },
      update: { content: content.trim() },
    })
  }
  revalidatePath('/admin/schedule')
}
