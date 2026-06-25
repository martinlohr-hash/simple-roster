import 'server-only'

// Live-Anbindung an die Notion-Rezeptdatenbank „🧑‍🍳 Sandwichzubereitung & Rezepte".
// Liest direkt aus Notion (Notion bleibt die einzige Quelle). Benötigt:
//   NOTION_TOKEN          = Token einer internen Notion-Integration mit Zugriff auf die DB
//   NOTION_RECIPES_DB_ID  = ID der Rezept-Datenbank (Default: bekannte Simple-DB)
//
// Bilder kommen als signierte S3-URLs, die nach ~1 h ablaufen → wir cachen Antworten
// nur kurz (TTL < Ablauf) und holen sonst frisch.

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const DEFAULT_DB_ID = '29d7b6c3329f805e9420c296edbc5dfa'

const LIST_TTL_MS = 15 * 60 * 1000 // 15 min – innerhalb der 1-h-Gültigkeit der Bild-URLs
const DETAIL_TTL_MS = 15 * 60 * 1000

export function isRecipesConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN)
}

function dbId(): string {
  return process.env.NOTION_RECIPES_DB_ID || DEFAULT_DB_ID
}

// ---- Mini-TTL-Cache (best effort pro Server-Instanz, vermeidet API-Spam) ----
const cache = new Map<string, { at: number; data: unknown }>()
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T
  const data = await fn()
  cache.set(key, { at: Date.now(), data })
  return data
}

async function notionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.NOTION_TOKEN
  if (!token) throw new Error('NOTION_TOKEN nicht gesetzt')
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Notion API ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json() as Promise<T>
}

// ---- Typen ----
export type RecipeSummary = {
  id: string
  name: string
  categories: string[]
  tags: string[]
  allergens: string[]
  breads: string[]
  price: number | null
  coverUrl: string | null
}

export type RichRun = { text: string; bold: boolean; href: string | null }
export type RecipeBlock =
  | { kind: 'heading'; runs: RichRun[] }
  | { kind: 'paragraph'; runs: RichRun[] }
  | { kind: 'bullet'; runs: RichRun[] }
  | { kind: 'numbered'; runs: RichRun[] }
  | { kind: 'image'; url: string; caption: string }
  | { kind: 'divider' }

export type RecipeDetail = RecipeSummary & { blocks: RecipeBlock[] }

export type GroupedRecipes = { sandwiches: RecipeSummary[]; sauces: RecipeSummary[] }

// ---- Notion-Rohtypen (nur was wir brauchen) ----
type NotionRichText = { plain_text: string; annotations?: { bold?: boolean }; href?: string | null }
type NotionFile = { type?: string; file?: { url: string }; external?: { url: string }; caption?: NotionRichText[] }
type NotionPage = {
  id: string
  cover?: NotionFile | null
  properties: Record<string, {
    title?: NotionRichText[]
    multi_select?: { name: string }[]
    number?: number | null
    checkbox?: boolean
  }>
}

function names(v?: { name: string }[]): string[] {
  return (v || []).map((o) => o.name)
}

function fileUrl(f?: NotionFile | null): string | null {
  if (!f) return null
  return f.external?.url || f.file?.url || null
}

function toSummary(page: NotionPage): RecipeSummary {
  const p = page.properties
  const titleProp = Object.values(p).find((x) => Array.isArray(x.title))
  const name = (titleProp?.title || []).map((t) => t.plain_text).join('').trim() || 'Ohne Titel'
  return {
    id: page.id,
    name,
    categories: names(p['Kategorie']?.multi_select),
    tags: names(p['Tags']?.multi_select),
    allergens: names(p['Allergene']?.multi_select),
    breads: names(p['Brot']?.multi_select),
    price: typeof p['Brutto VK']?.number === 'number' ? p['Brutto VK']!.number! : null,
    coverUrl: fileUrl(page.cover),
  }
}

function toRuns(rt?: NotionRichText[]): RichRun[] {
  return (rt || [])
    .filter((t) => t.plain_text)
    .map((t) => ({ text: t.plain_text, bold: Boolean(t.annotations?.bold), href: t.href ?? null }))
}

