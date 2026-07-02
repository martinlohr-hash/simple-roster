// Erzeugt den persönlichen iCal-Feed (ICS) mit den eigenen Schichten eines
// Mitarbeiters. Zeiten sind Berliner Wandzeit (Schicht "08:00" = 08:00 in
// Berlin), daher DTSTART/DTEND mit TZID + eingebetteter VTIMEZONE.

type FeedShift = {
  id: string
  date: Date // UTC-Mitternacht des Plantags
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  locationName: string
}

// Statische VTIMEZONE-Definition für Europe/Berlin (CET/CEST) – von Apple/Google/
// Outlook verstanden, RRULEs decken die EU-Sommerzeitregel dauerhaft ab.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n')

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** "yyyy-MM-dd" + "HH:mm" → "20260702T080000" (lokale Zeit, TZID liefert die Zone). */
function icsLocal(dayStr: string, time: string): string {
  return `${dayStr.replace(/-/g, '')}T${time.replace(':', '')}00`
}

export function buildIcsFeed(userName: string, shifts: FeedShift[]): string {
  const now = new Date()
  const dtstamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

  const events = shifts.map((s) => {
    const dayStr = s.date.toISOString().slice(0, 10)
    // Über-Mitternacht-Schichten: Ende am Folgetag
    const endsNextDay = s.endTime <= s.startTime
    const endDay = endsNextDay
      ? new Date(s.date.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : dayStr
    return [
      'BEGIN:VEVENT',
      `UID:shift-${s.id}@simple-roster`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${icsLocal(dayStr, s.startTime)}`,
      `DTEND;TZID=Europe/Berlin:${icsLocal(endDay, s.endTime)}`,
      `SUMMARY:${escapeText(`Schicht · ${s.locationName}`)}`,
      `LOCATION:${escapeText(s.locationName)}`,
      'END:VEVENT',
    ].join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Simple Roster//Dienstplan//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`Dienstplan ${userName}`)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    // Kalender-Apps als Hinweis: alle ~30 min aktualisieren
    'REFRESH-INTERVAL;VALUE=DURATION:PT30M',
    'X-PUBLISHED-TTL:PT30M',
    VTIMEZONE,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}
