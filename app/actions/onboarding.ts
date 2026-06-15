'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function completeOnboarding(
  token: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const name = (formData.get('name') as string) || null

  if (!password || password.length < 8) {
    return { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Die Passwörter stimmen nicht überein.' }
  }

  const user = await prisma.user.findUnique({ where: { inviteToken: token } })

  if (!user || !user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return { error: 'Der Einladungslink ist ungültig oder abgelaufen.' }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: 'ACTIVE',
      inviteToken: null,
      inviteTokenExpiry: null,
      ...(name ? { name } : {}),
    },
  })

  redirect('/login')
}
