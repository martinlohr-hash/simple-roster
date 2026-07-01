'use server'

import { requireAdmin } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { sendMail, isMailConfigured } from '@/lib/mail'
import { personalbogenExcel, personalbogenFileBase } from '@/lib/personalbogen/export'
import { COMPANY_BRAND } from '@/lib/company'

// Empfänger = Lohnbüro. Standard fest hinterlegt, per Env überschreibbar.
const PAYROLL_EMAIL = process.env.PAYROLL_EMAIL || 'info@optilon.de'

type Result = { ok: true; to: string } | { error: string }

/**
 * Schickt den Personalbogen eines MA als Excel-Anhang an das Lohnbüro.
 * Versand über das GMAIL_USER-Konto (martin@asimple.world) → landet dort im
 * "Gesendet"-Ordner und ist damit nachvollziehbar.
 */
export async function sendPersonalbogenToPayroll(userId: string): Promise<Result> {
  await requireAdmin()

  if (!isMailConfigured()) {
    return { error: 'E-Mail-Versand ist nicht konfiguriert (GMAIL_USER / GMAIL_APP_PASSWORD fehlen).' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Mitarbeiter nicht gefunden.' }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name
  const excel = await personalbogenExcel([user])
  const fileBase = personalbogenFileBase([user])

  const subject = `Personalbogen – ${fullName}`
  const bodyLines = [
    'Guten Tag,',
    '',
    `anbei der Personalbogen für ${fullName} zur Anlage in der Lohnabrechnung.`,
    '',
    'Bei Rückfragen gerne einfach auf diese Mail antworten.',
    '',
    'Viele Grüße',
    COMPANY_BRAND,
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
          filename: `${fileBase}.xlsx`,
          content: excel,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    })
  } catch (err) {
    console.error('[personalbogen] Versand ans Lohnbüro fehlgeschlagen:', err)
    return { error: 'Versand fehlgeschlagen. Bitte später erneut versuchen.' }
  }

  return { ok: true, to: PAYROLL_EMAIL }
}
