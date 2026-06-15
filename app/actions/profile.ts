'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/app/actions/auth'
import { prisma } from '@/lib/db'

export async function updateProfile(data: {
  email: string
  phone: string
  address: string
}): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const email = data.email.trim()
  if (!email) return { error: 'E-Mail darf nicht leer sein' }

  const existing = await prisma.user.findFirst({
    where: { email, id: { not: session.userId } },
  })
  if (existing) return { error: 'Diese E-Mail wird bereits verwendet' }

  await prisma.user.update({
    where: { id: session.userId },
    data: { email, phone: data.phone.trim() || null, address: data.address.trim() || null },
  })

  revalidatePath('/employee/profile')
  return {}
}
