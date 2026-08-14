import 'server-only'

// Live-Anbindung an die Notion-DB „💲 SMPL Catering/Event Funnel" (SMPL-Funnel-App).
// Liefert gebuchte Events (Status ab „🤝 Bestätigt") pro Datum als read-only Hinweise
// für die Notiz-Zeile im Wochenplaner — damit die Personalplanung anstehende
// Caterings/Events sieht. Kein DB-Sync (Notion-Muster wie Rezepte/Kalender).
//
// Setup (nicht im Code):
//   NOTION_FUNNEL_TOKEN  = Token der Integration „SMPL Funnel" (NICHT der Rezept-Token —
//                          die Funnel-DB ist nur mit dieser Integration geteilt)
//   NOTION_FUNNEL_DS_ID  = Data-Source-ID des Funnels (Default: bekannte Simple-DB)

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2025-09-03' // data_sources-Endpoint braucht die neue API-Version
const DEFAULT_DS_ID = '2b87b6c3-329f-8129-a390-000bb5d8fbc6'

// Status ab „Bestätigt" = Event findet statt. Vergleich über getrimmte Namen,
// weil die Notion-Optionen Eigenheiten haben (führendes Leerzeichen bei
// „ 🙌 Abgeschlossen", Tippfehler „Rechung"); beide Schreibweisen abgedeckt.
const BOOKED_STATUS = new Set([
  '🤝 Bestätigt',
  '💶 Akonto-Rechnung gestellt',
  '🙌 Abgeschlossen',
  '🧾 Rechnung gestellt',
  '🤑 Rechung bezahlt',
  '🤑 Rechnung bezahlt',
])

const TTL_MS = 10 * 60 * 1000 // 10 min — Buchungen ändern sich selten, vermeidet Fetch-Spam

// Live-URL der SMPL-Funnel-App (siehe project_smpl_funnel Memory). Deep-Link
// öffnet dort direkt den Event-Drawer der Anfrage (?event=<notion-page-id>).
const DEFAULT_FUNNEL_APP_URL = 'https://smpl-funnel-zeta.vercel.app'

export function isFunnelConfigured(): boolean {
  return Boolean(process.env.NOTION_FUNNEL_TOKEN?.trim())
}

export type BookedEvent = { label: string; url: string }

type NotionPage = {
  id: string
  properties?: {
    Name?: { title?: { plain_text: string }[] }
    Status?: { status?: { name?: string } | null }
    Datum?: { date?: { start?: string | null; end?: string | null } | null }
    Startzeit?: { rich_text?: { plain_text: string }[] }
  }
}

type QueryResponse = { results?: NotionPage[]; has_more?: boolean; next_cursor?: string | null }

function text(runs?: { plain_text: string }[]): string {
  return (runs || []).map((t) => t.plain_text).join('').trim()
}

async function queryBooked(from: string, to: string): Promise<NotionPage[]> {
  const token = process.env.NOTION_FUNNEL_TOKEN!.trim()
  const dsId = process.env.NOTION_FUNNEL_DS_ID?.trim() || DEFAULT_DS_ID
  const pages: NotionPage[] = []
  let cursor: string | null | undefined
  do {
    const res = await fetch(`${NOTION_API}/data_sources/${dsId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        filter: {
          and: [
            { property: 'Datum', date: { on_or_after: from } },
            { property: 'Datum', date: { on_or_before: to } },
          ],
        },
      }),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Notion API ${res.status}`)
    const json = (await res.json()) as QueryResponse
    pages.push(...(json.results || []))
    cursor = json.has_more ? json.next_cursor : null
  } while (cursor)
  return pages
}

function funnelAppUrl(): string {
  return (process.env.FUNNEL_APP_URL?.trim() || DEFAULT_FUNNEL_APP_URL).replace(/\/$/, '')
}

function buildMap(pages: NotionPage[], dates: string[]): Record<string, BookedEvent[]> {
  const map: Record<string, BookedEvent[]> = {}
  for (const d of dates) map[d] = []
  const appUrl = funnelAppUrl()
  for (const p of pages) {
    const props = p.properties || {}
    const status = (props.Status?.status?.name || '').trim()
    if (!BOOKED_STATUS.has(status)) continue
    const day = (props.Datum?.date?.start || '').slice(0, 10)
    if (!(day in map)) continue
    const name = text(props.Name?.title)
    if (!name) continue
    const startzeit = text(props.Startzeit?.rich_text)
    const label = startzeit ? `${name} · ${startzeit} Uhr` : name
    map[day].push({ label, url: `${appUrl}/?event=${p.id}` })
  }
  return map
}

// ---- Mini-TTL-Cache (best effort pro Server-Instanz) ----
let cache: { at: number; key: string; data: Record<string, BookedEvent[]> } | null = null

/**
 * Gebuchte Funnel-Events (Status ab „Bestätigt") für die gegebenen Tage (yyyy-MM-dd).
 * Liefert immer ein vollständiges Map-Objekt (auch leere Listen) und wirft NIE —
 * ein Notion-Ausfall darf den Wochenplaner nicht blockieren.
 */
export async function getBookedEventsForDates(dates: string[]): Promise<Record<string, BookedEvent[]>> {
  const empty: Record<string, BookedEvent[]> = {}
  for (const d of dates) empty[d] = []
  if (!isFunnelConfigured() || dates.length === 0) return empty

  try {
    const now = Date.now()
    const key = dates.join(',')
    if (cache && cache.key === key && now - cache.at < TTL_MS) return cache.data
    const sorted = [...dates].sort()
    const pages = await queryBooked(sorted[0], sorted[sorted.length - 1])
    const data = buildMap(pages, dates)
    cache = { at: now, key, data }
    return data
  } catch {
    return empty
  }
}
