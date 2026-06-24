import 'server-only'
import { sendMail, isMailConfigured } from '@/lib/mail'
import { getBaseUrl } from '@/lib/baseUrl'
import { COMPANY_NAME } from '@/lib/company'

export function buildResetLink(resetToken: string): string {
  return `${getBaseUrl()}/passwort-zuruecksetzen/${resetToken}`
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

// Verschickt die "Passwort vergessen"-E-Mail mit einem zeitlich begrenzten Reset-Link.
// Gibt true zurück, wenn die Mail rausging; bei fehlender Konfiguration false (kein Wurf);
// bei einem echten SMTP-Fehler wird die Exception geworfen.
export async function sendResetEmail(args: {
  to: string
  name: string
  resetToken: string
}): Promise<boolean> {
  if (!isMailConfigured()) return false

  const link = buildResetLink(args.resetToken)
  const greeting = `Hallo ${firstNameOf(args.name)},`
  const subject = `Passwort zurücksetzen – ${COMPANY_NAME}`

  const text = [
    greeting,
    '',
    `für deinen ${COMPANY_NAME}-Dienstplanzugang wurde das Zurücksetzen des Passworts angefordert.`,
    'Über den folgenden Link kannst du ein neues Passwort vergeben:',
    '',
    link,
    '',
    'Der Link ist 1 Stunde gültig. Falls du das nicht warst, kannst du diese E-Mail ignorieren – dein Passwort bleibt unverändert.',
    '',
    'Viele Grüße',
    COMPANY_NAME,
  ].join('\n')

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">
    <p style="font-size:15px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.5;">
      für deinen <strong>${COMPANY_NAME}</strong>-Dienstplanzugang wurde das Zurücksetzen des Passworts angefordert.
      Klicke auf den Button, um ein neues Passwort zu vergeben.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${link}"
         style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:10px;display:inline-block;">
        Neues Passwort vergeben
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280;line-height:1.5;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br />
      <a href="${link}" style="color:#4f46e5;word-break:break-all;">${link}</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">
      Der Link ist 1 Stunde gültig. Falls du das nicht warst, kannst du diese E-Mail ignorieren –
      dein Passwort bleibt unverändert.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="font-size:12px;color:#9ca3af;">${COMPANY_NAME}</p>
  </div>`

  await sendMail({ to: args.to, subject, html, text })
  return true
}