/**
 * Lädt die für Mitarbeiter relevanten Rezepte: aktuelle Sandwiches (Kategorie
 * „Sandwich", nicht archiviert, OHNE NEW-Tag = der Notion-View „Sandwiches aktuell")
 * plus Saucen/Dips (Kategorie „Sauce/Dip", nicht archiviert).
 */
export async function listRecipes(): Promise<GroupedRecipes> {
  return cached('recipes:list', LIST_TTL_MS, async () => {
    const filter = {
      and: [
        { property: 'Archivieren', checkbox: { equals: false } },
        {
          or: [
            { property: 'Kategorie', multi_select: { contains: 'Sandwich' } },
            { property: 'Kategorie', multi_select: { contains: 'Sauce/Dip' } },
          ],
        },
      ],
    }

    const all: RecipeSummary[] = []
    let cursor: string | undefined
    do {
      const body: Record<string, unknown> = { filter, page_size: 100 }
      if (cursor) body.start_cursor = cursor
      const data = await notionFetch<{ results: NotionPage[]; has_more: boolean; next_cursor: string | null }>(
        `/databases/${dbId()}/query`,
        { method: 'POST', body: JSON.stringify(body) },
      )
      all.push(...data.results.map(toSummary))
      cursor = data.has_more ? data.next_cursor || undefined : undefined
    } while (cursor)

    const byName = (a: RecipeSummary, b: RecipeSummary) => a.name.localeCompare(b.name, 'de')
    const sandwiches = all
      .filter((r) => r.categories.includes('Sandwich') && !r.tags.includes('NEW'))
      .sort(byName)
    const sauces = all.filter((r) => r.categories.includes('Sauce/Dip')).sort(byName)
    return { sandwiches, sauces }
  })
}

/** Lädt ein einzelnes Rezept inkl. Seiteninhalt (Zutaten/Zubereitung/Bild). */
export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  return cached(`recipes:detail:${id}`, DETAIL_TTL_MS, async () => {
    let page: NotionPage
    try {
      page = await notionFetch<NotionPage>(`/pages/${id}`)
    } catch {
      return null
    }
    const summary = toSummary(page)

    const blocks: RecipeBlock[] = []
    let cursor: string | undefined
    do {
      const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100'
      const data = await notionFetch<{ results: RawBlock[]; has_more: boolean; next_cursor: string | null }>(
        `/blocks/${id}/children${qs}`,
      )
      for (const b of data.results) {
        const parsed = parseBlock(b)
        if (parsed) blocks.push(parsed)
      }
      cursor = data.has_more ? data.next_cursor || undefined : undefined
    } while (cursor)

    return { ...summary, blocks }
  })
}

type RawBlock = {
  type: string
  paragraph?: { rich_text: NotionRichText[] }
  heading_1?: { rich_text: NotionRichText[] }
  heading_2?: { rich_text: NotionRichText[] }
  heading_3?: { rich_text: NotionRichText[] }
  bulleted_list_item?: { rich_text: NotionRichText[] }
  numbered_list_item?: { rich_text: NotionRichText[] }
  image?: NotionFile
}

function parseBlock(b: RawBlock): RecipeBlock | null {
  switch (b.type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      const runs = toRuns(b[b.type as 'heading_1']?.rich_text)
      return runs.length ? { kind: 'heading', runs } : null
    }
    case 'paragraph': {
      const runs = toRuns(b.paragraph?.rich_text)
      if (!runs.length) return null
      // Ein durchgehend fett gesetzter Absatz dient als Zwischenüberschrift („Zutaten").
      return runs.every((r) => r.bold) ? { kind: 'heading', runs } : { kind: 'paragraph', runs }
    }
    case 'bulleted_list_item': {
      const runs = toRuns(b.bulleted_list_item?.rich_text)
      return runs.length ? { kind: 'bullet', runs } : null
    }
    case 'numbered_list_item': {
      const runs = toRuns(b.numbered_list_item?.rich_text)
      return runs.length ? { kind: 'numbered', runs } : null
    }
    case 'image': {
      const url = fileUrl(b.image)
      if (!url) return null
      const caption = (b.image?.caption || []).map((c) => c.plain_text).join('')
      return { kind: 'image', url, caption }
    }
    case 'divider':
      return { kind: 'divider' }
    default:
      return null
  }
}
