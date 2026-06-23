import 'dotenv/config'
import nodemailer from 'nodemailer'

// Eigenständiger SMTP-Test (importiert bewusst NICHT lib/mail.ts, da dort `server-only`
// den Import außerhalb von Next.js blockt). Spiegelt dieselbe Transport-Config.
// Aufruf:  npx tsx scripts/test-invite-mail.ts deine@adresse.de
async function main() {
  const to = process.argv[2] || process.env.GMAIL_USER
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
  const from = process.env.MAIL_FROM || user

  if (!user || !pass) {
    console.error('GMAIL_USER / GMAIL_APP_PASSWORD fehlen in .env')
    return
  }
  if (!to) {
    console.error('Keine Empfänger-Adresse. Aufruf: npx tsx scripts/test-invite-mail.ts mail@example.com')
    return
  }

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })

  console.log('Prüfe SMTP-Verbindung …')
  await transport.verify()
  console.log('✓ SMTP-Login ok')

  await transport.sendMail({
    from,
    to,
    subject: 'SimpleRoster – Test der Einladungsmail',
    text: 'Das ist eine Testmail. Wenn du sie liest, funktioniert der Gmail-Versand. ✅',
    html: '<p>Das ist eine Testmail. Wenn du sie liest, funktioniert der Gmail-Versand. ✅</p>',
  })
  console.log(`✓ Testmail an ${to} verschickt`)
}

main().then(() => process.exit())
