'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession, requireAdmin } from '@/app/actions/auth'
import { sendMail, isMailConfigured } from '@/lib/mail'
import { getBaseUrl } from '@/lib/baseUrl'
import { renderOnboardingEmail } from '@/lib/onboarding/render'

const PATH = '/admin/onboarding'

function parseIntField(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseInt(String(v ?? '').trim(), 10)
  return Number.isFinite(n) ? n : fallback
}

function clean(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim()
}

export async function createStep(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin()

  const subject = clean(formData.get('subject'))
  const body = clean(formData.get('body'))
  if (!subject) return { error: 'Bitte einen Betreff angeben.' }
  if (!body) return { error: 'Bitte einen Mail-Text angeben.' }

  await prisma.onboardingStep.create({
    data: {
      subject,
      body,
      delayDays: Math.max(0, parseIntField(formData.get('delayDays'))),
      order: parseIntField(formData.get('order')),
      ctaLabel: clean(formData.get('ctaLabel')) || null,
      ctaUrl: clean(formData.get('ctaUrl')) || null,
      active: formData.get('active') === 'on' || formData.get('active') === 'true',
    },
  })

  revalidatePath(PATH)
  return {}
}

export async function updateStep(id: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin()

  const subject = clean(formData.get('subject'))
  const body = clean(formData.get('body'))
  if (!subject) return { error: 'Bitte einen Betreff angeben.' }
  if (!body) return { error: 'Bitte einen Mail-Text angeben.' }

  await prisma.onboardingStep.update({
    where: { id },
    data: {
      subject,
      body,
      delayDays: Math.max(0, parseIntField(formData.get('delayDays'))),
      order: parseIntField(formData.get('order')),
      ctaLabel: clean(formData.get('ctaLabel')) || null,
      ctaUrl: clean(formData.get('ctaUrl')) || null,
      active: formData.get('active') === 'on' || formData.get('active') === 'true',
    },
  })

  revalidatePath(PATH)
  return {}
}

export async function toggleStep(id: string, active: boolean): Promise<void> {
  await requireAdmin()
  await prisma.onboardingStep.update({ where: { id }, data: { active } })
  revalidatePath(PATH)
}

export async function deleteStep(id: string): Promise<void> {
  await requireAdmin()
  await prisma.onboardingStep.delete({ where: { id } })
  revalidatePath(PATH)
}

// Schickt eine Vorschau-Mail der Stufe an die eigene Admin-Adresse.
export async function sendTestStep(id: string): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const session = await getSession()
  if (!session) return { error: 'Nicht angemeldet.' }
  if (!isMailConfigured()) return { error: 'Mailversand ist nicht konfiguriert (GMAIL_USER/GMAIL_APP_PASSWORD fehlen).' }

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true, firstName: true },
  })
  if (!me?.email) return { error: 'Für deinen Account ist keine E-Mail hinterlegt.' }

  const step = await prisma.onboardingStep.findUnique({ where: { id } })
  if (!step) return { error: 'Stufe nicht gefunden.' }

  const rendered = renderOnboardingEmail(step, {
    firstName: (me.firstName || me.name).split(' ')[0] || me.name,
    fullName: me.name,
    baseUrl: getBaseUrl(),
  })

  try {
    await sendMail({
      to: me.email,
      subject: `[Test] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    })
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Versand fehlgeschlagen.' }
  }
}
