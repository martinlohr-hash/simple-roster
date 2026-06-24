// Team-Intelligence-Logik (Merrill-Reid / "Know Your Team", Unreasonable Hospitality).
// Reine, UI-freie Helfer: Typ-Metadaten, Quadranten-Mapping, Gap-Analyse,
// Superpower-Aggregation. Werden sowohl server- als auch clientseitig genutzt.

export const PERSONALITY_KEYS = ['DRIVER', 'EXPRESSIVE', 'AMIABLE', 'ANALYTIC'] as const
export type PersonalityKey = (typeof PERSONALITY_KEYS)[number]
export type PersonalityValue = PersonalityKey | 'UNKNOWN'

export const MAX_SUPERPOWERS = 7
export const MAX_NOTE_LENGTH = 80

// Quadrant: people|task auf der X-Achse, extro|intro auf der Y-Achse.
type Quadrant = {
  x: 'people' | 'task'
  y: 'extro' | 'intro'
}

export type PersonalityMeta = {
  key: PersonalityKey
  label: string
  tagline: string
  description: string
  quadrant: Quadrant
  /** Normalisierte Zentrumsposition im Chart (0..1, y nach unten wachsend). */
  center: { x: number; y: number }
  /** Akzentfarbe (Hex) für Punkte/Badges in der Matrix. */
  color: string
  /** Tailwind-Klassen für Badge-Darstellung. */
  badge: string
  /** Meldung, wenn dieser Quadrant leer ist. */
  gapMessage: string
  /** Meldung, wenn dieser Quadrant überbesetzt ist (>= 60 %). */
  overweightMessage: string
}

export const PERSONALITY_META: Record<PersonalityKey, PersonalityMeta> = {
  DRIVER: {
    key: 'DRIVER',
    label: 'Driver',
    tagline: 'Unnachgiebig, ergebnisgetrieben, direkt',
    description:
      'Extrovertiert + aufgabenorientiert. Bringt Dinge ins Ziel, übernimmt Tempo und Verantwortung – kann aber Menschen vor den Kopf stoßen.',
    quadrant: { x: 'task', y: 'extro' },
    center: { x: 0.75, y: 0.25 },
    color: '#f97316', // orange-500
    badge: 'bg-orange-100 text-orange-700 ring-orange-200',
    gapMessage:
      'Kein Driver im Team. Durchsetzungskraft, Tempo und kompromisslose Ergebnisorientierung fehlen.',
    overweightMessage:
      'Team ist stark Driver-lastig. Risiko: harte Arbeitskultur, Reibung, wenig Harmonie.',
  },
  EXPRESSIVE: {
    key: 'EXPRESSIVE',
    label: 'Expressive',
    tagline: 'Die Energie im Raum, Big-Picture-Denker',
    description:
      'Extrovertiert + menschenorientiert. Begeistert und reißt mit, denkt groß – lässt sich aber vom "Next Big Thing" ablenken.',
    quadrant: { x: 'people', y: 'extro' },
    center: { x: 0.25, y: 0.25 },
    color: '#ec4899', // pink-500
    badge: 'bg-pink-100 text-pink-700 ring-pink-200',
    gapMessage:
      'Kein Expressive im Team. Energie, Begeisterung und Big-Picture-Thinking fehlen.',
    overweightMessage:
      'Team ist stark Expressive-lastig. Risiko: viel Energie, wenig Detailtiefe und Durchhaltevermögen.',
  },
  AMIABLE: {
    key: 'AMIABLE',
    label: 'Amiable',
    tagline: 'Der Klebstoff des Teams, emotional intelligent',
    description:
      'Introvertiert + menschenorientiert. Hält das Team zusammen, sorgt für Harmonie und Empathie – vermeidet aber Konflikt und Risiko.',
    quadrant: { x: 'people', y: 'intro' },
    center: { x: 0.25, y: 0.75 },
    color: '#10b981', // emerald-500
    badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    gapMessage:
      'Kein Amiable im Team. Der emotionale Klebstoff, Harmonie und Empathie fehlen.',
    overweightMessage:
      'Team ist stark Amiable-lastig. Risiko: Konfliktvermeidung, wenig Tempo und Risikobereitschaft.',
  },
  ANALYTIC: {
    key: 'ANALYTIC',
    label: 'Analytic',
    tagline: 'Systemmensch: Checklisten, Prozesse, Risiko',
    description:
      'Introvertiert + aufgabenorientiert. Baut Systeme, erkennt Risiken, denkt in Prozessen – läuft aber Gefahr, in Analysis-Paralysis zu erstarren.',
    quadrant: { x: 'task', y: 'intro' },
    center: { x: 0.75, y: 0.75 },
    color: '#6366f1', // indigo-500
    badge: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    gapMessage:
      'Kein Analytic im Team. Struktur, Prozesse und Risikoerkennung fehlen.',
    overweightMessage:
      'Team ist stark Analytic-lastig. Risiko: Analysis-Paralysis, wenig Tempo und Energie.',
  },
}

