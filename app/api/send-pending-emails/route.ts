import { type NextRequest, NextResponse } from 'next/server'
import { sendPendingEmails } from '@/lib/mail/queue'

export const runtime = 'nodejs' // nodemailer braucht Node.js

export async function GET(request: NextRequest) {
  // Optional: token-basierte Authentifizierung (z.B. von Vercel Cron)
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret = process.env.CRON_SECRET || process.env.ONBOARDING_CRON_TOKEN

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET nicht gesetzt' },
      { status: 500 }
    )
  }

  if (token !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const results = await sendPendingEmails()
    return NextResponse.json(results)
  } catch (err) {
    console.error('Fehler beim Versand von E-Mails:', err)
    return NextResponse.json(
      { error: 'Fehler beim Versand', details: String(err) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Fallback für manuelle Triggers
  return GET(request)
}
