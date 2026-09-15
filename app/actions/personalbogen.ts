'use server'

import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { requireAdmin } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { sendMail, isMailConfigured } from '@/lib/mail'
import { personalbogenFileBase } from '@/lib/personalbogen/export'
import { personalbogenPdf } from '@/lib/personalbogen/pdf'
import { COMPANY } from '@/lib/documents'

// Empfänger = Lohnbüro. Standard fest hinterlegt, per Env überschreibbar.
export const PAYROLL_EMAIL = process.env.PAYROLL_EMAIL || 'info@optilohn.de'

type Result = { ok: true; to: string; sentAt: string } | { error: string }

/**
 * Schickt den Personalbogen eines MA als Sofortmeldung (Neuanmeldung) an das
 * Lohnbüro – Excel-Anhang. Versand über das GMAIL_USER-Konto
 * (martin@asimple.world) → landet dort im "Gesendet"-Ordner und ist damit
 * nachvollziehbar. Merkt sich den Versandzeitpunkt (sofortmeldungSentAt).
 */
export async function sendPersonalbogenToPayroll(userId: string): Promise<Result> {
  await requireAdmin()

  if (!isMailConfigured()) {
    return { error: 'E-Mail-Versand ist nicht konfiguriert (GMAIL_USER / GMAIL_APP_PASSWORD fehlen).' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Mitarbeiter nicht gefunden.' }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name
  const eintritt = user.startDate ? format(user.startDate, 'dd.MM.yyyy') : '________'
  const pdf = await personalbogenPdf(user)
  const fileBase = personalbogenFileBase([user])

  const subject = `Neuanmeldung ${fullName}`
  const bodyLines = [
    'Sehr geehrte Damen und Herren,',
    '',
    `bitte melden Sie den Mitarbeiter ${fullName} zum ${eintritt} per Sofortmeldung an.`,
    '',
    'Mit freundlichen Grüßen',
    '',
    COMPANY.managingDirector,
    COMPANY.name,
  ]
  const text = bodyLines.join('\n')
  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">` +
    bodyLines.map((l) => (l === '' ? '<br>' : `<div>${l}</div>`)).join('') +
    `</div>`

  const sender = process.env.MAIL_FROM || process.env.GMAIL_USER!

  try {
    await sendMail({
      to: PAYROLL_EMAIL,
      subject,
      html,
      text,
      replyTo: sender,
      attachments: [
        {
          filename: `${fileBase}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    })
  } catch (err) {
    console.error('[personalbogen] Versand ans Lohnbüro fehlgeschlagen:', err)
    return { error: 'Versand fehlgeschlagen. Bitte später erneut versuchen.' }
  }

  const sentAt = new Date()
  await prisma.user.update({ where: { id: userId }, data: { sofortmeldungSentAt: sentAt } })
  revalidatePath(`/admin/employees/${userId}`)

  return { ok: true, to: PAYROLL_EMAIL, sentAt: sentAt.toISOString() }
}

/**
 * Kurze Abmeldungs-Mail ans Lohnbüro. Wird ausgelöst, wenn ein Admin beim
 * Speichern der Stammdaten ein (neues/geändertes) Austrittsdatum bestätigt
 * ("ans Lohnbüro schicken?" – siehe EmployeeForm). Gibt einen Result zurück
 * (statt nur zu loggen), damit updateEmployee dem Admin sichtbar rückmelden
 * kann, ob die Mail wirklich raus ist.
 */
export async function sendExitNoticeToPayroll(name: string, exitDate: Date): Promise<Result> {
  await requireAdmin()

  if (!isMailConfigured()) {
    return { error: 'E-Mail-Versand ist nicht konfiguriert (GMAIL_USER / GMAIL_APP_PASSWORD fehlen).' }
  }

  const austritt = format(exitDate, 'dd.MM.yyyy')
  const subject = `Abmeldung ${name}`
  const bodyLines = [
    'Sehr geehrte Damen und Herren,',
    '',
    `bitte melden Sie den Mitarbeiter ${name} zum ${austritt} ab.`,
    '',
    'Mit freundlichen Grüßen',
    '',
    COMPANY.managingDirector,
    COMPANY.name,
  ]
  const text = bodyLines.join('\n')
  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">` +
    bodyLines.map((l) => (l === '' ? '<br>' : `<div>${l}</div>`)).join('') +
    `</div>`
  const sender = process.env.MAIL_FROM || process.env.GMAIL_USER!

  try {
    await sendMail({ to: PAYROLL_EMAIL, subject, html, text, replyTo: sender })
  } catch (err) {
    console.error('[exit-notice] Abmeldung ans Lohnbüro fehlgeschlagen:', err)
    return { error: 'Versand fehlgeschlagen. Bitte später erneut versuchen.' }
  }

  return { ok: true, to: PAYROLL_EMAIL, sentAt: new Date().toISOString() }
}
