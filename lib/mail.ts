import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'

// Gmail-/Google-Workspace-Versand über SMTP mit App-Passwort.
// Benötigt in der Umgebung (Vercel + lokal in .env):
//   GMAIL_USER          = z.B. martin@asimple.world
//   GMAIL_APP_PASSWORD  = 16-stelliges App-Passwort (ohne Leerzeichen)
//   MAIL_FROM           = optional, Anzeige-Absender, Fallback: GMAIL_USER

let cached: Transporter | null = null

export function isMailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

function getTransport(): Transporter {
  if (cached) return cached
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
  if (!user || !pass) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD nicht gesetzt')
  }
  cached = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })
  return cached
}

export type MailAttachment = {
  filename: string
  content: Buffer
  contentType?: string
}

export type SendMailArgs = {
  to: string
  subject: string
  html: string
  text: string
  cc?: string
  bcc?: string
  replyTo?: string
  attachments?: MailAttachment[]
}

export type SendMailResult = { messageId: string }

// Verschickt eine E-Mail. Wirft bei Konfigurations-/SMTP-Fehlern — Aufrufer entscheidet,
// ob das den umgebenden Vorgang (z.B. MA-Anlage) abbrechen soll oder nicht.
// Hinweis: Gmail-SMTP legt gesendete Nachrichten automatisch im "Gesendet"-Ordner
// des GMAIL_USER-Kontos ab — dadurch ist der Versand dort nachvollziehbar.
// Gibt die Message-ID zurück, damit Aufrufer den Versand optional per IMAP im
// Postausgang verifizieren können (siehe lib/mailVerify.ts).
export async function sendMail({
  to, subject, html, text, cc, bcc, replyTo, attachments,
}: SendMailArgs): Promise<SendMailResult> {
  const from = process.env.MAIL_FROM || process.env.GMAIL_USER!
  const info = await getTransport().sendMail({ from, to, subject, html, text, cc, bcc, replyTo, attachments })
  return { messageId: info.messageId }
}
