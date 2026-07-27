export function buildWeekReleasedEmail(
  weekStart: Date,
  releasedByName: string,
  user: { firstName: string | null; lastName: string | null },
  dashboardUrl: string
) {
  const firstName = user.firstName || 'Kolleg*in'
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const weekDisplay = weekStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })
    + ' – '
    + weekEnd.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })

  const subject = `Dienstplan freigegeben: KW ${getWeekNumber(weekStart)}`

  const html = `
    <p>Hallo ${firstName},</p>
    <p><strong>${releasedByName}</strong> hat den Dienstplan für die Woche <strong>${weekDisplay}</strong> freigegeben.</p>
    <p style="margin-top: 20px;">
      <a href="${dashboardUrl}/employee/schedule"
         style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white;
                 text-decoration: none; border-radius: 6px; font-weight: bold;">
        Dienstplan ansehen
      </a>
    </p>
    <p style="margin-top: 20px; font-size: 14px; color: #666;">
      Du kannst deine Stunden jetzt sehen und herunterladen.
    </p>
  `

  const text = `Hallo ${firstName},

${releasedByName} hat den Dienstplan für die Woche ${weekDisplay} freigegeben.

Schau gleich in dein Dashboard: ${dashboardUrl}/employee/schedule

Du kannst deine Stunden jetzt sehen und herunterladen.
  `

  return { subject, html, text }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
