'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'

function sanitizeDays(days: number[] | undefined): number[] {
  if (!Array.isArray(days)) return []
  return [...new Set(days.map(Number).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6))].sort(
    (a, b) => a - b,
  )
}

export async function updateProfile(data: {
  email: string
  phone: string
  address: string
  unavailableDays?: number[]
  preferredDays?: number[]
  earliestStart?: string | null
  latestEnd?: string | null
}): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const email = data.email.trim()
  if (!email) return { error: 'E-Mail darf nicht leer sein' }

  const existing = await prisma.user.findFirst({
    where: { email, id: { not: session.userId } },
  })
  if (existing) return { error: 'Diese E-Mail wird bereits verwendet' }

  // Ein Tag kann nicht gleichzeitig Wunsch- und Ausschlusstag sein → Ausschluss gewinnt.
  const unavailableDays = sanitizeDays(data.unavailableDays)
  const preferredDays = sanitizeDays(data.preferredDays).filter((d) => !unavailableDays.includes(d))

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      email,
      phone: data.phone.trim() || null,
      address: data.address.trim() || null,
      unavailableDays,
      preferredDays,
      earliestStart: data.earliestStart || null,
      latestEnd: data.latestEnd || null,
    },
  })

  revalidatePath('/employee/profile')
  return {}
}