export function personalityLabel(value: PersonalityValue): string {
  return value === 'UNKNOWN' ? 'Unbekannt' : PERSONALITY_META[value].label
}

export function isPersonalityKey(value: string): value is PersonalityKey {
  return (PERSONALITY_KEYS as readonly string[]).includes(value)
}

// ---- Mitglieder-Modell (so wird es von den Seiten geladen/serialisiert) ----

export type InsightMember = {
  id: string
  name: string
  personalityType: PersonalityValue
  personalityNote: string | null
  superpowers: string[]
  assessedAt: string | null // ISO-String oder null
}

export type QuadrantCounts = Record<PersonalityKey, number>

export function emptyCounts(): QuadrantCounts {
  return { DRIVER: 0, EXPRESSIVE: 0, AMIABLE: 0, ANALYTIC: 0 }
}

export type TeamComposition = {
  counts: QuadrantCounts
  assessed: number // Summe der vier echten Typen (ohne UNKNOWN)
  unknown: number // eingeschätzt als UNKNOWN
  unassessed: number // ganz ohne Einschätzung
}

export function composeTeam(members: InsightMember[]): TeamComposition {
  const counts = emptyCounts()
  let unknown = 0
  let unassessed = 0
  for (const m of members) {
    if (m.personalityType === 'UNKNOWN') {
      // "echte" UNKNOWN-Einschätzung vs. noch nie angefasst unterscheiden:
      if (m.assessedAt) unknown++
      else unassessed++
    } else {
      counts[m.personalityType]++
    }
  }
  const assessed = PERSONALITY_KEYS.reduce((sum, k) => sum + counts[k], 0)
  return { counts, assessed, unknown, unassessed }
}

// ---- Gap-Analyse ----

export type GapFinding = {
  kind: 'gap' | 'overweight' | 'balanced' | 'empty'
  type?: PersonalityKey
  message: string
  severity: 'info' | 'warning' | 'good'
}

const OVERWEIGHT_THRESHOLD = 0.6
const OVERWEIGHT_MIN_TEAM = 3 // unter 3 eingeschätzten Personen ist "60 %" nicht aussagekräftig

export function analyzeGaps(comp: TeamComposition): GapFinding[] {
  const { counts, assessed } = comp

  if (assessed === 0) {
    return [
      {
        kind: 'empty',
        message:
          'Noch keine Einschätzungen vergeben. Die Matrix füllt sich, sobald du Mitarbeiter einem Typ zuordnest.',
        severity: 'info',
      },
    ]
  }

  const findings: GapFinding[] = []

  // Lücken: leere Quadranten
  for (const key of PERSONALITY_KEYS) {
    if (counts[key] === 0) {
      findings.push({
        kind: 'gap',
        type: key,
        message: PERSONALITY_META[key].gapMessage,
        severity: 'warning',
      })
    }
  }

  // Übergewicht: >= 60 % (erst ab kleiner Mindestgröße sinnvoll)
  if (assessed >= OVERWEIGHT_MIN_TEAM) {
    for (const key of PERSONALITY_KEYS) {
      if (counts[key] / assessed >= OVERWEIGHT_THRESHOLD) {
        findings.push({
          kind: 'overweight',
          type: key,
          message: PERSONALITY_META[key].overweightMessage,
          severity: 'warning',
        })
      }
    }
  }

  // Balance: alle vier Quadranten besetzt und kein Übergewicht
  if (findings.length === 0) {
    findings.push({
      kind: 'balanced',
      message: 'Gute Balance. Alle vier Typen sind vertreten – kein kritischer Blind Spot.',
      severity: 'good',
    })
  }

  return findings
}

// ---- Superpower-Aggregation ----

export type SuperpowerEntry = {
  power: string // Anzeige-Schreibweise (erstes Vorkommen)
  members: { id: string; name: string }[]
}

/** Gruppiert alle Superpowers case-insensitive und sortiert nach Häufigkeit. */
export function aggregateSuperpowers(members: InsightMember[]): SuperpowerEntry[] {
  const map = new Map<string, SuperpowerEntry>()
  for (const m of members) {
    for (const raw of m.superpowers) {
      const power = raw.trim()
      if (!power) continue
      const norm = power.toLowerCase()
      const existing = map.get(norm)
      if (existing) {
        if (!existing.members.some((x) => x.id === m.id)) {
          existing.members.push({ id: m.id, name: m.name })
        }
      } else {
        map.set(norm, { power, members: [{ id: m.id, name: m.name }] })
      }
    }
  }
  return [...map.values()].sort(
    (a, b) => b.members.length - a.members.length || a.power.localeCompare(b.power, 'de'),
  )
}
