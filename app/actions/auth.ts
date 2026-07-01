'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { encrypt, decrypt, isAdmin, isSuperAdmin, type SessionPayload } from '@/lib/session'

// Setzt das Session-Cookie (7 Tage). Wird beim Login und nach Abschluss des
// Personalbogens (zum Aktualisieren von onboardingDone) verwendet.
export async function setSessionCookie(payload: SessionPayload) {
  const token = await encrypt(payload)
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sameSite: 'lax',
    path: '/',
  })
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'E-Mail und Passwort erforderlich.' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'E-Mail oder Passwort falsch.' }

  if (!user.passwordHash || user.status === 'PENDING') {
    return { error: 'Dein Konto ist noch nicht aktiviert. Bitte nutze den Einladungslink.' }
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return { error: 'E-Mail oder Passwort falsch.' }

  // Nur EMPLOYEEs ohne abgeschlossenen Personalbogen werden auf /willkommen geleitet.
  const onboardingDone = user.role !== 'EMPLOYEE' || user.onboardingCompletedAt != null
  await setSessionCookie({ userId: user.id, role: user.role, name: user.name, onboardingDone })

  // Hinweis: Die Onboarding-Mail-Serie wird NICHT beim Login gestartet. Sie beginnt
  // ausschließlich, wenn ein neuer MA sein Passwort über den Einladungslink setzt
  // (completeOnboarding → startDripForUser). Andernfalls würden auch langjährige
  // Bestands-MA, die sich erstmals nach dem Feature-Launch einloggen, die Serie erhalten.

  if (!onboardingDone) redirect('/willkommen')
  redirect(isAdmin(user.role) ? '/admin/schedule' : '/employee/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return decrypt(token)
}

export async function requireAdmin(): Promise<void> {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) throw new Error('Unauthorized')
}

// Strenger Gate für den vertraulichen Team-Intelligence-Bereich: nur SUPER_ADMIN.
// Gibt die Session zurück, damit Aufrufer userId/name weiterverwenden können.
export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session || !isSuperAdmin(session.role)) throw new Error('Unauthorized')
  return session
}
