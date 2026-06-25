import { buildEventMap, parseEvents } from '../lib/google/ical'

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Feiertag Ganztag
DTSTART;VALUE=DATE:20260622
DTEND;VALUE=DATE:20260623
END:VEVENT
BEGIN:VEVENT
SUMMARY:Urlaub Mehrtaegig
DTSTART;VALUE=DATE:20260624
DTEND;VALUE=DATE:20260627
END:VEVENT
BEGIN:VEVENT
SUMMARY:Meeting mit Uhrzeit (ignorieren)
DTSTART;TZID=Europe/Berlin:20260625T100000
DTEND;TZID=Europe/Berlin:20260625T110000
END:VEVENT
BEGIN:VEVENT
SUMMARY:Geburtstag Anna
DTSTART;VALUE=DATE:20200626
RRULE:FREQ=YEARLY
END:VEVENT
BEGIN:VEVENT
SUMMARY:Lange Zeile die ueber zwei
  Zeilen gefaltet ist mit Komma\\, und Backslash
DTSTART;VALUE=DATE:20260623
END:VEVENT
BEGIN:VEVENT
SUMMARY:Woechentlich Mo
DTSTART;VALUE=DATE:20260601
RRULE:FREQ=WEEKLY;BYDAY=MO
EXDATE;VALUE=DATE:20260622
END:VEVENT
END:VCALENDAR`

// Woche Mo 22.06.2026 .. So 28.06.2026
const week = ['2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28']

function main() {
  console.log('Parsed all-day events:', parseEvents(ICS).map((e) => `${e.summary} [${e.start}..${e.endExclusive}) rrule=${e.rrule}`))
  console.log('\nMap pro Tag:')
  const map = buildEventMap([ICS], week)
  for (const d of week) console.log(`  ${d}: ${JSON.stringify(map[d])}`)

  // Erwartungen
  const expect: Record<string, string[]> = {
    '2026-06-22': ['Feiertag Ganztag'], // Mo: Feiertag; Woechentlich-Mo ist via EXDATE raus
    '2026-06-23': ['Lange Zeile die ueber zwei Zeilen gefaltet ist mit Komma, und Backslash'],
    '2026-06-24': ['Urlaub Mehrtaegig'],
    '2026-06-25': ['Urlaub Mehrtaegig'], // Meeting mit Uhrzeit NICHT enthalten
    '2026-06-26': ['Geburtstag Anna', 'Urlaub Mehrtaegig'], // 27. ist exklusiv -> 26. letzter Urlaubstag
    '2026-06-27': [], // DTEND exklusiv
    '2026-06-28': [],
  }
  let ok = true
  for (const d of week) {
    const got = JSON.stringify(map[d])
    const exp = JSON.stringify(expect[d])
    if (got !== exp) {
      ok = false
      console.log(`FEHLER ${d}: erwartet ${exp}, bekam ${got}`)
    }
  }
  console.log(ok ? '\n✓ Alle Erwartungen erfüllt' : '\n✗ Abweichungen siehe oben')
}

main()
