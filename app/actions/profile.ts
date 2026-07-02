'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession, setSessionCookie } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { parseGermanAddress } from '@/lib/documents'

type Gender = 'MALE' | 'FEMALE' | 'DIVERSE'

function parseGender(v: string | null | undefined): Gender | null {
  return v === 'MALE' || v === 'FEMALE' || v === 'DIVERSE' ? v : null
}

// Schließt den Personalbogen (oberer Teil – „Angaben zum Mitarbeiter“) beim ersten
// Login ab, markiert den MA als fertig und aktualisiert das Session-Cookie, damit
// das /willkommen-Gate nicht mehr greift.
export async function completeMyProfile(data: {
  firstName: string
  lastName: string
  street: string
  postalCode: string
  city: string
  nationality: string
  birthday: string | null
  birthName: string
  birthPlace: string
  gender: string
  taxId: string
  socialSecurityNo: string
  iban: string
  healthInsurance: string
  phone: string
}): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const firstName = data.firstName.trim()
  const lastName = data.lastName.trim()
  if (!firstName || !lastName) return { error: 'Vor- und Nachname sind erforderlich.' }

  const taxId = data.taxId.replace(/\s/g, '')
  if (taxId && !/^\d{11}$/.test(taxId)) {
    return { error: 'Die Steuer-Identifikationsnummer muss 11-stellig sein.' }
  }
  const socialSecurityNo = data.socialSecurityNo.replace(/\s/g, '')
  if (socialSecurityNo && socialSecurityNo.length !== 12) {
    return { error: 'Die Sozialversicherungs-Nummer muss 12-stellig sein.' }
  }

  const fullName = `${firstName} ${lastName}`.trim()
  const address = [data.street.trim(), `${data.postalCode.trim()} ${data.city.trim()}`.trim()]
    .filter(Boolean)
    .join(', ')

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      firstName,
      lastName,
      name: fullName,
      street: data.street.trim() || null,
      postalCode: data.postalCode.trim() || null,
      city: data.city.trim() || null,
      address: address || null,
      nationality: data.nationality.trim() || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      birthName: data.birthName.trim() || null,
      birthPlace: data.birthPlace.trim() || null,
      gender: parseGender(data.gender),
      taxId: taxId || null,
      socialSecurityNo: socialSecurityNo || null,
      iban: data.iban.replace(/\s/g, '') || null,
      healthInsurance: data.healthInsurance.trim() || null,
      phone: data.phone.trim() || null,
      onboardingCompletedAt: new Date(),
    },
  })

  // Cookie auffrischen, damit das Gate (onboardingDone) sofort entfällt.
  await setSessionCookie({
    userId: session.userId,
    role: session.role,
    name: fullName,
    onboardingDone: true,
  })

  redirect('/employee/dashboard')
}

// Speichert die nachgereichten Abrechnungs-Daten (Steuer-ID, SV-Nr., IBAN), die
// beim Onboarding übersprungen werden dürfen. Nur befüllte Felder werden gesetzt;
// scoped auf den eigenen Account. Wird vom Nag-Screen aufgerufen.
export async function saveDeferredData(data: {
  taxId?: string
  socialSecurityNo?: string
  iban?: string
}): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const update: { taxId?: string; socialSecurityNo?: string; iban?: string } = {}

  if (data.taxId != null && data.taxId.trim() !== '') {
    const taxId = data.taxId.replace(/\s/g, '')
    if (!/^\d{11}$/.test(taxId)) {
      return { error: 'Die Steuer-Identifikationsnummer muss 11-stellig sein.' }
    }
    update.taxId = taxId
  }

  if (data.socialSecurityNo != null && data.socialSecurityNo.trim() !== '') {
    const ssn = data.socialSecurityNo.replace(/\s/g, '')
    if (ssn.length !== 12) {
      return { error: 'Die Sozialversicherungs-Nummer muss 12-stellig sein.' }
    }
    update.socialSecurityNo = ssn
  }

  if (data.iban != null && data.iban.trim() !== '') {
    update.iban = data.iban.replace(/\s/g, '')
  }

  if (Object.keys(update).length === 0) return {}

  await prisma.user.update({ where: { id: session.userId }, data: update })
  revalidatePath('/employee', 'layout')
  return {}
}

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

  // Adresse strukturiert ableiten, damit Stammdaten/Personalbogen/Dokumente konsistent bleiben.
  const addressRaw = data.address.trim() || null
  const parsedAddr = parseGermanAddress(addressRaw)

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      email,
      phone: data.phone.trim() || null,
      address: addressRaw,
      ...(parsedAddr ? { street: parsedAddr.street, postalCode: parsedAddr.postalCode, city: parsedAddr.city } : {}),
      unavailableDays,
      preferredDays,
      earliestStart: data.earliestStart || null,
      latestEnd: data.latestEnd || null,
    },
  })

  revalidatePath('/employee/profile')
  return {}
}

// Erstellt (oder rotiert) den geheimen Token für den persönlichen Kalender-Feed.
// Rotieren macht alte Feed-URLs ungültig – z. B. wenn ein Link versehentlich
// weitergegeben wurde.
export async function rotateIcalToken(): Promise<{ token?: string; error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet' }

  const { randomBytes } = await import('crypto')
  const token = randomBytes(24).toString('base64url')

  await prisma.user.update({
    where: { id: session.userId },
    data: { icalToken: token },
  })

  revalidatePath('/employee/profile')
  return { token }
}
