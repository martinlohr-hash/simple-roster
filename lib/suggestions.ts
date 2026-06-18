import { computeCoverageWarnings, type CoverageRuleData } from './coverage'
import { timeToMinutes } from './timeUtils'

// Regelbasierte Dienstplan-Vorschläge — komplett ohne KI/Token.
// Idee: für jede Unterdeckung (Coverage-Lücke) den/die passendste/n
// Mitarbeiter:in vorschlagen, der/die noch Wochenkapazität frei hat,
// nicht im Urlaub ist und an dem Tag keinen Zeitkonflikt hat.

export type SuggestionShift = {
  id: string
  userId: string | null
  locationId: string
  date: string // ISO oder yyyy-MM-dd
  startTime: string
  endTime: string
  status: string
}

export type SuggestionUser = {
  id: string
  name: string
  maxHoursWeek: number | null
  primaryLocationId: string | null
  unavailableDays: number[] // Wochentage 0=Mo..6=So, an denen nie
  preferredDays: number[] // Wunschtage
  earliestStart: string | null // "HH:MM"
  latestEnd: string | null // "HH:MM"
}

export type SuggestionVacation = {
  userId: string
  startDate: string // ISO
  endDate: string // ISO
}

export type SuggestionLocation = { id: string; name: string; color: string }

export type Suggestion = {
  key: string
  kind: 'assign' | 'create'
  userId: string
  userName: string
  date: string // yyyy-MM-dd
  locationId: string
  locationName: string
  locationColor: string
  startTime: string
  endTime: string
  remainingHours: number | null // verbleibende Wochenstunden (null = kein Limit gesetzt)
  shiftHours: number // Dauer des vorgeschlagenen Einsatzes
  primaryMatch: boolean // Stammstandort passt
  preferredDay: boolean // an einem Wunschtag des MA
  trimmed: boolean // Zeitfenster des MA hat die Lücke verkürzt
  targetShiftId: string | null // bei kind === 'assign'
}

function hoursBetween(start: string, end: string): number {
  return (timeToMinutes(end) - timeToMinutes(start)) / 60
}

