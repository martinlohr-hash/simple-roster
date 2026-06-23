import 'server-only'
import { sendMail, isMailConfigured } from '@/lib/mail'
import { getBaseUrl } from '@/lib/baseUrl'
import { COMPANY_NAME } from '@/lib/company'

export function buildInviteLink(inviteToken: string): string {
  return `${getBaseUrl()}/onboarding/${inviteToken}`
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

// Verschickt die Einladungs-E-Mail an einen neuen Mitarbeiter.
// Gibt true zurück, wenn die Mail rausging; bei fehlender Konfiguration false (kein Wurf);
// bei einem echten SMTP-Fehler wird die Exception geworfen.
export async function sendInviteEmail(args: {
  to: string
  name: string
  inviteToken: string
}): Promise<boolean> {
  if (!isMailConfigured()) return false

  const link = buildInviteLink(args.inviteToken)
  const greeting = `Hallo ${firstNameOf(args.name)},`
  const subject = `Einladung zu ${COMPANY_NAME} – Dienstplan-Zugang einrichten`

  const text = [
    greeting,
    '',
    `du wurdest bei ${COMPANY_NAME} zum digitalen Dienstplan eingeladen.`,
    'Bitte richte über den folgenden Link dein Passwort ein:',
    '',
    link,
    '',
    'Der Link ist 7 Tage gültig. Danach kann dir der Zugang erneut zugeschickt werden.',
    '',
    'Viele Grüße',
    COMPANY_NAME,
  ].join('\n')

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">
    <p style="font-size:15px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.5;">
      du wurdest bei <strong>${COMPANY_NAME}</strong> zum digitalen Dienstplan eingeladen.
      Klicke auf den Button, um dein Passwort einzurichten und loszulegen.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${link}"
         style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:10px;display:inline-block;">
        Zugang einrichten
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280;line-height:1.5;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br />
      <a href="${link}" style="color:#4f46e5;word-break:break-all;">${link}</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Der Link ist 7 Tage gültig.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="font-size:12px;color:#9ca3af;">${COMPANY_NAME}</p>
  </div>`

  await sendMail({ to: args.to, subject, html, text })
  return true
}
