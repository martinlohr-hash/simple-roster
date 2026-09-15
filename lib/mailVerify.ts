import 'server-only'
import { ImapFlow } from 'imapflow'

/**
 * Prüft per IMAP, ob eine per SMTP verschickte Mail (Message-ID) tatsächlich
 * im "Gesendet"-Ordner des GMAIL_USER-Kontos gelandet ist – der zweite Haken
 * ("wirklich raus", nicht nur "SMTP hat sie angenommen"). Gmail legt per
 * SMTP verschickte Mails normalerweise sofort im Sent-Ordner ab, ein
 * kurzer Retry federt seltene Indexierungsverzögerungen ab.
 *
 * Best effort: jeder Fehler (IMAP nicht erreichbar, kein Zugriff, Timeout)
 * liefert `false` statt zu werfen – der erste Haken (SMTP-Versand ok) bleibt
 * davon unberührt, das ist nur eine zusätzliche Bestätigung.
 */
export async function verifySentInGmail(
  messageId: string,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<boolean> {
  const { retries = 3, delayMs = 1500 } = opts
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
  if (!user || !pass) return false

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  })

  try {
    await client.connect()

    // Special-Use-Ordner "Gesendet" ermitteln statt den Namen zu raten
    // (der lokalisierte Name variiert je nach Kontosprache).
    const mailboxes = await client.list()
    const sent = mailboxes.find((m) => m.specialUse === '\\Sent')
    const path = sent?.path ?? '[Gmail]/Sent Mail'

    for (let attempt = 0; attempt < retries; attempt++) {
      const lock = await client.getMailboxLock(path)
      try {
        const uids = await client.search({ header: { 'message-id': messageId } }, { uid: true })
        if (uids && uids.length > 0) return true
      } finally {
        lock.release()
      }
      if (attempt < retries - 1) await new Promise((r) => setTimeout(r, delayMs))
    }
    return false
  } catch (err) {
    console.error('[mailVerify] IMAP-Prüfung im Postausgang fehlgeschlagen:', err)
    return false
  } finally {
    try {
      await client.logout()
    } catch {
      // Verbindung ist ohnehin am Ende, egal ob logout sauber klappt.
    }
  }
}
