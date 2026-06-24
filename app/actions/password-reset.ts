'use server'

import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sendResetEmail } from '@/lib/email/reset'

// Schritt 1: Reset anfordern. Verschickt einen zeitlich begrenzten Link per Mail.
// Gibt aus Datenschutzgründen IMMER dieselbe Erfolgsmeldung zurück (kein Verraten,
// ob die E-Mail existiert / ein Konto aktiv ist). Fehler beim Mailversand werden
// geschluckt, damit auch sie keine Rückschlüsse zulassen.
export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true }> {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } })

    // Nur aktive Konten mit gesetztem Passwort können zurückgesetzt werden.
    // Noch nicht aktivierte (PENDING) MA nutzen weiterhin den Einladungslink.
    if (user && user.passwordHash && user.status === 'ACTIVE') {
      const resetToken = randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      })

      try {
        await sendResetEmail({ to: user.email, name: user.name, resetToken })
      } catch {
        // Mailfehler nicht nach außen geben (kein User-Enumeration / kein Abbruch).
      }
    }
  }

  return { ok: true }
}

// Schritt 2: Neues Passwort über den Link setzen.
export async function completePasswordReset(
  token: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 8) {
    return { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Die Passwörter stimmen nicht überein.' }
  }

  const user = await prisma.user.findUnique({ where: { resetToken: token } })

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return { error: 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.' }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: 'ACTIVE',
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  redirect('/login?reset=ok')
}
