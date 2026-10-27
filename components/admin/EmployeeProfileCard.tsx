import type { ReactNode } from 'react'

export type ProfileCardData = {
  name: string
  roleLabel: string
  status: 'active' | 'pending' | 'left'
  color: string // Stammstandort-Farbe (Banner/Balken), Fallback Indigo
  homeLocation: string | null
  email: string | null
  phone: string | null
  sinceLabel: string | null // z. B. "Nov 2025"
  tenureLabel: string | null // z. B. "8 Monate"
  weekHours: number
  weekMax: number | null
  monthHours: number
  monthMax: number | null
  monthLabel: string // z. B. "Oktober"
  vacationRemaining: number | null
  vacationEntitlement: number | null
  vacationPending: number
  weekBars: { label: string; hours: number; isToday: boolean }[]
  nextShifts: { dateLabel: string; time: string; location: string; hours: number }[]
}

// Fortschrittsbalken tragen Ampel-Bedeutung (grün/gelb/rot) oder sind neutral – die Standortfarbe bleibt Banner und Wochenbalken vorbehalten.
const NEUTRAL = '#4f46e5'

const STATUS = {
  active: { label: 'Aktiv', cls: 'bg-green-50 text-green-800', dot: 'bg-green-600' },
  pending: { label: 'Einladung offen', cls: 'bg-amber-50 text-amber-900', dot: 'bg-amber-600' },
  left: { label: 'Ausgeschieden', cls: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
} as const

const fmt = (h: number) =>
  h.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Ampel wie im Wochenplaner: < 80 % grün, 80–99 % gelb, ≥ 100 % rot. Farbe + Text, nie Farbe allein.
function usage(actual: number, max: number | null) {
  if (!max) return null
  const pct = (actual / max) * 100
  if (pct >= 100) return { cls: 'text-red-800', bar: '#dc2626', text: 'Limit erreicht' }
  if (pct >= 80) return { cls: 'text-amber-800', bar: '#d97706', text: 'fast am Limit' }
  return { cls: 'text-green-800', bar: '#16a34a', text: 'im Rahmen' }
}

function Tile({
  label,
  value,
  unit,
  hint,
  hintClass = 'text-gray-600',
  progress,
  barColor,
}: {
  label: string
  value: string
  unit?: string
  hint?: ReactNode
  hintClass?: string
  progress?: number | null
  barColor: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3.5">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 leading-none tabular-nums">
        {value}
        {unit && <span className="text-base font-medium text-gray-500 ml-1">{unit}</span>}
      </p>
      {progress != null && (
        <div className="mt-2.5 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%`, backgroundColor: barColor }}
          />
        </div>
      )}
      {hint && <p className={`mt-1.5 text-xs ${hintClass}`}>{hint}</p>}
    </div>
  )
}

export default function EmployeeProfileCard({
  data,
  actions,
}: {
  data: ProfileCardData
  actions?: ReactNode
}) {
  const st = STATUS[data.status]
  const color = data.color
  const weekUse = usage(data.weekHours, data.weekMax)
  const monthUse = usage(data.monthHours, data.monthMax)
  const maxBar = Math.max(8, ...data.weekBars.map((b) => b.hours))

  return (
    <section aria-label={`Mitarbeiterkarte ${data.name}`} className="space-y-4 max-w-5xl">
      {/* Kopf: Banner, Avatar, Name, Status */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div
          className="h-24 sm:h-28"
          style={{ background: `linear-gradient(120deg, ${color}45 0%, ${color}14 60%, ${color}08 100%)` }}
          aria-hidden="true"
        />
        <div className="px-5 sm:px-7 pb-5 -mt-10 sm:-mt-11 flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-white shadow-sm flex items-center justify-center text-2xl sm:text-3xl font-semibold text-gray-900"
            style={{ backgroundColor: `${color}30` }}
            aria-hidden="true"
          >
            {initials(data.name)}
          </div>

          <div className="flex-1 min-w-0 sm:pt-[3.25rem]">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{data.name}</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {data.roleLabel}
              {data.homeLocation && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                    {data.homeLocation}
                  </span>
                </>
              )}
            </p>
            {(data.email || data.phone) && (
              <p className="text-sm mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                {data.email && (
                  <a href={`mailto:${data.email}`} className="text-indigo-700 hover:underline">
                    {data.email}
                  </a>
                )}
                {data.phone && (
                  <a href={`tel:${data.phone.replace(/\s+/g, '')}`} className="text-indigo-700 hover:underline">
                    {data.phone}
                  </a>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:pt-[3.25rem] flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${st.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
              {st.label}
            </span>
            {actions}
          </div>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          label="Diese Woche"
          value={fmt(data.weekHours)}
          unit={data.weekMax ? `/ ${fmt(data.weekMax)} h` : 'h'}
          progress={data.weekMax ? data.weekHours / data.weekMax : null}
          hint={weekUse ? weekUse.text : 'geplant'}
          hintClass={weekUse?.cls}
          barColor={weekUse?.bar ?? NEUTRAL}
        />
        <Tile
          label={`Im ${data.monthLabel}`}
          value={fmt(data.monthHours)}
          unit={data.monthMax ? `/ ${fmt(data.monthMax)} h` : 'h'}
          progress={data.monthMax ? data.monthHours / data.monthMax : null}
          hint={monthUse ? monthUse.text : 'geplant'}
          hintClass={monthUse?.cls}
          barColor={monthUse?.bar ?? NEUTRAL}
        />
        <Tile
          label="Resturlaub"
          value={data.vacationRemaining != null ? fmt(data.vacationRemaining) : '–'}
          unit={data.vacationRemaining != null ? 'Tage' : undefined}
          progress={
            data.vacationEntitlement && data.vacationRemaining != null
              ? data.vacationRemaining / data.vacationEntitlement
              : null
          }
          hint={
            data.vacationPending > 0
              ? `${fmt(data.vacationPending)} Tage beantragt`
              : data.vacationEntitlement != null
                ? `von ${fmt(data.vacationEntitlement)} Tagen`
                : undefined
          }
          barColor={NEUTRAL}
        />
        <Tile
          label="Dabei seit"
          value={data.sinceLabel ?? '–'}
          hint={data.tenureLabel ?? undefined}
          barColor={NEUTRAL}
        />
      </div>

      {/* Woche + nächste Schichten */}
      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Geplant diese Woche</h2>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(data.weekHours)} h</span>
          </div>
          <div
            className="mt-4 grid grid-cols-7 gap-2"
            role="img"
            aria-label={`Geplante Stunden pro Wochentag: ${data.weekBars.map((b) => `${b.label} ${fmt(b.hours)} Stunden`).join(', ')}`}
          >
            {data.weekBars.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-gray-600 tabular-nums h-4">{b.hours > 0 ? fmt(b.hours) : ''}</span>
                <div className="relative w-full h-24 rounded-full bg-gray-100 overflow-hidden">
                  {b.hours > 0 && (
                    <div
                      className="absolute bottom-0 inset-x-0 rounded-full"
                      style={{
                        height: `${Math.max(14, (b.hours / maxBar) * 100)}%`,
                        backgroundColor: color,
                        opacity: b.isToday ? 1 : 0.7,
                      }}
                    />
                  )}
                </div>
                <span className={`text-xs ${b.isToday ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900">Nächste Schichten</h2>
          {data.nextShifts.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Keine kommenden Schichten geplant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {data.nextShifts.map((s, i) => (
                <li key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.dateLabel}</p>
                    <p className="text-xs text-gray-600 truncate">{s.location}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-900 tabular-nums">{s.time}</p>
                    <p className="text-xs text-gray-600 tabular-nums">{fmt(s.hours)} h</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
