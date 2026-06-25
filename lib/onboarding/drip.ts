import 'server-only'
import { prisma } from '@/lib/db'
import { sendMail, isMailConfigured } from '@/lib/mail'
import { getBaseUrl } from '@/lib/baseUrl'
import { berlinDay } from '@/lib/dayHours'
import { renderOnboardingEmail, type RenderableStep } from '@/lib/onboarding/render'

type StepRow = {
  id: string
  order: number
  delayDays: number
  subject: string
  body: string
  ctaLabel: string | null
  ctaUrl: string | null
}

type UserRow = {
  id: string
  name: string
  firstName: string | null
  email: string
}

/** Anzahl voller Berliner Kalendertage zwischen Start und jetzt (heute = 0). */
export function elapsedBerlinDays(start: Date, now: Date): number {
  const a = Date.parse(`${berlinDay(start)}T00:00:00Z`)
  const b = Date.parse(`${berlinDay(now)}T00:00:00Z`)
  return Math.floor((b - a) / 86_400_000)
}

function firstNameOf(u: UserRow): string {
  return (u.firstName || u.name).trim().split(/\s+/)[0] || u.name
}

/**
 * Wählt die nächste fällige, noch nicht versendete Stufe für einen MA.
 * Sortierung: delayDays, dann order. Fällig = delayDays <= elapsed.
 */
export function pickNextStep(
  steps: StepRow[],
  deliveredStepIds: Set<string>,
  elapsedDays: number,
): StepRow | null {
  const candidates = steps
    .filter((s) => !deliveredStepIds.has(s.id))
    .filter((s) => s.delayDays <= elapsedDays)
    .sort((a, b) => a.delayDays - b.delayDays || a.order - b.order)
  return candidates[0] ?? null
}

// Verschickt eine Stufe an einen MA und protokolliert den Versand (idempotent
// über @@unique([userId, stepId])). Bei Erfolg wird der Delivery-Eintrag angelegt;
// schlägt der Versand fehl, wird NICHTS angelegt → nächster Lauf versucht es erneut.
async function sendStepToUser(user: UserRow, step: StepRow): Promise<boolean> {
  const rendered = renderOnboardingEmail(step as RenderableStep, {
    firstName: firstNameOf(user),
    fullName: user.name,
    baseUrl: getBaseUrl(),
  })

  await sendMail({ to: user.email, subject: rendered.subject, html: rendered.html, text: rendered.text })

  await prisma.onboardingDelivery.create({
    data: { userId: user.id, stepId: step.id, status: 'SENT' },
  })
  return true
}

const ACTIVE_STEP_SELECT = {
  id: true,
  order: true,
  delayDays: true,
  subject: true,
  body: true,
  ctaLabel: true,
  ctaUrl: true,
} as const

const USER_SELECT = { id: true, name: true, firstName: true, email: true } as const

export type DripResult = { eligible: number; sent: number; failed: number; skipped: boolean }

/**
 * Versendet pro fälligem MA die jeweils nächste Onboarding-Stufe (eine pro Lauf
 * = eine pro Tag). Wird täglich vom Cron getroffen.
 */
export async function runDrip(): Promise<DripResult> {
  if (!isMailConfigured()) return { eligible: 0, sent: 0, failed: 0, skipped: true }

  const steps = await prisma.onboardingStep.findMany({
    where: { active: true },
    select: ACTIVE_STEP_SELECT,
  })
  if (steps.length === 0) return { eligible: 0, sent: 0, failed: 0, skipped: false }

  const users = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      onboardingDripStartedAt: { not: null },
    },
    select: { ...USER_SELECT, onboardingDripStartedAt: true },
  })

  const now = new Date()
  let sent = 0
  let failed = 0

  for (const u of users) {
    if (!u.email || !u.onboardingDripStartedAt) continue
    const elapsed = elapsedBerlinDays(u.onboardingDripStartedAt, now)

    const delivered = await prisma.onboardingDelivery.findMany({
      where: { userId: u.id },
      select: { stepId: true },
    })
    const deliveredIds = new Set(delivered.map((d) => d.stepId))

    const next = pickNextStep(steps, deliveredIds, elapsed)
    if (!next) continue

    try {
      await sendStepToUser(u, next)
      sent++
    } catch (err) {
      failed++
      console.error(`[onboarding-drip] Versand an ${u.email} (Stufe ${next.id}) fehlgeschlagen:`, err)
    }
  }

  return { eligible: users.length, sent, failed, skipped: false }
}

/**
 * Startet die Sequenz für einen MA (beim ersten Login / Passwort-Setzen):
 * setzt den Startzeitpunkt, falls noch nicht gesetzt, und verschickt die
 * sofort fällige Tag-0-Willkommensstufe direkt. Wirft nie – Fehler werden
 * geloggt, damit der umgebende Vorgang (Onboarding) nicht abbricht.
 */
export async function startDripForUser(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...USER_SELECT, role: true, onboardingDripStartedAt: true },
    })
    if (!user || user.role !== 'EMPLOYEE' || !user.email) return

    if (!user.onboardingDripStartedAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { onboardingDripStartedAt: new Date() },
      })
    }

    if (!isMailConfigured()) return

    const steps = await prisma.onboardingStep.findMany({
      where: { active: true },
      select: ACTIVE_STEP_SELECT,
    })
    const delivered = await prisma.onboardingDelivery.findMany({
      where: { userId },
      select: { stepId: true },
    })
    const deliveredIds = new Set(delivered.map((d) => d.stepId))

    // Sofort fällig = delayDays <= 0 (Tag-0-Willkommensmail).
    const welcome = pickNextStep(steps, deliveredIds, 0)
    if (welcome && welcome.delayDays <= 0) {
      await sendStepToUser(user, welcome)
    }
  } catch (err) {
    console.error('[onboarding-drip] startDripForUser fehlgeschlagen:', err)
  }
}
