// Leichtgewichtiges iCal-Parsing für GANZTÄGIGE Events (keine Dependency).
// Reine Funktionen, KEIN `server-only`/fetch/env → in tsx-Skripten testbar.
// Wird von lib/google/calendar.ts (Fetch + Cache + Env) genutzt.

export type AllDayEvent = {
  summary: string
  start: string // yyyy-MM-dd (inklusiv)
  endExclusive: string // yyyy-MM-dd (exklusiv, mind. start+1)
  durationDays: number
  rrule: string | null
  exdates: Set<string> // yyyy-MM-dd
}

// Faltung auflösen: Zeilen, die mit Space/Tab beginnen, gehören zur vorigen Zeile.
function unfold(text: string): string[] {
  const rawLines = text.split(/\r\n|\n|\r/)
  const lines: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

// "20260625" (auch "20260625T..." ) → "2026-06-25"
function dateValToISO(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim())
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

// Datums-Arithmetik auf reinen Kalendertagen (UTC-basiert, kein TZ-Drift).
function isoToUTC(iso: string): number {
  const [y, mo, d] = iso.split('-').map(Number)
  return Date.UTC(y, mo - 1, d)
}
function utcToISO(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}
const DAY_MS = 86_400_000
function addDaysISO(iso: string, n: number): string {
  return utcToISO(isoToUTC(iso) + n * DAY_MS)
}
function daysBetween(aISO: string, bISO: string): number {
  return Math.round((isoToUTC(bISO) - isoToUTC(aISO)) / DAY_MS)
}

export function parseEvents(ics: string): AllDayEvent[] {
  const lines = unfold(ics)
  const events: AllDayEvent[] = []
  let cur: (Partial<AllDayEvent> & { _startIsDate?: boolean }) | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = { exdates: new Set() }
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur && cur._startIsDate && cur.start) {
        const endExclusive = cur.endExclusive ?? addDaysISO(cur.start, 1)
        events.push({
          summary: cur.summary || '(ohne Titel)',
          start: cur.start,
          endExclusive,
          durationDays: Math.max(1, daysBetween(cur.start, endExclusive)),
          rrule: cur.rrule ?? null,
          exdates: cur.exdates ?? new Set(),
        })
      }
      cur = null
      continue
    }
    if (!cur) continue

    const colon = line.indexOf(':')
    if (colon === -1) continue
    const left = line.slice(0, colon)
    const value = line.slice(colon + 1)
    const [name, ...params] = left.split(';')
    const isDateOnly = params.some((p) => /^VALUE=DATE$/i.test(p))

    switch (name) {
      case 'SUMMARY':
        cur.summary = unescapeText(value)
        break
      case 'DTSTART':
        if (isDateOnly) {
          const iso = dateValToISO(value)
          if (iso) {
            cur.start = iso
            cur._startIsDate = true
          }
        }
        // Events mit Uhrzeit (kein VALUE=DATE) bleiben _startIsDate=false → ignoriert.
        break
      case 'DTEND':
        if (isDateOnly) {
          const iso = dateValToISO(value)
          if (iso) cur.endExclusive = iso // iCal: DTEND ist exklusiv
        }
        break
      case 'RRULE':
        cur.rrule = value.trim()
        break
      case 'EXDATE': {
        const iso = dateValToISO(value)
        if (iso) cur.exdates!.add(iso)
        break
      }
    }
  }
  return events
}

// ---- RRULE: Prüfen, ob an einem Kalendertag ein Wiederholungs-Beginn liegt ----
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function parseRule(rrule: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of rrule.split(';')) {
    const [k, v] = part.split('=')
    if (k && v) out[k.toUpperCase()] = v
  }
  return out
}

// Liegt an `candidate` (yyyy-MM-dd) ein Serien-Start des Events?
function isOccurrenceStart(ev: AllDayEvent, candidate: string): boolean {
  if (candidate < ev.start) return false
  if (ev.exdates.has(candidate)) return false
  if (!ev.rrule) return candidate === ev.start

  const r = parseRule(ev.rrule)
  const freq = r.FREQ
  const interval = Math.max(1, parseInt(r.INTERVAL || '1', 10))
  if (r.UNTIL) {
    const until = dateValToISO(r.UNTIL)
    if (until && candidate > until) return false
  }

  const sd = new Date(isoToUTC(ev.start))
  const cd = new Date(isoToUTC(candidate))

  switch (freq) {
    case 'DAILY':
      return daysBetween(ev.start, candidate) % interval === 0
    case 'WEEKLY': {
      const byday = (r.BYDAY || '').split(',').map((d) => d.trim()).filter(Boolean)
      const candCode = WEEKDAY_CODES[cd.getUTCDay()]
      const weekdayOk = byday.length > 0 ? byday.includes(candCode) : cd.getUTCDay() === sd.getUTCDay()
      if (!weekdayOk) return false
      // Wochen-Intervall relativ zum jeweiligen Wochenbeginn (Mo)
      const toMonday = (d: Date) => d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS
      const weeks = Math.round((toMonday(cd) - toMonday(sd)) / (7 * DAY_MS))
      return weeks >= 0 && weeks % interval === 0
    }
    case 'MONTHLY': {
      const day = r.BYMONTHDAY ? parseInt(r.BYMONTHDAY, 10) : sd.getUTCDate()
      if (cd.getUTCDate() !== day) return false
      const months = (cd.getUTCFullYear() - sd.getUTCFullYear()) * 12 + (cd.getUTCMonth() - sd.getUTCMonth())
      return months >= 0 && months % interval === 0
    }
    case 'YEARLY': {
      if (cd.getUTCMonth() !== sd.getUTCMonth() || cd.getUTCDate() !== sd.getUTCDate()) return false
      const years = cd.getUTCFullYear() - sd.getUTCFullYear()
      return years >= 0 && years % interval === 0
    }
    default:
      // Unbekannte Frequenz: nur den Originaltermin zeigen.
      return candidate === ev.start
  }
}

// Deckt ein Event den Tag `dateISO` ab (inkl. mehrtägiger + wiederkehrender)?
export function eventCoversDate(ev: AllDayEvent, dateISO: string): boolean {
  // Ein Serien-/Einzel-Start s deckt [s, s+duration). Wir testen die letzten
  // `durationDays` möglichen Starts vor (bzw. an) diesem Tag.
  for (let back = 0; back < ev.durationDays; back++) {
    const candidate = addDaysISO(dateISO, -back)
    if (isOccurrenceStart(ev, candidate)) return true
  }
  return false
}

/** Aus mehreren iCal-Texten eine Map Datum (yyyy-MM-dd) → Event-Titel bauen. */
export function buildEventMap(icsTexts: string[], dates: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const d of dates) result[d] = []
  for (const ics of icsTexts) {
    let events: AllDayEvent[]
    try {
      events = parseEvents(ics)
    } catch {
      continue
    }
    for (const ev of events) {
      for (const d of dates) {
        if (eventCoversDate(ev, d) && !result[d].includes(ev.summary)) {
          result[d].push(ev.summary)
        }
      }
    }
  }
  for (const d of dates) result[d].sort((a, b) => a.localeCompare(b, 'de'))
  return result
}
