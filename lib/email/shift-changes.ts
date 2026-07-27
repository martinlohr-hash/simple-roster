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
  user: { firstName: string | null; lastName: string | null }
) {
  const firstName = user.firstName || 'Kolleg*in'
  const subject = changes.length === 1
    ? `Dein Dienstplan: ${changes[0].action === 'assigned' ? 'Neue' : 'Geänderte'} Schicht`
    : `Dein Dienstplan: ${changes.length} Änderungen`

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
    <p>Schau gleich in dein Dashboard, um alle Details zu sehen.</p>
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

Schau gleich in dein Dashboard, um alle Details zu sehen.
  `

  return { subject, html, text }
}
