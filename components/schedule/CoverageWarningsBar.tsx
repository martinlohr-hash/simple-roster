'use client'

import { type CoverageWarning, formatCoverageWarning } from '@/lib/coverage'

type Props = {
  warnings: CoverageWarning[]
  hasRules: boolean
  hasShifts: boolean
}

export default function CoverageWarningsBar({ warnings, hasRules, hasShifts }: Props) {
  if (!hasRules || !hasShifts) return null

  if (warnings.length === 0) {
    return (
      <div className="px-1.5 pb-1">
        <div className="rounded px-1.5 py-1 text-[10px] leading-snug bg-green-50 text-green-700">
          ✌️ all good
        </div>
      </div>
    )
  }

  return (
    <div className="px-1.5 pb-1 space-y-0.5">
      {warnings.flatMap((w) =>
        w.gaps.map((g, gi) => {
          const isRed = g.actual === 0
          return (
            <div
              key={`${w.rule.id}-${gi}`}
              className={`rounded px-1.5 py-1 text-[10px] leading-snug ${
                isRed
                  ? 'bg-red-50 text-red-700'
                  : 'bg-orange-50 text-orange-700'
              }`}
            >
              <span className="mr-0.5">{isRed ? '⚠' : '!'}</span>
              {w.rule.label && (
                <span className="font-semibold">{w.rule.label}: </span>
              )}
              {formatCoverageWarning(w.rule, g)}
            </div>
          )
        }),
      )}
    </div>
  )
}
