export type CoverageRuleData = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  minStaff: number
  locationId: string | null
  label: string | null
}

export type CoverageGap = {
  from: string
  to: string
  actual: number
}

export type CoverageWarning = {
  rule: CoverageRuleData
  gaps: CoverageGap[]
}

type ShiftLike = {
  locationId: string
  startTime: string
  endTime: string
  status: string
}

export function computeCoverageWarnings(
  shifts: ShiftLike[],
  rules: CoverageRuleData[],
  date: Date,
): CoverageWarning[] {
  // dayOfWeek: 0=Mo...6=So — same convention as the rest of the app
  const dow = (date.getDay() + 6) % 7

  const dayRules = rules.filter((r) => r.dayOfWeek === dow)
  if (dayRules.length === 0) return []

  const activeShifts = shifts.filter((s) => s.status !== 'CANCELLED')

  return dayRules.flatMap((rule) => {
    const relevant = activeShifts.filter((s) => {
      if (rule.locationId && s.locationId !== rule.locationId) return false
      return s.startTime < rule.endTime && s.endTime > rule.startTime
    })

    const gaps = findGaps(relevant, rule.startTime, rule.endTime, rule.minStaff)
    if (gaps.length === 0) return []
    return [{ rule, gaps }]
  })
}

function findGaps(
  shifts: ShiftLike[],
  ruleStart: string,
  ruleEnd: string,
  minStaff: number,
): CoverageGap[] {
  type Event = { time: string; delta: number }
  const events: Event[] = []

  for (const s of shifts) {
    const effStart = s.startTime > ruleStart ? s.startTime : ruleStart
    const effEnd = s.endTime < ruleEnd ? s.endTime : ruleEnd
    if (effStart >= effEnd) continue
    events.push({ time: effStart, delta: +1 })
    events.push({ time: effEnd, delta: -1 })
  }

  events.sort((a, b) => a.time.localeCompare(b.time))

  const gaps: CoverageGap[] = []
  let current = ruleStart
  let count = 0

  for (const ev of events) {
    if (ev.time > current && count < minStaff) {
      gaps.push({ from: current, to: ev.time, actual: count })
    }
    if (ev.time > current) current = ev.time
    count += ev.delta
  }

  if (current < ruleEnd && count < minStaff) {
    gaps.push({ from: current, to: ruleEnd, actual: count })
  }

  return gaps
}

export function formatCoverageWarning(rule: CoverageRuleData, gap: CoverageGap): string {
  if (rule.minStaff === 1 && gap.actual === 0) {
    return `Fehlende Einteilung zw. ${gap.from}–${gap.to} Uhr`
  }
  return `Nur ${gap.actual}/${rule.minStaff} Personen zw. ${gap.from}–${gap.to} Uhr`
}
