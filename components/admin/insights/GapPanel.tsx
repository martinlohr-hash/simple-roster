import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react'
import {
  PERSONALITY_KEYS,
  PERSONALITY_META,
  analyzeGaps,
  type TeamComposition,
} from '@/lib/insights'

const SEVERITY_STYLE = {
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-800', Icon: IconAlertTriangle },
  good: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: IconCircleCheck },
  info: { box: 'bg-gray-50 border-gray-200 text-gray-600', Icon: IconInfoCircle },
} as const

export default function GapPanel({ comp }: { comp: TeamComposition }) {
  const findings = analyzeGaps(comp)

  return (
    <div>
      {/* Quadranten-Zähler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {PERSONALITY_KEYS.map((key) => {
          const m = PERSONALITY_META[key]
          const count = comp.counts[key]
          const pct = comp.assessed > 0 ? Math.round((count / comp.assessed) * 100) : 0
          return (
            <div key={key} className="rounded-xl border border-gray-100 p-3" style={{ backgroundColor: `${m.color}0a` }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-medium text-gray-600">{m.label}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-gray-900">{count}</span>
                {comp.assessed > 0 && <span className="text-[11px] text-gray-400">{pct}%</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {findings.map((f, i) => {
          const s = SEVERITY_STYLE[f.severity]
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${s.box}`}
            >
              <s.Icon size={17} className="shrink-0 mt-0.5" stroke={1.9} />
              <span>{f.message}</span>
            </div>
          )
        })}
      </div>

      {(comp.unknown > 0 || comp.unassessed > 0) && (
        <p className="mt-3 text-xs text-gray-400">
          {comp.unassessed > 0 && `${comp.unassessed} noch nicht eingeschätzt`}
          {comp.unassessed > 0 && comp.unknown > 0 && ' · '}
          {comp.unknown > 0 && `${comp.unknown} bewusst als „unbekannt" markiert`}
        </p>
      )}
    </div>
  )
}
