'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/app/actions/auth'
import {
  MAX_NOTE_LENGTH,
  MAX_SUPERPOWERS,
  isPersonalityKey,
  type PersonalityValue,
} from '@/lib/insights'

const ALLOWED_TYPES: PersonalityValue[] = ['DRIVER', 'EXPRESSIVE', 'AMIABLE', 'ANALYTIC', 'UNKNOWN']

function parseType(raw: FormDataEntryValue | null): PersonalityValue {
  const v = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
  if (v === 'UNKNOWN') return 'UNKNOWN'
  return isPersonalityKey(v) ? v : 'UNKNOWN'
}

/**
 * Speichert die vertrauliche Einschätzung eines Mitarbeiters. NUR SUPER_ADMIN.
 * Upsert auf EmployeeInsight (1:1 zu User).
 */
export async function upsertInsight(
  userId: string,
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const session = await requireSuperAdmin()

  // Ziel-User muss existieren (verhindert Insights für Geister-IDs).
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!target) return { error: 'Mitarbeiter nicht gefunden.' }

  const personalityType = parseType(formData.get('personalityType'))

  const noteRaw = (formData.get('personalityNote') as string | null)?.trim() ?? ''
  const personalityNote = noteRaw ? noteRaw.slice(0, MAX_NOTE_LENGTH) : null

  const observationsRaw = (formData.get('observations') as string | null)?.trim() ?? ''
  const observations = observationsRaw || null

  // Mehrfachfelder: getAll, trimmen, leere raus, case-insensitive deduplizieren, kappen.
  const seen = new Set<string>()
  const superpowers: string[] = []
  for (const entry of formData.getAll('superpowers')) {
    const s = String(entry).trim()
    if (!s) continue
    const norm = s.toLowerCase()
    if (seen.has(norm)) continue
    seen.add(norm)
    superpowers.push(s)
    if (superpowers.length >= MAX_SUPERPOWERS) break
  }

  const now = new Date()

  await prisma.employeeInsight.upsert({
    where: { userId },
    create: {
      userId,
      personalityType,
      personalityNote,
      superpowers,
      observations,
      assessedAt: now,
      assessedById: session.userId,
    },
    update: {
      personalityType,
      personalityNote,
      superpowers,
      observations,
      assessedAt: now,
      assessedById: session.userId,
    },
  })

  revalidatePath(`/admin/employees/${userId}/insights`)
  revalidatePath('/admin/team-map')
  return { ok: true }
}
