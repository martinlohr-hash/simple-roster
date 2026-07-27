import 'server-only'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mail'
import { buildShiftChangesEmail, type ShiftChange } from '@/lib/email/shift-changes'
import { buildWeekReleasedEmail } from '@/lib/email/week-released'

export async function queueShiftEmail(
  userId: string,
  changes: ShiftChange[],
  delayMinutes = 15
): Promise<void> {
  if (!changes.length) return

  const scheduledFor = new Date(Date.now() + delayMinutes * 60_000)

  // Prüfe, ob es schon einen Eintrag für diesen User gibt
  const existing = await prisma.pendingEmail.findFirst({
    where: {
      userId,
      type: 'shifts',
      sentAt: null,
      scheduledFor: { lte: new Date(Date.now() + (delayMinutes + 5) * 60_000) }, // im gleichen Zeitfenster
    },
  })

  if (existing && existing.metadata && typeof existing.metadata === 'object' && 'changes' in existing.metadata) {
    const existingChanges = (existing.metadata as Record<string, unknown>).changes as ShiftChange[]
    const merged = [...existingChanges, ...changes]
    // Dedupliziere nach shiftId + action (gleiche Schicht, gleiche Action wird überschrieben)
    const deduped = Array.from(
      new Map(
        merged.map(c => [`${c.shiftId}:${c.action}`, c])
      ).values()
    )
    await prisma.pendingEmail.update({
      where: { id: existing.id },
      data: { metadata: { changes: deduped } as any },
    })
  } else {
    // Neuer Eintrag
    await prisma.pendingEmail.create({
      data: {
        userId,
        type: 'shifts',
        shiftIds: changes.map(c => c.shiftId),
        metadata: { changes } as any,
        scheduledFor,
      },
    })
  }
}

export async function queueWeekReleasedEmail(
  releasedByUserId: string,
  weekStart: Date
): Promise<void> {
  // Finde alle EMPLOYEE-User, die nicht der Admin sind
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    select: { id: true },
  })

  for (const emp of employees) {
    await prisma.pendingEmail.create({
      data: {
        userId: emp.id,
        type: 'week_released',
        metadata: { weekStart: weekStart.toISOString(), releasedByUserId },
        scheduledFor: new Date(), // sofort
      },
    })
  }
}

// Cron-Job: verschickt fällige E-Mails
export async function sendPendingEmails() {
  const now = new Date()
  const pending = await prisma.pendingEmail.findMany({
    where: {
      sentAt: null,
      scheduledFor: { lte: now },
    },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const results = { sent: 0, failed: 0, skipped: 0 }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  for (const item of pending) {
    try {
      if (item.type === 'shifts' && item.metadata && typeof item.metadata === 'object' && 'changes' in item.metadata) {
        const changes = (item.metadata as Record<string, unknown>).changes as ShiftChange[]
        const emailContent = buildShiftChangesEmail(changes, {
          firstName: item.user.firstName || item.user.name.split(' ')[0],
          lastName: item.user.lastName || item.user.name.split(' ').pop() || '',
        }, baseUrl)

        await sendMail({
          to: item.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
        results.sent++
      } else if (item.type === 'week_released' && item.metadata && typeof item.metadata === 'object') {
        const meta = item.metadata as Record<string, unknown>
        const weekStart = new Date(meta.weekStart as string)
        const releasedByUserId = meta.releasedByUserId as string

        const releasedBy = await prisma.user.findUnique({
          where: { id: releasedByUserId },
          select: { firstName: true, lastName: true, name: true },
        })
        const releasedByName = releasedBy?.firstName || releasedBy?.name || 'Admin'

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const emailContent = buildWeekReleasedEmail(weekStart, releasedByName, {
          firstName: item.user.firstName || item.user.name.split(' ')[0],
          lastName: item.user.lastName || item.user.name.split(' ').pop() || '',
        }, baseUrl)

        await sendMail({
          to: item.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
        results.sent++
      }

      // Markiere als versendet
      await prisma.pendingEmail.update({
        where: { id: item.id },
        data: { sentAt: now },
      })
    } catch (err) {
      console.error(`Fehler beim Versand an ${item.user.email}:`, err)
      results.failed++
    }
  }

  return results
}
