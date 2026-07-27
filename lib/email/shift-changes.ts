export type ShiftChangeAction = 'assigned' | 'changed'

export interface ShiftChange {
  shiftId: string
  action: ShiftChangeAction
  date: string
  startTime: string
  endTime: string
  location?: string
  oldStartTime?: string
  oldEndTime?: string
  oldLocation?: string
}

export function buildShiftChangesEmail(
  changes: ShiftChange[],
  user: { firstName: string | null; lastName: string | null },
  dashboardUrl: string = 'http://localhost:3000'
) {
  const firstName = user.firstName || 'Kolleg*in'
  const subject = changes.length === 1
    ? `Dein Dienstplan: ${changes[0].action === 'assigned' ? 'Neue' : 'Geänderte'} Schicht`
    : `Dein Dienstplan: ${changes.length} Änderungen`

  // Link zur Woche der ersten Schicht
  const firstDate = new Date(changes[0].date)
  const monday = new Date(firstDate)
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1)
  const weekParam = monday.toISOString().split('T')[0]
  const scheduleLink = `${dashboardUrl}/employee/schedule?week=${weekParam}`

  const changesHtml = changes
    .map(c => {
      const dateStr = new Date(c.date).toLocaleDateString('de-DE', { weekday: 'short', month: 'numeric', day: 'numeric' })
      const time = `${c.startTime}–${c.endTime} Uhr`
      const location = c.location ? ` @ ${c.location}` : ''

      if (c.action === 'assigned') {
        return `<tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${dateStr}</strong><br/>
          ${time}${location}
        </td></tr>`
      } else {
        const oldTime = c.oldStartTime ? `${c.oldStartTime}–${c.oldEndTime}` : '(?)–(?)'
        const oldLocation = c.oldLocation ? ` @ ${c.oldLocation}` : ''
        return `<tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${dateStr}</strong><br/>
          <span style="text-decoration: line-through; color: #999;">${oldTime}${oldLocation}</span>
          <span style="color: #059669;"> → ${time}${location}</span>
        </td></tr>`
      }
    })
    .join('')

  const html = `
    <p>Hallo ${firstName},</p>
    <p>${
      changes.length === 1
        ? `eine ${changes[0].action === 'assigned' ? 'neue Schicht' : 'Änderung an deiner Schicht'} wartet auf dich:`
        : `${changes.length} Änderungen in deinem Dienstplan:`
    }</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      ${changesHtml}
    </table>
    <p style="margin-top: 20px;">
      <a href="${scheduleLink}"
         style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white;
                 text-decoration: none; border-radius: 6px; font-weight: bold;">
        Zum Dienstplan
      </a>
    </p>
  `

  const text = `Hallo ${firstName},

${
  changes.length === 1
    ? `eine ${changes[0].action === 'assigned' ? 'neue Schicht' : 'Änderung an deiner Schicht'} wartet auf dich:`
    : `${changes.length} Änderungen in deinem Dienstplan:`
}

${changes
  .map(c => {
    const dateStr = new Date(c.date).toLocaleDateString('de-DE', { weekday: 'short', month: 'numeric', day: 'numeric' })
    const time = `${c.startTime}–${c.endTime}`
    const location = c.location ? ` @ ${c.location}` : ''
    if (c.action === 'assigned') return `${dateStr}: ${time}${location}`
    const oldTime = c.oldStartTime ? `${c.oldStartTime}–${c.oldEndTime}` : '?–?'
    const oldLocation = c.oldLocation ? ` @ ${c.oldLocation}` : ''
    return `${dateStr}: ${oldTime}${oldLocation} → ${time}${location}`
  })
  .join('\n')}

Dienstplan ansehen: ${scheduleLink}
  `

  return { subject, html, text }
}
