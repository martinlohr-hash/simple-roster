import 'server-only'
import { buildEventMap } from './ical'

// Live-Anbindung an einen Google-Kalender über die „Geheime Adresse im iCal-Format".
// Liest nur GANZTÄGIGE Ereignisse und liefert sie pro Datum als read-only Hinweise
// für die Notiz-Zeile im Wochenplaner.
//
// Setup (nicht im Code):
//   GOOGLE_CALENDAR_ICAL_URL = die private iCal-URL aus
//     Google Kalender → Einstellungen → Kalender → "Geheime Adresse im iCal-Format".
//   Mehrere Kalender möglich: URLs mit Komma oder Whitespace getrennt.
//
// Kein DB-Sync (Notion-Muster): live holen, nur kurz cachen pro Server-Instanz.

const TTL_MS = 10 * 60 * 1000 // 10 min – Kalender ändert sich selten, vermeidet Fetch-Spam

export function isCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CALENDAR_ICAL_URL?.trim())
}

function icalUrls(): string[] {
  const raw = process.env.GOOGLE_CALENDAR_ICAL_URL?.trim()
  if (!raw) return []
  return raw
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => u.replace(/^webcal:\/\//i, 'https://')) // webcal:// ist HTTPS
}

// ---- Mini-TTL-Cache (best effort pro Server-Instanz) ----
let cache: { at: number; key: string; data: Record<string, string[]> } | null = null

async function fetchAndBuild(dates: string[]): Promise<Record<string, string[]>> {
  const urls = icalUrls()
  const empty: Record<string, string[]> = {}
  for (const d of dates) empty[d] = []
  if (urls.length === 0 || dates.length === 0) return empty

  const settled = await Promise.allSettled(
    urls.map((url) =>
      fetch(url, { cache: 'no-store', redirect: 'follow' }).then((r) => {
        if (!r.ok) throw new Error(`iCal ${r.status}`)
        return r.text()
      }),
    ),
  )
  const texts = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value)
  return buildEventMap(texts, dates)
}

/**
 * Ganztägige Kalender-Events für die gegebenen Tage (yyyy-MM-dd).
 * Liefert immer ein vollständiges Map-Objekt (auch leere Listen) und wirft NIE –
 * ein Kalenderausfall darf den Wochenplaner nicht blockieren.
 */
export async function getAllDayEventsForDates(dates: string[]): Promise<Record<string, string[]>> {
  const empty: Record<string, string[]> = {}
  for (const d of dates) empty[d] = []
  if (!isCalendarConfigured() || dates.length === 0) return empty

  try {
    const now = Date.now()
    const key = dates.join(',')
    if (cache && cache.key === key && now - cache.at < TTL_MS) return cache.data
    const data = await fetchAndBuild(dates)
    cache = { at: now, key, data }
    return data
  } catch {
    return empty
  }
}
