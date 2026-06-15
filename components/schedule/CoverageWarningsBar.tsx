'use client'

import { type CoverageWarning, type CoverageRuleData, formatCoverageWarning } from '@/lib/coverage'

type LocationLike = { id: string; name: string; color: string }

type Props = {
  warnings: CoverageWarning[]
  dayRules: CoverageRuleData[]
  locations: LocationLike[]
  hasShifts: boolean
}

export default function CoverageWarningsBar({ warnings, dayRules, locations, hasShifts }: Props) {
  if (dayRules.length === 0 || !hasShifts) return null

  const locationIds = Array.from(new Set(dayRules.map((r) => r.locationId ?? '__global')))

  return (
    <div className="px-1.5 pb-1 space-y-0.5">
      {locationIds.map((locId) => {
        const location = locations.find((l) => l.id === locId)
        const locWarnings = warnings.filter((w) => (w.rule.locationId ?? '__global') === locId)

        if (locWarnings.length === 0) {
          return (
            <div key={locId} className="rounded px-1.5 py-1 text-[10px] leading-snug bg-green-50 text-green-700 flex items-center gap-1">
              {location && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: location.color }} />
              )}
              <span>✌️ {location ? location.name : 'all good'}</span>
            </div>
          )
        }

        return locWarnings.flatMap((w, wi) =>
          w.gaps.map((g, gi) => {
            const isRed = g.actual === 0
            return (
              <div
                key={`${locId}-${wi}-${gi}`}
                className={`rounded px-1.5 py-1 text-[10px] leading-snug flex items-center gap-1 ${
                  isRed ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                }`}
              >
                {location && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: location.color }} />
                )}
                {formatCoverageWarning(w.rule, g)}
              </div>
            )
          })
        )
      })}
    </div>
  )
}