export function computeSuggestions(input: {
  shifts: SuggestionShift[]
  users: SuggestionUser[]
  vacations: SuggestionVacation[]
  coverageRules: CoverageRuleData[]
  locations: SuggestionLocation[]
  weekDates: string[] // 7 Einträge yyyy-MM-dd, Mo..So
}): Suggestion[] {
  const { shifts, users, vacations, coverageRules, locations, weekDates } = input
  if (coverageRules.length === 0) return []

  // Bereits verplante Stunden je MA in dieser Woche.
  const planned = new Map<string, number>()
  for (const s of shifts) {
    if (!s.userId || s.status === 'CANCELLED') continue
    planned.set(s.userId, (planned.get(s.userId) ?? 0) + hoursBetween(s.startTime, s.endTime))
  }

  const onVacation = (userId: string, day: string): boolean =>
    vacations.some(
      (v) => v.userId === userId && v.startDate.slice(0, 10) <= day && day <= v.endDate.slice(0, 10),
    )

  const hasConflict = (userId: string, day: string, from: string, to: string): boolean =>
    shifts.some(
      (s) =>
        s.userId === userId &&
        s.status !== 'CANCELLED' &&
        s.date.slice(0, 10) === day &&
        s.startTime < to &&
        s.endTime > from,
    )

  const suggestions: Suggestion[] = []

  weekDates.forEach((date, dayIndex) => {
    // dayIndex: 0=Mo..6=So, da weekDates von Mo..So aufgebaut ist.
    const dayShifts = shifts.filter((s) => s.date.slice(0, 10) === date)
    const warnings = computeCoverageWarnings(dayShifts, coverageRules, new Date(date + 'T12:00:00'))

    for (const w of warnings) {
      const ruleLoc = w.rule.locationId

      for (const gap of w.gaps) {
        const needed = w.rule.minStaff - gap.actual
        if (needed <= 0) continue

        const candidates = users
          .map((u) => {
            const used = planned.get(u.id) ?? 0
            const remaining = u.maxHoursWeek != null ? u.maxHoursWeek - used : null
            // Persönliches Zeitfenster auf die Lücke anwenden.
            const availFrom = u.earliestStart && u.earliestStart > gap.from ? u.earliestStart : gap.from
            const availTo = u.latestEnd && u.latestEnd < gap.to ? u.latestEnd : gap.to
            return { u, remaining, availFrom, availTo }
          })
          .filter(({ u, remaining, availFrom, availTo }) => {
            if (u.unavailableDays.includes(dayIndex)) return false // Ausschlusstag (hart)
            if (availFrom >= availTo) return false // Zeitfenster deckt die Lücke nicht ab
            if (remaining != null && remaining <= 0) return false // keine Kapazität
            if (onVacation(u.id, date)) return false
            if (hasConflict(u.id, date, availFrom, availTo)) return false
            return true
          })
          .sort((a, b) => {
            const aPref = a.u.preferredDays.includes(dayIndex) ? 1 : 0
            const bPref = b.u.preferredDays.includes(dayIndex) ? 1 : 0
            if (aPref !== bPref) return bPref - aPref // Wunschtag zuerst
            const aMatch = ruleLoc && a.u.primaryLocationId === ruleLoc ? 1 : 0
            const bMatch = ruleLoc && b.u.primaryLocationId === ruleLoc ? 1 : 0
            if (aMatch !== bMatch) return bMatch - aMatch // dann Stammstandort
            return (b.remaining ?? Infinity) - (a.remaining ?? Infinity) // dann meiste Restkapazität
          })

        // Offene (unbesetzte) Schicht, die wir besetzen könnten, statt neu anzulegen.
        const openShift = dayShifts.find(
          (s) =>
            s.userId === null &&
            s.status !== 'CANCELLED' &&
            (!ruleLoc || s.locationId === ruleLoc) &&
            s.startTime < gap.to &&
            s.endTime > gap.from,
        )

        const pickCount = Math.min(needed, candidates.length)
        for (let i = 0; i < pickCount; i++) {
          const { u, remaining, availFrom, availTo } = candidates[i]
          // Offene Schicht nur übernehmen, wenn sie ins Zeitfenster des MA passt.
          const fitsOpen =
            !!openShift &&
            (!u.earliestStart || openShift.startTime >= u.earliestStart) &&
            (!u.latestEnd || openShift.endTime <= u.latestEnd)
          const useOpen = i === 0 && fitsOpen ? openShift : undefined
          const startTime = useOpen ? useOpen.startTime : availFrom
          const endTime = useOpen ? useOpen.endTime : availTo
          const effLocId = useOpen ? useOpen.locationId : ruleLoc ?? locations[0]?.id
          if (!effLocId) continue
          const loc = locations.find((l) => l.id === effLocId)
          const shiftHours = hoursBetween(startTime, endTime)

          suggestions.push({
            key: `${date}-${effLocId}-${gap.from}-${u.id}`,
            kind: useOpen ? 'assign' : 'create',
            userId: u.id,
            userName: u.name,
            date,
            locationId: effLocId,
            locationName: loc?.name ?? '',
            locationColor: loc?.color ?? '#9CA3AF',
            startTime,
            endTime,
            remainingHours: remaining,
            shiftHours,
            primaryMatch: !!ruleLoc && u.primaryLocationId === ruleLoc,
            preferredDay: u.preferredDays.includes(dayIndex),
            trimmed: !useOpen && (startTime !== gap.from || endTime !== gap.to),
            targetShiftId: useOpen?.id ?? null,
          })

          // Vorschlag einrechnen, damit dieselbe Person/Kapazität nicht doppelt vorgeschlagen wird.
          planned.set(u.id, (planned.get(u.id) ?? 0) + shiftHours)
        }
      }
    }
  })

  return suggestions
}
